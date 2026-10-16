/** SERVER-ONLY 24/7 observer. The browser controls it through observer-client.ts. */
import { Execution } from './execution';
import { sendTradeExecutionAlert, sendTradeCloseAlert } from './telegram-notifier';
import { ObserverLog, TradeTier, normalizeSymbol, parseRatio } from '../types/paper';

export type { ObserverLog };

export interface ObserverConfig {
  symbol?: string;
  timeframe?: string; // '1' | '3' | '5' | '15' | '60' (minutes)
  tradeCapital?: number;
  ratio?: string;
  telegramChatId?: string;
  telegramBotToken?: string;
  pollIntervalMs?: number;
}

const INTERVAL_MAP: Record<string, string> = {
  '1': '1m', '3': '3m', '5': '5m', '15': '15m', '30': '30m', '60': '1h', '120': '2h', '240': '4h',
  '1m': '1m', '3m': '3m', '5m': '5m', '15m': '15m', '30m': '30m', '1h': '1h', '2h': '2h', '4h': '4h',
};

interface Candle4 { open: number; high: number; low: number; close: number }

// ---------------------------------------------------------------------------
// Daily plan: up to N trades/day in three size tiers, each trade hard-capped at $100.
// ---------------------------------------------------------------------------
export const MAX_TRADE_USD = 100; // absolute ceiling per trade, whatever the settings say

export interface DailyPlan {
  enabled: boolean;
  quotas: Record<TradeTier, number>;
  sizes: Record<TradeTier, number>;
  maxPerDay: number;
  riskPct: number; // stop distance (fraction)
  rewardMul: number; // take-profit = riskPct * rewardMul
  maxHoldMin: number; // time stop
  minGapMin: number; // minimum spacing between entries, so 50 trades are spread over the day
}

const envNum = (k: string, d: number, min: number, max: number) => {
  const v = parseFloat(process.env[k] ?? '');
  return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d;
};

export function loadPlanFromEnv(): DailyPlan {
  const quotas = {
    SMALL: Math.round(envNum('PLAN_SMALL_COUNT', 20, 0, 500)),
    MEDIUM: Math.round(envNum('PLAN_MEDIUM_COUNT', 20, 0, 500)),
    BIG: Math.round(envNum('PLAN_BIG_COUNT', 10, 0, 500)),
  };
  return {
    enabled: (process.env.DAILY_PLAN || 'on').toLowerCase() !== 'off',
    quotas,
    sizes: {
      SMALL: envNum('PLAN_SMALL_USD', 10, 1, MAX_TRADE_USD),
      MEDIUM: envNum('PLAN_MEDIUM_USD', 40, 1, MAX_TRADE_USD),
      BIG: envNum('PLAN_BIG_USD', 100, 1, MAX_TRADE_USD),
    },
    maxPerDay: quotas.SMALL + quotas.MEDIUM + quotas.BIG,
    riskPct: envNum('PLAN_RISK_PCT', 0.5, 0.1, 5) / 100,
    rewardMul: envNum('PLAN_REWARD_MULT', 2, 1, 5),
    maxHoldMin: envNum('PLAN_MAX_HOLD_MIN', 20, 1, 1440),
    minGapMin: envNum('PLAN_MIN_GAP_MIN', 10, 0, 240),
  };
}

/** 0..1 conviction of a breakout: strong previous candle body + decisive break beyond its extreme. */
export function breakoutScore(prev: Candle4, price: number, side: 'BUY' | 'SELL'): number {
  const range = prev.high - prev.low;
  if (!(range > 0)) return 0;
  const body = Math.abs(prev.close - prev.open) / range;
  const ext = Math.max(0, side === 'BUY' ? price - prev.high : prev.low - price) / range;
  return Math.min(1, body + 0.5 * ext);
}

export const tierForScore = (score: number): TradeTier => (score >= 0.7 ? 'BIG' : score >= 0.45 ? 'MEDIUM' : 'SMALL');


export class TradingViewObserver {
  public symbol: string;
  public timeframe: string;
  public tradeCapital: number;
  public ratio: string;
  public telegramChatId?: string;
  public telegramBotToken?: string;
  public isRunning = false;
  public lastPrice = 0;

  private pollIntervalMs: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private busy = false; // prevents overlapping ticks when a request is slow
  private consecutiveErrors = 0;
  private previousCandle: Candle4 | null = null;
  private logs: ObserverLog[] = [];
  public plan: DailyPlan = loadPlanFromEnv();
  private planDoneDay = 0;
  private shortNoted = false;

  constructor(options: ObserverConfig = {}) {
    this.symbol = options.symbol || 'BINANCE:BTCUSDT';
    this.timeframe = options.timeframe || '1';
    this.tradeCapital = options.tradeCapital || 2.0;
    this.ratio = options.ratio || '1:2';
    this.telegramChatId = options.telegramChatId;
    this.telegramBotToken = options.telegramBotToken;
    this.pollIntervalMs = options.pollIntervalMs || 2500;
  }

  public updateConfig(c: Partial<ObserverConfig>) {
    if (c.symbol && c.symbol !== this.symbol) {
      this.symbol = c.symbol;
      this.previousCandle = null;
      this.lastPrice = 0;
    }
    if (c.timeframe) this.timeframe = c.timeframe;
    if (c.tradeCapital && Number.isFinite(c.tradeCapital) && c.tradeCapital > 0) this.tradeCapital = c.tradeCapital;
    if (c.ratio) this.ratio = c.ratio;
    if (c.telegramChatId !== undefined) this.telegramChatId = c.telegramChatId;
    if (c.telegramBotToken !== undefined) this.telegramBotToken = c.telegramBotToken;
  }

  public async getPlanStatus() {
    const counts = await Execution.dailyCounts();
    return { ...this.plan, counts };
  }

  public getLogs(): ObserverLog[] {
    return [...this.logs];
  }

  private addLog(type: ObserverLog['type'], message: string, price?: number) {
    this.logs.unshift({ id: `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, time: Date.now(), type, message, price });
    if (this.logs.length > 200) this.logs.pop();
  }

  /** Logs + Telegram for a closed trade, whoever noticed the close (tick or background reconciler). */
  public reportClose(closed: { exitReason: string; exitPrice: number; netPnl: number; symbol: string; side: string; newBalance: number; id: string }, price?: number) {
    this.addLog('EXIT', `[CLOSED] ${closed.exitReason} at $${closed.exitPrice} | Net PnL: ${closed.netPnl >= 0 ? '+' : ''}$${closed.netPnl.toFixed(4)}`, price ?? closed.exitPrice);
    if (this.telegramChatId) {
      void sendTradeCloseAlert(
        this.telegramChatId,
        { symbol: closed.symbol, side: closed.side, exitPrice: closed.exitPrice, exitReason: closed.exitReason, netPnl: closed.netPnl, newBalance: closed.newBalance, clientOrderId: closed.id },
        this.telegramBotToken
      );
    }
  }

  private async fetchLiveQuotes(): Promise<{ price: number; previous: Candle4 } | null> {
    const cleanSymbol = normalizeSymbol(this.symbol);
    const interval = INTERVAL_MAP[this.timeframe] || '1m';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      // data-api.binance.vision is Binance's public market-data mirror (works where api.binance.com is geo-blocked).
      const res = await fetch(`https://data-api.binance.vision/api/v3/klines?symbol=${cleanSymbol}&interval=${interval}&limit=3`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Binance HTTP ${res.status} for ${cleanSymbol}`);
      const raw = await res.json();
      if (!Array.isArray(raw) || raw.length < 2) throw new Error('Unexpected klines response');
      const prev = raw[raw.length - 2];
      const curr = raw[raw.length - 1];
      const price = parseFloat(curr[4]);
      if (!Number.isFinite(price) || price <= 0) throw new Error('Invalid price from feed');
      return {
        price,
        previous: { open: parseFloat(prev[1]), high: parseFloat(prev[2]), low: parseFloat(prev[3]), close: parseFloat(prev[4]) },
      };
    } catch (err: any) {
      this.consecutiveErrors++;
      // Log the first failure and then only every 20th, so a dead feed doesn't flood the log.
      if (this.consecutiveErrors === 1 || this.consecutiveErrors % 20 === 0) {
        this.addLog('ERROR', `Price feed failed (${this.consecutiveErrors}x): ${err?.name === 'AbortError' ? 'timeout' : err?.message}. No trades are taken without real prices.`);
      }
      return null; // NEVER fabricate a price: the old code invented random ticks and traded on them.
    } finally {
      clearTimeout(timer);
    }
  }

  public async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.consecutiveErrors = 0;
    this.addLog('INFO', `Observer started for ${this.symbol} (${INTERVAL_MAP[this.timeframe] || '1m'} candles).`);
    this.timer = setInterval(() => void this.processTick(), this.pollIntervalMs);
    await this.processTick();
  }

  public stop() {
    this.isRunning = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.addLog('INFO', `Observer paused for ${this.symbol}.`);
  }

  private async processTick() {
    if (!this.isRunning || this.busy) return;
    this.busy = true;
    try {
      const data = await this.fetchLiveQuotes();
      if (!data || !this.isRunning) return;
      if (this.consecutiveErrors > 0) {
        this.addLog('INFO', 'Price feed recovered.');
        this.consecutiveErrors = 0;
      }

      const livePrice = data.price;
      this.lastPrice = livePrice;
      this.previousCandle = data.previous;

      const state = await Execution.getState();
      const active = state.activePosition;

      if (active) {
        // Paper only: never judge a position against another asset's price. Live exits are exchange-side OCO orders.
        if (!Execution.isLive && normalizeSymbol(active.symbol) !== normalizeSymbol(this.symbol)) return;
        const closed = await Execution.monitor(livePrice, this.plan.enabled);
        if (closed) this.reportClose(closed, livePrice);
        return;
      }

      const prev = this.previousCandle;
      const isBullish = prev.close > prev.open && livePrice > prev.high;
      const isBearish = prev.close < prev.open && livePrice < prev.low;
      if (!isBullish && !isBearish) return;

      const side = isBullish ? 'BUY' : 'SELL';
      if (side === 'SELL' && !Execution.supportsShort) {
        if (!this.shortNoted) { this.shortNoted = true; this.addLog('INFO', 'Bearish breakout ignored: Binance Spot is long-only (no shorting).'); }
        return;
      }

      // ---- sizing: fixed size, or the daily plan (tiered, quota-capped, spaced out) ----
      let sizeUsd = Math.min(this.tradeCapital, MAX_TRADE_USD);
      let ratio = this.ratio;
      let riskPct: number | undefined;
      let tier: TradeTier | undefined;
      let maxHoldMs: number | undefined;
      let planTag = '';

      if (this.plan.enabled) {
        const plan = this.plan;
        const counts = await Execution.dailyCounts();
        if (counts.total >= plan.maxPerDay) {
          if (this.planDoneDay !== counts.dayStart) {
            this.planDoneDay = counts.dayStart;
            this.addLog('INFO', `Daily plan complete: ${counts.total}/${plan.maxPerDay} trades. Resuming after midnight.`);
          }
          return;
        }
        if (plan.minGapMin > 0 && counts.lastEntryMs !== null && Date.now() - counts.lastEntryMs < plan.minGapMin * 60000) return;

        // Desired tier from signal strength; if that tier's quota is used up, step DOWN to a smaller one (never up).
        const order: TradeTier[] = ['BIG', 'MEDIUM', 'SMALL'];
        const desired = tierForScore(breakoutScore(prev, livePrice, side));
        tier = order.slice(order.indexOf(desired)).find((t) => counts[t] < plan.quotas[t] && plan.sizes[t] > 0);
        if (!tier) return; // every tier at or below the signal strength is full for today: skip this signal

        sizeUsd = Math.min(plan.sizes[tier], MAX_TRADE_USD);
        ratio = `1:${plan.rewardMul}`;
        riskPct = plan.riskPct;
        maxHoldMs = plan.maxHoldMin * 60000;
        planTag = ` [${tier} $${sizeUsd}, trade ${counts.total + 1}/${plan.maxPerDay} today]`;
      }

      const result = await Execution.open({ symbol: this.symbol, side, price: livePrice, tradeCapital: sizeUsd, ratio, riskPct, tier, maxHoldMs });
      if (!result.success || !result.position) {
        if (result.reason !== 'POSITION_ALREADY_OPEN') this.addLog('ERROR', `Entry rejected: ${result.reason}`);
        return;
      }
      const pos = result.position;
      this.addLog('ENTRY', `[ENTRY] ${side}${planTag} at $${livePrice} | Target: $${pos.takeProfit} | Stop: $${pos.stopLoss}`, livePrice);

      if (this.telegramChatId) {
        const { riskMul, rewardMul } = parseRatio(ratio);
        const risk = sizeUsd * (riskPct ?? 0.01);
        void sendTradeExecutionAlert(
          this.telegramChatId,
          {
            symbol: this.symbol, side, strategy: tier ? `Daily plan ${tier} #${(await Execution.dailyCounts()).total}` : 'Breakout Momentum',
            regime: 'Breakout', ratioLabel: ratio, entryPrice: livePrice, stopLoss: pos.stopLoss, takeProfit: pos.takeProfit,
            riskAmount: `$${risk.toFixed(2)}`, targetProfit: `$${(risk * (rewardMul / riskMul)).toFixed(2)}`, clientOrderId: pos.id,
          },
          this.telegramBotToken
        );
      }
    } catch (err: any) {
      this.addLog('ERROR', `Tick error: ${err?.message || err}`);
    } finally {
      this.busy = false;
    }
  }
}

export const globalTradingViewObserver = new TradingViewObserver({
  symbol: 'BINANCE:BTCUSDT',
  timeframe: '1',
  tradeCapital: 2.0,
  ratio: '1:2',
  telegramChatId: process.env.TELEGRAM_CHAT_ID,
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
});
