/**
 * SERVER-ONLY paper broker. Single source of truth for the paper account,
 * persisted to ./data/paper-ledger.json. The browser never imports this file;
 * it talks to it through broker-client.ts.
 */
import fs from 'fs';
import path from 'path';
import {
  ClosedPaperTrade,
  OpenResult,
  PaperBrokerState,
  PaperPosition,
  DailyCounts,
  TradeTier,
  parseRatio,
} from '../types/paper';

export type { ClosedPaperTrade, PaperBrokerState, PaperPosition, OpenResult };

const START_BALANCE = 2000.0;
const FEE_RATE = 0.001; // 0.1% taker fee per side
const RISK_PCT = 0.01; // 1% stop distance

const freshState = (): PaperBrokerState => ({ balance: START_BALANCE, activePosition: null, trades: [] });

const DB_PATH = path.join(process.env.DATA_DIR || path.join(process.cwd(), 'data'), 'paper-ledger.json');

function readDb(): PaperBrokerState {
  try {
    if (!fs.existsSync(DB_PATH)) {
      const s = freshState();
      writeDb(s);
      return s;
    }
    const parsed = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    if (typeof parsed?.balance !== 'number' || !Array.isArray(parsed?.trades)) throw new Error('bad shape');
    return { balance: parsed.balance, activePosition: parsed.activePosition ?? null, trades: parsed.trades };
  } catch (err) {
    // Never silently overwrite a ledger we could not read: keep a copy for recovery.
    try {
      if (fs.existsSync(DB_PATH)) {
        const backup = `${DB_PATH}.corrupt-${Date.now()}`;
        fs.renameSync(DB_PATH, backup);
        console.error(`[PaperBroker] Ledger unreadable (${(err as Error).message}). Moved to ${backup}; starting fresh.`);
      }
    } catch {
      /* ignore */
    }
    const s = freshState();
    writeDb(s);
    return s;
  }
}

function writeDb(data: PaperBrokerState): void {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const tmp = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, DB_PATH); // atomic replace: a crash can never leave a half-written ledger
}

function settle(db: PaperBrokerState, pos: PaperPosition, exitPrice: number, reason: string): ClosedPaperTrade {
  const isLong = pos.side === 'BUY';
  const priceReturn = isLong ? (exitPrice - pos.entryPrice) / pos.entryPrice : (pos.entryPrice - exitPrice) / pos.entryPrice;
  const grossPnl = pos.tradeCapital * priceReturn;
  const exitFee = pos.tradeCapital * FEE_RATE;
  const entryFee = pos.entryFee ?? pos.tradeCapital * FEE_RATE;

  // Capital was reserved at entry (see openPosition); return it plus gross P&L minus the exit fee.
  db.balance += pos.tradeCapital + grossPnl - exitFee;

  const closed: ClosedPaperTrade = {
    ...pos,
    exitPrice: Number(exitPrice.toFixed(6)),
    exitTime: new Date(Date.now()).toISOString(),
    exitReason: reason,
    netPnl: Number((grossPnl - exitFee - entryFee).toFixed(4)),
    newBalance: Number(db.balance.toFixed(2)),
  };
  db.trades.unshift(closed);
  if (db.trades.length > 5000) db.trades.length = 5000;
  db.activePosition = null;
  writeDb(db);
  return closed;
}

export const PaperBroker = {
  getState(): PaperBrokerState {
    return readDb();
  },

  openPosition(p: {
    symbol: string;
    side: string;
    price: number;
    tradeCapital?: number;
    ratio?: string;
    riskPct?: number; // stop distance as a fraction, default 1%
    tier?: TradeTier;
    maxHoldMs?: number;
  }): OpenResult {
    const side = String(p.side || '').toUpperCase();
    if (side !== 'BUY' && side !== 'SELL') return { success: false, reason: 'INVALID_SIDE' };
    if (!Number.isFinite(p.price) || p.price <= 0) return { success: false, reason: 'INVALID_PRICE' };
    const tradeCapital = p.tradeCapital ?? 2.0;
    if (!Number.isFinite(tradeCapital) || tradeCapital <= 0) return { success: false, reason: 'INVALID_TRADE_CAPITAL' };

    const db = readDb();
    if (db.activePosition) return { success: false, reason: 'POSITION_ALREADY_OPEN' };

    const entryFee = tradeCapital * FEE_RATE;
    if (db.balance < tradeCapital + entryFee) return { success: false, reason: 'INSUFFICIENT_BALANCE' };

    const ratio = p.ratio || '1:2';
    const { riskMul, rewardMul } = parseRatio(ratio);
    const riskPct = p.riskPct && p.riskPct > 0 && p.riskPct <= 0.1 ? p.riskPct : RISK_PCT;
    const rewardPct = riskPct * (rewardMul / riskMul);
    const isLong = side === 'BUY';
    const price = p.price;

    const pos: PaperPosition = {
      id: `TRADE-${Date.now()}`,
      symbol: p.symbol,
      side: isLong ? 'BUY' : 'SELL',
      entryPrice: price,
      quantity: tradeCapital / price,
      tradeCapital,
      entryFee,
      stopLoss: Number((isLong ? price * (1 - riskPct) : price * (1 + riskPct)).toFixed(6)),
      takeProfit: Number((isLong ? price * (1 + rewardPct) : price * (1 - rewardPct)).toFixed(6)),
      ratio,
      entryTime: new Date(Date.now()).toISOString(),
      ...(p.tier ? { tier: p.tier } : {}),
      ...(p.maxHoldMs ? { maxHoldMs: p.maxHoldMs } : {}),
    };

    // Reserve the capital + entry fee. (Previously only the fee was taken, but the full capital was
    // credited back on close, which minted free money on every trade.)
    db.balance -= tradeCapital + entryFee;
    db.activePosition = pos;
    writeDb(db);
    return { success: true, position: pos };
  },

  /** Closes only if stop-loss or take-profit has been reached. */
  checkAndClosePosition(currentPrice: number): ClosedPaperTrade | null {
    if (!Number.isFinite(currentPrice) || currentPrice <= 0) return null;
    const db = readDb();
    const pos = db.activePosition;
    if (!pos) return null;
    const isLong = pos.side === 'BUY';
    let reason = '';
    if (isLong) {
      if (currentPrice >= pos.takeProfit) reason = 'TAKE_PROFIT';
      else if (currentPrice <= pos.stopLoss) reason = 'STOP_LOSS';
    } else {
      if (currentPrice <= pos.takeProfit) reason = 'TAKE_PROFIT';
      else if (currentPrice >= pos.stopLoss) reason = 'STOP_LOSS';
    }
    return reason ? settle(db, pos, currentPrice, reason) : null;
  },

  manualClose(currentPrice: number, reason: string = 'MANUAL_CLOSE'): ClosedPaperTrade | null {
    if (!Number.isFinite(currentPrice) || currentPrice <= 0) return null;
    const db = readDb();
    const pos = db.activePosition;
    if (!pos) return null;
    return settle(db, pos, currentPrice, reason);
  },

  /** Daily-plan trade counts since LOCAL midnight (survives restarts because it reads the ledger). */
  dailyCounts(now: number = Date.now()): DailyCounts {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    const dayStart = d.getTime();
    const db = readDb();
    const all = [...(db.activePosition ? [db.activePosition] : []), ...db.trades];
    const c: DailyCounts = { total: 0, SMALL: 0, MEDIUM: 0, BIG: 0, dayStart, lastEntryMs: null };
    for (const t of all) {
      if (!t.tier) continue;
      const at = Date.parse(t.entryTime);
      if (at < dayStart) continue;
      c.total++;
      c[t.tier]++;
      if (c.lastEntryMs === null || at > c.lastEntryMs) c.lastEntryMs = at;
    }
    return c;
  },

  reset(): PaperBrokerState {
    const fresh = freshState();
    writeDb(fresh);
    return fresh;
  },
};
