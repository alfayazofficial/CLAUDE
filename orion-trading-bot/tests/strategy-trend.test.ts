import test from 'node:test';
import assert from 'node:assert/strict';
import { Bar, DEFAULT_PARAMS, TrendParams, buildIndicators, evaluateAt, positionUsd } from '../src/lib/strategy-trend';
import { simulate, DEFAULT_COSTS } from '../src/lib/backtest-trend';

const T0 = Date.UTC(2025, 0, 1);
/** Smooth synthetic uptrend. Only used to exercise the rules; it says NOTHING about real-market profit. */
function trendBars(n = 1200, g = 0.002, eps = 0.0005): Bar[] {
  const bars: Bar[] = [];
  let p = 100;
  for (let i = 0; i < n; i++) {
    const open = p, close = p * (1 + g);
    bars.push({ time: T0 + i * 900000, open, close, high: close * (1 + eps), low: open * (1 - eps), volume: i % 7 === 0 ? 220 : 100 });
    p = close;
  }
  return bars;
}
const RELAXED: TrendParams = { ...DEFAULT_PARAMS, adxMin: 0, maxExt: 99, volMult: 1.3, minEdgeMult: 2 };

function firstSignal(ind: ReturnType<typeof buildIndicators>, p: TrendParams) {
  for (let i = 0; i < ind.bars.length; i++) { const d = evaluateAt(ind, i, p); if ('signal' in d) return { i, d }; }
  return null;
}

test('indicators never use future bars (appending data does not change the past)', () => {
  const bars = trendBars(900);
  const a = buildIndicators(bars.slice(0, 700));
  const b = buildIndicators(bars);
  for (let i = 0; i < 700; i++) {
    for (const k of ['ema20', 'atr', 'adx', 'avgVol'] as const) {
      const x = a[k][i], y = b[k][i];
      assert.ok((Number.isNaN(x) && Number.isNaN(y)) || Math.abs(x - y) < 1e-9, `${k}[${i}] changed`);
    }
    // the hourly filter of a bar is only allowed to change if its own hour history was incomplete in the shorter series
    if (i < 690) assert.equal(a.htfOk[i], b.htfOk[i], `htfOk[${i}] changed`);
  }
});

test('signal geometry: stop below, target at rr x risk above, risk matches ATR', () => {
  const ind = buildIndicators(trendBars());
  const s = firstSignal(ind, RELAXED);
  assert.ok(s, 'expected a signal in a clean uptrend with relaxed filters');
  const sig = (s!.d as any).signal;
  assert.ok(sig.stop < sig.entry && sig.target > sig.entry);
  assert.ok(Math.abs((sig.target - sig.entry) / (sig.entry - sig.stop) - RELAXED.rr) < 1e-9);
  assert.ok(Math.abs(sig.riskPct - (RELAXED.stopAtr * ind.atr[s!.i]) / sig.entry) < 1e-12);
});

test('default filters reject a straight-line run as overextended; high cost gate rejects small targets', () => {
  const ind = buildIndicators(trendBars());
  const i = firstSignal(ind, RELAXED)!.i;
  const d = evaluateAt(ind, i, { ...DEFAULT_PARAMS, adxMin: 0 });
  assert.ok('skip' in d && d.skip === 'overextended', JSON.stringify(d));
  const d2 = evaluateAt(ind, i, { ...RELAXED, minEdgeMult: 1000 });
  assert.ok('skip' in d2 && /too small vs costs/.test(d2.skip), JSON.stringify(d2));
});

test('trend filter: a falling market never signals', () => {
  const ind = buildIndicators(trendBars(1200, -0.002));
  assert.equal(firstSignal(ind, RELAXED), null);
});

test('backtest: take-profit trade pays exactly target minus fees (fill at next open + slippage)', () => {
  const bars = trendBars();
  const ind = buildIndicators(bars);
  const { trades } = simulate(bars, ind, RELAXED, DEFAULT_COSTS);
  assert.ok(trades.length > 0);
  const t = trades[0];
  assert.equal(t.reason, 'TAKE_PROFIT');
  const s = firstSignal(ind, RELAXED)!;
  const riskPct = (s.d as any).signal.riskPct;
  assert.ok(Math.abs(t.entry - bars[s.i + 1].open * (1 + DEFAULT_COSTS.slippage)) < 1e-9, 'entry must be next open + slippage');
  const mult = 1 + riskPct * RELAXED.rr;
  const expected = mult - 1 - DEFAULT_COSTS.feeRate - DEFAULT_COSTS.feeRate * mult;
  assert.ok(Math.abs(t.ret - expected) < 1e-9, `${t.ret} vs ${expected}`);
});

test('backtest: when one bar touches both stop and target, the stop is assumed to hit first', () => {
  const bars = trendBars();
  const ind = buildIndicators(bars);
  const s = firstSignal(ind, RELAXED)!;
  const k0 = s.i + 1;
  bars[k0] = { ...bars[k0], low: bars[k0].open * 0.9, high: bars[k0].open * 1.1 }; // exits only read bars, indicators were built before
  const { trades } = simulate(bars, ind, RELAXED, DEFAULT_COSTS);
  assert.equal(trades[0].reason, 'STOP_LOSS');
  assert.ok(trades[0].ret < 0);
});

test('position sizing: risk-based, capped, never negative', () => {
  assert.equal(positionUsd(1000, 0.01, 1e9), 500); // 0.5% of 1000 = $5 risk / 1% stop = $500
  assert.equal(positionUsd(1000, 0.01, 25), 25);
  assert.equal(positionUsd(0, 0.01, 25), 0);
});
