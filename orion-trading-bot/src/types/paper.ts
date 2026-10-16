export type TradeTier = 'SMALL' | 'MEDIUM' | 'BIG';

export interface DailyCounts {
  total: number; // tiered (daily-plan) trades opened since local midnight
  SMALL: number;
  MEDIUM: number;
  BIG: number;
  dayStart: number;
  lastEntryMs: number | null;
}

export interface PaperPosition {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  entryPrice: number;
  quantity: number;
  tradeCapital: number;
  entryFee: number;
  stopLoss: number;
  takeProfit: number;
  ratio: string;
  entryTime: string;
  tier?: TradeTier;
  maxHoldMs?: number; // time stop for the daily plan
}

export interface ClosedPaperTrade extends PaperPosition {
  exitPrice: number;
  exitTime: string;
  exitReason: 'TAKE_PROFIT' | 'STOP_LOSS' | 'MANUAL_CLOSE' | string;
  netPnl: number; // after BOTH entry and exit fees
  newBalance: number;
}

export interface PaperBrokerState {
  balance: number;
  activePosition: PaperPosition | null;
  trades: ClosedPaperTrade[];
}

export interface OpenResult {
  success: boolean;
  reason?: string;
  position?: PaperPosition;
}

export interface ObserverLog {
  id: string;
  time: number;
  type: 'INFO' | 'SIGNAL' | 'ENTRY' | 'EXIT' | 'ERROR';
  message: string;
  price?: number;
}

export interface ObserverStatus {
  isRunning: boolean;
  symbol: string;
  lastPrice: number;
}

/** Normalises 'BINANCE:BTCUSDT', 'BTC/USDT', 'btcusdt' -> 'BTCUSDT' so symbols can be compared. */
export function normalizeSymbol(sym: string): string {
  return String(sym || '')
    .replace(/^[A-Za-z]+:/, '')
    .replace(/[\/\-_\s]/g, '')
    .toUpperCase();
}

export function parseRatio(ratio: string): { riskMul: number; rewardMul: number } {
  const m = /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.exec(String(ratio || '').trim());
  if (m) {
    const r = parseFloat(m[1]);
    const w = parseFloat(m[2]);
    if (r > 0 && w > 0) return { riskMul: r, rewardMul: w };
  }
  return { riskMul: 1, rewardMul: 2 };
}
