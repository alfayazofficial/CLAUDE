/**
 * Trend-breakout strategy ("trend"), long-only, for Binance Spot. Pure functions, no I/O.
 * The SAME code is used by the live bot and by scripts/backtest.ts, so what is tested is what is traded.
 *
 * Algorithm (all on CLOSED 15-minute candles; nothing looks into the future):
 *  1. Trend filter (1h, last COMPLETED hour): close > EMA200 and EMA50 > EMA200.
 *  2. Strength filter (15m): ADX(14) >= adxMin, so we only trade when a trend exists.
 *  3. Trigger (15m): close breaks above the highest high of the previous `donchian` bars,
 *     on volume >= volMult x average, with a decisive candle body, and not overextended (close - EMA20 <= maxExt x ATR).
 *  4. Cost gate: expected reward must be >= minEdgeMult x round-trip cost (fees + slippage), else the trade is
 *     mathematically a donation to the exchange and is skipped.
 *  5. Stop = entry - stopAtr x ATR, target = entry + stopAtr x rr x ATR (exits are exchange-side OCO orders).
 *  6. Size: risk riskFrac of equity per trade, capped at the per-trade USD cap.
 */
export interface Bar { time: number; open: number; high: number; low: number; close: number; volume: number }

export interface TrendParams {
  donchian: number;
  adxMin: number;
  volMult: number;
  bodyMin: number; // min |close-open| / (high-low)
  maxExt: number; // max (close - EMA20) in ATRs
  stopAtr: number;
  rr: number;
  minEdgeMult: number;
  roundTripCost: number; // fraction, e.g. 0.0024 = 0.2% fees + 0.04% slippage
  maxHoldBars: number;
  cooldownBars: number;
  maxTradesPerDay: number;
  riskFrac: number;
}

export const DEFAULT_PARAMS: TrendParams = {
  donchian: 20, adxMin: 22, volMult: 1.3, bodyMin: 0.5, maxExt: 2, stopAtr: 1.5, rr: 2,
  minEdgeMult: 4, roundTripCost: 0.0024, maxHoldBars: 48, cooldownBars: 4, maxTradesPerDay: 6, riskFrac: 0.005,
};

export const BAR_MS = 15 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const ema = (v: number[], p: number): number[] => {
  const out = new Array(v.length).fill(NaN);
  if (v.length < p) return out;
  const k = 2 / (p + 1);
  let s = 0;
  for (let i = 0; i < p; i++) s += v[i];
  out[p - 1] = s / p;
  for (let i = p; i < v.length; i++) out[i] = v[i] * k + out[i - 1] * (1 - k);
  return out;
};

/** Wilder smoothing helper: seed = sum of first p values, then s = s - s/p + x. */
const wilder = (v: number[], p: number, start: number): number[] => {
  const out = new Array(v.length).fill(NaN);
  if (v.length < start + p) return out;
  let s = 0;
  for (let i = start; i < start + p; i++) s += v[i];
  out[start + p - 1] = s;
  for (let i = start + p; i < v.length; i++) out[i] = out[i - 1] - out[i - 1] / p + v[i];
  return out;
};

export interface Indicators {
  bars: Bar[];
  ema20: number[];
  atr: number[];
  adx: number[];
  avgVol: number[]; // mean volume of the 20 bars BEFORE bar i
  htfOk: boolean[]; // hourly trend filter valid for bar i (uses only completed hours)
}

export function buildIndicators(bars: Bar[]): Indicators {
  const n = bars.length;
  const close = bars.map((b) => b.close);
  const tr = new Array(n).fill(0), pdm = new Array(n).fill(0), mdm = new Array(n).fill(0);
  for (let i = 1; i < n; i++) {
    const b = bars[i], p = bars[i - 1];
    tr[i] = Math.max(b.high - b.low, Math.abs(b.high - p.close), Math.abs(b.low - p.close));
    const up = b.high - p.high, dn = p.low - b.low;
    pdm[i] = up > dn && up > 0 ? up : 0;
    mdm[i] = dn > up && dn > 0 ? dn : 0;
  }
  const P = 14;
  const trS = wilder(tr, P, 1), pS = wilder(pdm, P, 1), mS = wilder(mdm, P, 1);
  const atr = trS.map((v) => v / P);
  const dx = new Array(n).fill(NaN);
  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(trS[i]) || trS[i] === 0) continue;
    const pdi = (100 * pS[i]) / trS[i], mdi = (100 * mS[i]) / trS[i];
    dx[i] = pdi + mdi === 0 ? 0 : (100 * Math.abs(pdi - mdi)) / (pdi + mdi);
  }
  const adx = new Array(n).fill(NaN);
  const first = dx.findIndex((v) => Number.isFinite(v));
  if (first >= 0 && n >= first + P) {
    let s = 0;
    for (let i = first; i < first + P; i++) s += dx[i];
    adx[first + P - 1] = s / P;
    for (let i = first + P; i < n; i++) adx[i] = (adx[i - 1] * (P - 1) + dx[i]) / P;
  }
  const avgVol = new Array(n).fill(NaN);
  let vs = 0;
  for (let i = 0; i < n; i++) {
    if (i >= 20) avgVol[i] = vs / 20;
    vs += bars[i].volume;
    if (i >= 20) vs -= bars[i - 20].volume;
  }

  // Hourly trend filter. Bars are bucketed by hour; bar i may only use hours that ended at or before bar i's OPEN.
  const hours: { start: number; close: number }[] = [];
  for (const b of bars) {
    const hs = Math.floor(b.time / HOUR_MS) * HOUR_MS;
    const last = hours[hours.length - 1];
    if (last && last.start === hs) last.close = b.close;
    else hours.push({ start: hs, close: b.close });
  }
  const hClose = hours.map((h) => h.close);
  const e50 = ema(hClose, 50), e200 = ema(hClose, 200);
  const hourIdx = new Map<number, number>();
  hours.forEach((h, i) => hourIdx.set(h.start, i));
  const htfOk = new Array(n).fill(false);
  for (let i = 0; i < n; i++) {
    const prev = hourIdx.get(Math.floor(bars[i].time / HOUR_MS) * HOUR_MS - HOUR_MS);
    if (prev === undefined) continue; // previous hour not present (gap or history start)
    htfOk[i] = Number.isFinite(e200[prev]) && hClose[prev] > e200[prev] && e50[prev] > e200[prev];
  }
  return { bars, ema20: ema(close, 20), atr, adx, avgVol, htfOk };
}

export interface Signal { entry: number; stop: number; target: number; riskPct: number; atr: number; rr: number }
export type Decision = { signal: Signal } | { skip: string };

/** Decide using only bars[0..i]. `entryRef` is the price we expect to pay (close of bar i for live; next open in backtests). */
export function evaluateAt(ind: Indicators, i: number, p: TrendParams = DEFAULT_PARAMS): Decision {
  const b = ind.bars[i];
  if (!b || i < Math.max(p.donchian, 30)) return { skip: 'warming up' };
  const atr = ind.atr[i], adx = ind.adx[i], avgVol = ind.avgVol[i], e20 = ind.ema20[i];
  if (![atr, adx, avgVol, e20].every(Number.isFinite)) return { skip: 'warming up' };
  if (!ind.htfOk[i]) return { skip: '1h trend filter off' };
  if (adx < p.adxMin) return { skip: `ADX ${adx.toFixed(1)} < ${p.adxMin}` };
  let hh = -Infinity;
  for (let j = i - p.donchian; j < i; j++) hh = Math.max(hh, ind.bars[j].high);
  if (!(b.close > hh)) return { skip: 'no breakout' };
  if (b.volume < p.volMult * avgVol) return { skip: 'volume too low' };
  const range = b.high - b.low;
  if (!(range > 0) || Math.abs(b.close - b.open) / range < p.bodyMin || b.close <= b.open) return { skip: 'weak candle' };
  if (b.close - e20 > p.maxExt * atr) return { skip: 'overextended' };

  const entry = b.close;
  const stopDist = p.stopAtr * atr;
  const riskPct = stopDist / entry;
  const rewardPct = riskPct * p.rr;
  if (riskPct > 0.1 || riskPct <= 0) return { skip: 'stop distance out of range' };
  if (rewardPct < p.minEdgeMult * p.roundTripCost) return { skip: `target ${(rewardPct * 100).toFixed(2)}% too small vs costs` };
  return { signal: { entry, stop: entry - stopDist, target: entry + stopDist * p.rr, riskPct, atr, rr: p.rr } };
}

/** USD to trade so that hitting the stop loses about riskFrac of equity, capped. */
export function positionUsd(equity: number, riskPct: number, capUsd: number, p: TrendParams = DEFAULT_PARAMS): number {
  if (!(equity > 0) || !(riskPct > 0)) return 0;
  return Math.max(0, Math.min(capUsd, (equity * p.riskFrac) / riskPct));
}

export function paramsFromEnv(env: Record<string, string | undefined> = process.env): TrendParams {
  const f = (k: string, d: number) => { const v = parseFloat(env[k] ?? ''); return Number.isFinite(v) ? v : d; };
  const d = DEFAULT_PARAMS;
  return {
    donchian: Math.round(f('TREND_DONCHIAN', d.donchian)), adxMin: f('TREND_ADX_MIN', d.adxMin), volMult: f('TREND_VOL_MULT', d.volMult),
    bodyMin: f('TREND_BODY_MIN', d.bodyMin), maxExt: f('TREND_MAX_EXT', d.maxExt), stopAtr: f('TREND_STOP_ATR', d.stopAtr), rr: f('TREND_RR', d.rr),
    minEdgeMult: f('TREND_MIN_EDGE_MULT', d.minEdgeMult), roundTripCost: f('TREND_ROUNDTRIP_COST', d.roundTripCost),
    maxHoldBars: Math.round(f('TREND_MAX_HOLD_BARS', d.maxHoldBars)), cooldownBars: Math.round(f('TREND_COOLDOWN_BARS', d.cooldownBars)),
    maxTradesPerDay: Math.round(f('TREND_MAX_TRADES_PER_DAY', d.maxTradesPerDay)), riskFrac: f('TREND_RISK_FRAC', d.riskFrac),
  };
}
