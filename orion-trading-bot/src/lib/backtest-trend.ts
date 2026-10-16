/** Event-driven backtest of the "trend" strategy. Conservative by construction (see notes in simulate()). */
import { Bar, Indicators, TrendParams, buildIndicators, evaluateAt, positionUsd, DEFAULT_PARAMS } from './strategy-trend';

export interface CostModel { feeRate: number; slippage: number } // per side, fractions
export const DEFAULT_COSTS: CostModel = { feeRate: 0.001, slippage: 0.0002 };

export interface Trade {
  entryTime: number; exitTime: number; entry: number; exit: number;
  ret: number; // net return on notional, after both fees and slippage
  r: number; // net result in multiples of the planned risk
  reason: 'TAKE_PROFIT' | 'STOP_LOSS' | 'TIME_STOP' | 'END';
}

export interface Stats {
  trades: number; winRate: number; profitFactor: number; expectancyPct: number; netPct: number;
  maxDrawdownPct: number; avgR: number; tradesPerDay: number; endEquity: number;
}

/**
 * Rules that make this pessimistic rather than flattering:
 *  - signal on closed bar i, fill at bar i+1 OPEN plus slippage (never the signal bar's close);
 *  - if a bar touches both stop and target, the STOP is assumed to hit first;
 *  - stop exits pay slippage, target exits (resting limit orders) do not;
 *  - fees on both sides; time stop exits at the bar close;
 *  - one position at a time, cooldown after each exit, daily trade cap.
 */
export function simulate(bars: Bar[], ind: Indicators, p: TrendParams, costs: CostModel = DEFAULT_COSTS, from = 0, to = bars.length): { trades: Trade[]; stats: Stats } {
  const trades: Trade[] = [];
  let i = Math.max(from, 0);
  let nextAllowed = 0;
  const perDay = new Map<number, number>();
  while (i < Math.min(to, bars.length) - 1) {
    if (i < nextAllowed) { i++; continue; }
    const day = Math.floor(bars[i].time / 86400000);
    if ((perDay.get(day) ?? 0) >= p.maxTradesPerDay) { i++; continue; }
    const d = evaluateAt(ind, i, p);
    if (!('signal' in d)) { i++; continue; }

    const k0 = i + 1;
    const entry = bars[k0].open * (1 + costs.slippage);
    const riskPct = d.signal.riskPct;
    const stopPx = entry * (1 - riskPct), tgtPx = entry * (1 + riskPct * p.rr);
    let exit = NaN, reason: Trade['reason'] = 'END', k = k0;
    for (; k < Math.min(to, bars.length); k++) {
      const b = bars[k];
      if (b.low <= stopPx) { exit = Math.min(stopPx, b.open) * (1 - costs.slippage); reason = 'STOP_LOSS'; break; }
      if (b.high >= tgtPx) { exit = tgtPx; reason = 'TAKE_PROFIT'; break; }
      if (k - k0 + 1 >= p.maxHoldBars) { exit = b.close * (1 - costs.slippage); reason = 'TIME_STOP'; break; }
    }
    if (Number.isNaN(exit)) { k = Math.min(to, bars.length) - 1; exit = bars[k].close * (1 - costs.slippage); reason = 'END'; }
    const gross = exit / entry - 1;
    const ret = gross - costs.feeRate - costs.feeRate * (exit / entry);
    trades.push({ entryTime: bars[k0].time, exitTime: bars[k].time, entry, exit, ret, r: ret / riskPct, reason });
    perDay.set(day, (perDay.get(day) ?? 0) + 1);
    nextAllowed = k + 1 + p.cooldownBars;
    i = k + 1;
  }
  return { trades, stats: summarize(trades, p, bars, from, to) };
}

export function summarize(trades: Trade[], p: TrendParams, bars: Bar[], from = 0, to = bars.length): Stats {
  let eq = 1, peak = 1, maxDD = 0;
  for (const t of trades) {
    // Risk-based sizing without a USD cap: a stop-out loses riskFrac of equity, so notional = riskFrac / riskPct = riskFrac * (1/riskPct); equity change = riskFrac * r.
    eq *= 1 + p.riskFrac * t.r;
    peak = Math.max(peak, eq);
    maxDD = Math.max(maxDD, (peak - eq) / peak);
  }
  const wins = trades.filter((t) => t.ret > 0), losses = trades.filter((t) => t.ret <= 0);
  const gw = wins.reduce((s, t) => s + t.ret, 0), gl = Math.abs(losses.reduce((s, t) => s + t.ret, 0));
  const days = Math.max(1, (bars[Math.min(to, bars.length) - 1].time - bars[from].time) / 86400000);
  return {
    trades: trades.length,
    winRate: trades.length ? wins.length / trades.length : 0,
    profitFactor: gl > 0 ? gw / gl : gw > 0 ? Infinity : 0,
    expectancyPct: trades.length ? (trades.reduce((s, t) => s + t.ret, 0) / trades.length) * 100 : 0,
    netPct: (eq - 1) * 100,
    maxDrawdownPct: maxDD * 100,
    avgR: trades.length ? trades.reduce((s, t) => s + t.r, 0) / trades.length : 0,
    tradesPerDay: trades.length / days,
    endEquity: eq,
  };
}

export interface FoldResult { from: number; to: number; stats: Stats }

export function runFolds(bars: Bar[], ind: Indicators, p: TrendParams, k = 4, costs = DEFAULT_COSTS): FoldResult[] {
  const out: FoldResult[] = [];
  const size = Math.floor(bars.length / k);
  for (let f = 0; f < k; f++) {
    const from = f * size, to = f === k - 1 ? bars.length : (f + 1) * size;
    out.push({ from, to, stats: simulate(bars, ind, p, costs, from, to).stats });
  }
  return out;
}

export const GRID = {
  stopAtr: [1, 1.5, 2], rr: [1.5, 2, 3], donchian: [14, 20, 30], adxMin: [18, 22, 26],
};

export function gridParams(base: TrendParams): TrendParams[] {
  const out: TrendParams[] = [];
  for (const stopAtr of GRID.stopAtr) for (const rr of GRID.rr) for (const donchian of GRID.donchian) for (const adxMin of GRID.adxMin)
    out.push({ ...base, stopAtr, rr, donchian, adxMin });
  return out;
}

/** Robustness: how many parameter sets are profitable, plus true out-of-sample test of the in-sample winner. */
export function robustness(bars: Bar[], ind: Indicators, base: TrendParams, costs = DEFAULT_COSTS) {
  const half = Math.floor(bars.length / 2);
  const rows = gridParams(base).map((p) => ({
    p,
    full: simulate(bars, ind, p, costs).stats,
    isStats: simulate(bars, ind, p, costs, 0, half).stats,
  }));
  const profitable = rows.filter((r) => r.full.netPct > 0 && r.full.profitFactor > 1).length;
  const pfs = rows.map((r) => r.full.profitFactor).filter(Number.isFinite).sort((a, b) => a - b);
  const eligible = rows.filter((r) => r.isStats.trades >= 30);
  const best = (eligible.length ? eligible : rows).sort((a, b) => b.isStats.profitFactor - a.isStats.profitFactor)[0];
  const oos = simulate(bars, ind, best.p, costs, half, bars.length).stats;
  return { combos: rows.length, profitable, medianPF: pfs.length ? pfs[Math.floor(pfs.length / 2)] : 0, best: best.p, bestInSample: best.isStats, bestOutOfSample: oos };
}

export function buyAndHoldPct(bars: Bar[]): number {
  return (bars[bars.length - 1].close / bars[0].open - 1) * 100;
}

export { buildIndicators, DEFAULT_PARAMS, positionUsd };
