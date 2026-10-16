/**
 * SERVER-ONLY real-money / testnet executor for Binance Spot.
 *
 * Safety design:
 *  - Every entry is followed by an exchange-side OCO (take-profit + stop-loss). If the OCO cannot be placed
 *    the position is flattened at market immediately and trading halts.
 *  - The intent is written to disk BEFORE the market order is sent, so a crash cannot leave an untracked position.
 *  - Hard caps: per-trade size, daily loss, consecutive losses. Any breach halts new entries.
 *  - Spot is long-only: SELL signals are never traded here.
 */
import fs from 'fs';
import path from 'path';
import { BinanceSpot, BinanceError, ceilToStep, floorToStep, fmt } from './binance-spot';
import { ClosedPaperTrade, DailyCounts, OpenResult, PaperBrokerState, PaperPosition, TradeTier, normalizeSymbol, parseRatio } from '../types/paper';

export type HaltKind = 'DAILY_LOSS' | 'STREAK' | 'MANUAL' | 'ERROR';

export interface LivePosition extends PaperPosition {
  listClientOrderId: string;
  baseAsset: string;
  quoteAsset: string;
  entryQuote: number; // quote asset actually spent
  entryFeeExtra: number; // entry fee NOT already embedded in the received quantity
}

interface Pending { clientOrderId: string; symbol: string; sizeUsd: number; ratio: string; riskPct: number; tier?: TradeTier; maxHoldMs?: number; at: number }

interface LiveFile {
  activePosition: LivePosition | null;
  pending: Pending | null;
  trades: ClosedPaperTrade[];
  halt: { on: boolean; kind?: HaltKind; reason?: string; dayStart?: number; at?: number };
}

export interface LiveConfig {
  maxTradeUsd: number;
  maxDailyLossUsd: number;
  maxConsecLosses: number;
  feeRate: number;
  stopLimitBuffer: number; // stop-limit price sits this fraction below the trigger so the stop actually fills
}

const DEFAULTS: LiveConfig = { maxTradeUsd: 25, maxDailyLossUsd: 20, maxConsecLosses: 5, feeRate: 0.001, stopLimitBuffer: 0.002 };

const startOfDay = (now = Date.now()) => { const d = new Date(now); d.setHours(0, 0, 0, 0); return d.getTime(); };

export class LiveExecutor {
  private file: LiveFile;
  private path: string;
  private chain: Promise<unknown> = Promise.resolve();
  private initDone = false;
  private balanceCache: { at: number; value: number } | null = null;
  readonly cfg: LiveConfig;

  constructor(private api: BinanceSpot, cfg: Partial<LiveConfig> = {}, dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data')) {
    this.cfg = { ...DEFAULTS, ...cfg };
    this.path = path.join(dataDir, `live-state-${api.env}.json`);
    this.file = this.load();
  }

  // ------------------------------------------------------------------ persistence
  private load(): LiveFile {
    try {
      if (fs.existsSync(this.path)) {
        const p = JSON.parse(fs.readFileSync(this.path, 'utf-8'));
        return { activePosition: p.activePosition ?? null, pending: p.pending ?? null, trades: Array.isArray(p.trades) ? p.trades : [], halt: p.halt ?? { on: false } };
      }
    } catch (e) {
      const backup = `${this.path}.corrupt-${Date.now()}`;
      try { fs.renameSync(this.path, backup); } catch { /* ignore */ }
      console.error(`[Live] State unreadable (${(e as Error).message}); moved to ${backup}. HALTING until you review the exchange manually.`);
      return { activePosition: null, pending: null, trades: [], halt: { on: true, kind: 'ERROR', reason: 'State file was unreadable; verify open orders on the exchange, then resume.', at: Date.now() } };
    }
    return { activePosition: null, pending: null, trades: [], halt: { on: false } };
  }

  private save() {
    fs.mkdirSync(path.dirname(this.path), { recursive: true });
    const tmp = `${this.path}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.file, null, 2));
    fs.renameSync(tmp, this.path);
  }

  /** Serialises every operation that touches the exchange or the state file. */
  private locked<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.chain.then(fn, fn);
    this.chain = run.catch(() => undefined);
    return run;
  }

  // ------------------------------------------------------------------ halting
  private halt(kind: HaltKind, reason: string) {
    this.file.halt = { on: true, kind, reason, dayStart: startOfDay(), at: Date.now() };
    this.save();
    console.error(`[Live] HALTED (${kind}): ${reason}`);
  }

  isHalted(): { on: boolean; kind?: HaltKind; reason?: string } {
    const h = this.file.halt;
    if (h.on && h.kind === 'DAILY_LOSS' && h.dayStart !== startOfDay()) { this.file.halt = { on: false }; this.save(); }
    return this.file.halt;
  }

  haltManual(reason = 'Halted by operator') { this.halt('MANUAL', reason); }
  resume() { this.file.halt = { on: false }; this.save(); }

  // ------------------------------------------------------------------ helpers
  private todaysPnl(now = Date.now()) {
    const ds = startOfDay(now);
    return this.file.trades.filter((t) => Date.parse(t.exitTime) >= ds).reduce((s, t) => s + t.netPnl, 0);
  }

  private consecLosses() {
    let n = 0;
    for (const t of this.file.trades) { if (t.netPnl < 0) n++; else break; }
    return n;
  }

  dailyCounts(now = Date.now()): DailyCounts {
    const dayStart = startOfDay(now);
    const all = [...(this.file.activePosition ? [this.file.activePosition] : []), ...this.file.trades];
    const c: DailyCounts = { total: 0, SMALL: 0, MEDIUM: 0, BIG: 0, dayStart, lastEntryMs: null };
    for (const t of all) {
      if (!t.tier) continue;
      const at = Date.parse(t.entryTime);
      if (at < dayStart) continue;
      c.total++; c[t.tier]++;
      if (c.lastEntryMs === null || at > c.lastEntryMs) c.lastEntryMs = at;
    }
    return c;
  }

  private feeInQuote(fills: any[], quote: string, base: string, notional: number): { quoteFee: number; baseFee: number } {
    let quoteFee = 0, baseFee = 0, otherAsset = false;
    for (const f of fills || []) {
      const c = parseFloat(f.commission);
      if (f.commissionAsset === quote) quoteFee += c;
      else if (f.commissionAsset === base) baseFee += c;
      else otherAsset = true; // e.g. BNB discount: paid from the BNB balance
    }
    if (otherAsset) quoteFee += notional * 0.00075; // estimate of the BNB-paid fee, in quote terms
    if (!fills || fills.length === 0) quoteFee = notional * this.cfg.feeRate;
    return { quoteFee, baseFee };
  }

  private async ensureInit() {
    if (this.initDone) return;
    this.initDone = true;
    await this.api.syncTime().catch(() => undefined);
    if (this.api.env === 'live') await this.checkKeyPermissions();
    if (this.file.pending) await this.recoverPending().catch((e) => this.halt('ERROR', `Recovery failed: ${e.message}`));
  }

  /** Real money only: refuse to trade with a key that could be used to steal funds. */
  private async checkKeyPermissions() {
    try {
      const r = await this.api.apiRestrictions();
      const problems: string[] = [];
      if (r.enableWithdrawals) problems.push('withdrawals are ENABLED on this API key (turn it off)');
      if (!r.ipRestrict) problems.push('the key is not restricted to your server IP (add the IP whitelist)');
      if (!r.enableSpotAndMarginTrading) problems.push('Spot trading is not enabled on this key');
      if (problems.length) this.halt('ERROR', `Unsafe API key: ${problems.join('; ')}.`);
    } catch (e) {
      this.halt('ERROR', `Could not verify API key permissions (${(e as Error).message}); refusing to trade real money.`);
    }
  }

  /** Called once after a crash that happened between "intent written" and "position recorded". */
  private async recoverPending() {
    const p = this.file.pending!;
    let order: any;
    try { order = await this.api.getOrderByClientId(p.symbol, p.clientOrderId); }
    catch (e) {
      if (e instanceof BinanceError && e.code === -2013) { this.file.pending = null; this.save(); return; } // never reached the exchange
      throw e;
    }
    if (parseFloat(order.executedQty) > 0) {
      console.warn(`[Live] Recovering unprotected fill for ${p.clientOrderId}`);
      await this.protect(p, order, undefined);
    } else {
      this.file.pending = null; this.save();
    }
  }

  // ------------------------------------------------------------------ public API
  async getState(): Promise<PaperBrokerState & { halted: ReturnType<LiveExecutor['isHalted']>; todayPnl: number; env: string }> {
    let balance = this.balanceCache?.value ?? 0;
    if (!this.balanceCache || Date.now() - this.balanceCache.at > 5000) {
      try { balance = await this.api.free('USDT'); this.balanceCache = { at: Date.now(), value: balance }; } catch { /* keep last */ }
    }
    return { balance, activePosition: this.file.activePosition, trades: this.file.trades.slice(0, 500), halted: this.isHalted(), todayPnl: this.todaysPnl(), env: this.api.env };
  }

  async check() {
    await this.api.syncTime();
    const acct = await this.api.getAccount();
    const usdt = acct.balances.find((b) => b.asset === 'USDT');
    return { ok: acct.canTrade, canTrade: acct.canTrade, usdtFree: usdt?.free ?? 0, usdtLocked: usdt?.locked ?? 0 };
  }

  open(p: { symbol: string; side: string; tradeCapital: number; ratio?: string; riskPct?: number; tier?: TradeTier; maxHoldMs?: number }): Promise<OpenResult> {
    return this.locked(async () => {
      await this.ensureInit();
      if (String(p.side).toUpperCase() !== 'BUY') return { success: false, reason: 'SPOT_LONG_ONLY' };
      const h = this.isHalted();
      if (h.on) return { success: false, reason: `HALTED: ${h.reason}` };
      if (this.file.activePosition || this.file.pending) return { success: false, reason: 'POSITION_ALREADY_OPEN' };
      const sizeUsd = Math.min(p.tradeCapital, this.cfg.maxTradeUsd);
      if (!(sizeUsd > 0)) return { success: false, reason: 'INVALID_TRADE_CAPITAL' };
      if (this.todaysPnl() <= -this.cfg.maxDailyLossUsd) { this.halt('DAILY_LOSS', `Daily loss limit $${this.cfg.maxDailyLossUsd} reached`); return { success: false, reason: 'DAILY_LOSS_LIMIT' }; }

      const symbol = normalizeSymbol(p.symbol);
      try {
        const rules = await this.api.getRules(symbol);
        if (rules.quoteAsset !== 'USDT') return { success: false, reason: 'ONLY_USDT_PAIRS' };
        if (sizeUsd < rules.minNotional * 1.05) return { success: false, reason: `BELOW_MIN_NOTIONAL (${rules.minNotional})` };
        const free = await this.api.free(rules.quoteAsset);
        if (free < sizeUsd * 1.01) return { success: false, reason: `INSUFFICIENT_BALANCE (free ${free.toFixed(2)} USDT)` };

        const ratio = p.ratio || '1:2';
        const riskPct = p.riskPct && p.riskPct > 0 && p.riskPct <= 0.1 ? p.riskPct : 0.01;
        const clientOrderId = `ORN${Date.now()}`;
        this.file.pending = { clientOrderId, symbol, sizeUsd, ratio, riskPct, tier: p.tier, maxHoldMs: p.maxHoldMs, at: Date.now() };
        this.save(); // intent is durable BEFORE any money moves

        // Buy by quantity, sized so that AFTER a base-asset fee the sellable amount is still a whole lot step
        // (otherwise every trade strands up to one step of dust, which is ~$0.50 on BTCUSDT).
        const ref = await this.api.price(symbol);
        const fee = this.cfg.feeRate;
        const target = floorToStep((sizeUsd * (1 - fee)) / ref, rules.stepSize);
        if (target < rules.minQty || target * ref < rules.minNotional) { this.file.pending = null; this.save(); return { success: false, reason: 'BELOW_MIN_NOTIONAL_OR_QTY' }; }
        const buyQty = ceilToStep(target / (1 - fee), rules.stepSize);

        let order: any;
        try { order = await this.api.marketBuyQty(symbol, fmt(buyQty, rules.stepSize), clientOrderId); }
        catch (e) {
          // Network timeouts are ambiguous: the order may have been accepted. Ask the exchange before deciding.
          try { order = await this.api.getOrderByClientId(symbol, clientOrderId); } catch { order = null; }
          if (!order || !(parseFloat(order.executedQty) > 0)) {
            this.file.pending = null; this.save();
            return { success: false, reason: `ORDER_REJECTED: ${(e as Error).message}` };
          }
        }
        if (!(parseFloat(order.executedQty) > 0)) { this.file.pending = null; this.save(); return { success: false, reason: 'NOT_FILLED' }; }
        const pos = await this.protect(this.file.pending!, order, rules);
        this.balanceCache = null;
        return pos ? { success: true, position: pos } : { success: false, reason: 'ENTRY_FLATTENED_NO_PROTECTION' };
      } catch (e) {
        const msg = (e as Error).message;
        if (this.file.pending && !this.file.activePosition) { /* leave pending so recovery can inspect it */ this.halt('ERROR', `Entry error: ${msg}`); }
        return { success: false, reason: msg };
      }
    });
  }

  /** Given a filled entry order, place the exchange-side OCO. On failure flatten and halt. */
  private async protect(p: Pending, order: any, rulesIn?: Awaited<ReturnType<BinanceSpot['getRules']>>): Promise<LivePosition | null> {
    const rules = rulesIn ?? (await this.api.getRules(p.symbol));
    const execQty = parseFloat(order.executedQty);
    const quoteSpent = parseFloat(order.cummulativeQuoteQty);
    const avg = quoteSpent / execQty;
    const { quoteFee, baseFee } = this.feeInQuote(order.fills ?? [], rules.quoteAsset, rules.baseAsset, quoteSpent);
    const sellQty = floorToStep(execQty - baseFee, rules.stepSize);
    const { riskMul, rewardMul } = parseRatio(p.ratio);
    const rewardPct = p.riskPct * (rewardMul / riskMul);

    const stopTrigger = floorToStep(avg * (1 - p.riskPct), rules.tickSize);
    const stopLimit = floorToStep(stopTrigger * (1 - this.cfg.stopLimitBuffer), rules.tickSize);
    const tp = floorToStep(avg * (1 + rewardPct), rules.tickSize);
    const listClientOrderId = `${p.clientOrderId}OCO`;

    const pos: LivePosition = {
      id: p.clientOrderId, symbol: p.symbol, side: 'BUY', entryPrice: Number(avg.toFixed(8)), quantity: sellQty,
      tradeCapital: quoteSpent, entryFee: quoteFee + baseFee * avg, stopLoss: stopTrigger, takeProfit: tp, ratio: p.ratio,
      entryTime: new Date(order.transactTime ?? Date.now()).toISOString(),
      ...(p.tier ? { tier: p.tier } : {}), ...(p.maxHoldMs ? { maxHoldMs: p.maxHoldMs } : {}),
      listClientOrderId, baseAsset: rules.baseAsset, quoteAsset: rules.quoteAsset, entryQuote: quoteSpent, entryFeeExtra: quoteFee,
    };

    if (sellQty < rules.minQty || sellQty * tp < rules.minNotional) {
      await this.emergencyFlatten(pos, sellQty, rules, 'Position too small to protect with OCO');
      return null;
    }
    try {
      await this.api.placeOco({ symbol: p.symbol, qty: fmt(sellQty, rules.stepSize), tp: fmt(tp, rules.tickSize), stopTrigger: fmt(stopTrigger, rules.tickSize), stopLimit: fmt(stopLimit, rules.tickSize), listClientOrderId });
    } catch (e) {
      await this.emergencyFlatten(pos, sellQty, rules, `OCO rejected: ${(e as Error).message}`);
      return null;
    }
    this.file.activePosition = pos;
    this.file.pending = null;
    this.save();
    return pos;
  }

  private async emergencyFlatten(pos: LivePosition, qty: number, rules: Awaited<ReturnType<BinanceSpot['getRules']>>, why: string) {
    try {
      const sell = await this.api.marketSellQty(pos.symbol, fmt(qty, rules.stepSize), `${pos.id}FLAT`);
      this.recordClose(pos, sell, 'EMERGENCY_FLATTEN');
    } catch (e) {
      // Worst case: we hold an unprotected position and could not sell. Keep it on record so it is visible.
      this.file.activePosition = pos;
      this.file.pending = null;
      this.save();
      this.halt('ERROR', `${why}; ALSO failed to flatten: ${(e as Error).message}. CLOSE ${pos.symbol} MANUALLY ON BINANCE.`);
      return;
    }
    this.file.pending = null;
    this.halt('ERROR', `${why}. Position was flattened at market.`);
  }

  private recordClose(pos: LivePosition, sellOrder: any, reason: string): ClosedPaperTrade {
    const exitQty = parseFloat(sellOrder.executedQty);
    const exitQuote = parseFloat(sellOrder.cummulativeQuoteQty);
    const exitPrice = exitQty > 0 ? exitQuote / exitQty : pos.entryPrice;
    const { quoteFee } = this.feeInQuote(sellOrder.fills ?? [], pos.quoteAsset, pos.baseAsset, exitQuote);
    const exitFee = sellOrder.fills ? quoteFee : exitQuote * this.cfg.feeRate;
    const netPnl = exitQuote - pos.entryQuote - pos.entryFeeExtra - exitFee;
    const closed: ClosedPaperTrade = {
      ...pos, exitPrice: Number(exitPrice.toFixed(8)), exitTime: new Date().toISOString(), exitReason: reason,
      netPnl: Number(netPnl.toFixed(4)), newBalance: this.balanceCache?.value ?? 0,
    };
    this.file.trades.unshift(closed);
    if (this.file.trades.length > 5000) this.file.trades.length = 5000;
    this.file.activePosition = null;
    this.save();
    this.balanceCache = null;

    if (this.todaysPnl() <= -this.cfg.maxDailyLossUsd) this.halt('DAILY_LOSS', `Daily loss limit $${this.cfg.maxDailyLossUsd} reached`);
    else if (this.consecLosses() >= this.cfg.maxConsecLosses) this.halt('STREAK', `${this.cfg.maxConsecLosses} losing trades in a row; review the strategy before resuming`);
    return closed;
  }

  /** Reconciles the local position with the exchange. Safe to call often; exits are exchange-side anyway. */
  monitor(timeStop = true): Promise<ClosedPaperTrade | null> {
    return this.locked(async () => {
      await this.ensureInit();
      const pos = this.file.activePosition;
      if (!pos) return null;
      try {
        const list = await this.api.getOrderList(pos.listClientOrderId);
        if (list.listOrderStatus === 'ALL_DONE') {
          const legs = await Promise.all((list.orders as any[]).map((o) => this.api.getOrder(pos.symbol, o.orderId)));
          const filled = legs.find((o) => o.status === 'FILLED') ?? legs.find((o) => parseFloat(o.executedQty) > 0);
          if (filled) return this.recordClose(pos, filled, filled.type === 'LIMIT_MAKER' ? 'TAKE_PROFIT' : 'STOP_LOSS');
          // OCO ended with nothing filled (cancelled by hand?). The coins are unprotected: sell them.
          const rules = await this.api.getRules(pos.symbol);
          const sell = await this.api.marketSellQty(pos.symbol, fmt(pos.quantity, rules.stepSize), `${pos.id}X${Date.now() % 100000}`);
          const closed = this.recordClose(pos, sell, 'OCO_CANCELLED_FLATTENED');
          this.halt('ERROR', 'The protective OCO order disappeared (cancelled?). Position was flattened.');
          return closed;
        }
        if (timeStop && pos.maxHoldMs && Date.now() - Date.parse(pos.entryTime) >= pos.maxHoldMs) return await this.closeNow(pos, 'TIME_STOP');
      } catch (e) {
        console.error('[Live] monitor error:', (e as Error).message);
      }
      return null;
    });
  }

  private async closeNow(pos: LivePosition, reason: string): Promise<ClosedPaperTrade> {
    const rules = await this.api.getRules(pos.symbol);
    try { await this.api.cancelOrderList(pos.symbol, pos.listClientOrderId); }
    catch (e) {
      // If the OCO already executed, the cancel fails: report that fill instead of selling twice.
      const list = await this.api.getOrderList(pos.listClientOrderId).catch(() => null);
      if (list?.listOrderStatus === 'ALL_DONE') {
        const legs = await Promise.all((list.orders as any[]).map((o) => this.api.getOrder(pos.symbol, o.orderId)));
        const filled = legs.find((o) => o.status === 'FILLED');
        if (filled) return this.recordClose(pos, filled, filled.type === 'LIMIT_MAKER' ? 'TAKE_PROFIT' : 'STOP_LOSS');
      }
      throw e;
    }
    const sell = await this.api.marketSellQty(pos.symbol, fmt(pos.quantity, rules.stepSize), `${pos.id}C${Date.now() % 100000}`);
    return this.recordClose(pos, sell, reason);
  }

  /** Manual "close now" and the kill switch's flatten step. */
  flatten(halt = false): Promise<ClosedPaperTrade | null> {
    return this.locked(async () => {
      await this.ensureInit();
      if (halt) this.halt('MANUAL', 'Kill switch used');
      const pos = this.file.activePosition;
      if (!pos) return null;
      return this.closeNow(pos, 'MANUAL_CLOSE');
    });
  }
}
