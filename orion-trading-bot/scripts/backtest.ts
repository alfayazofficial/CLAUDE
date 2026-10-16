/**
 * Backtest the "trend" strategy on REAL Binance 15m history.
 *   npm run backtest -- --symbols BTCUSDT,ETHUSDT --years 2
 *   npm run backtest -- --file path/to/klines.json --symbols BTCUSDT      (offline; array of [openTime,o,h,l,c,v,...])
 * Writes data/backtest-report.md and exits non-zero when the strategy does not clear the bar.
 */
import fs from 'fs';
import path from 'path';
import { Bar, DEFAULT_PARAMS, buildIndicators, paramsFromEnv } from '../src/lib/strategy-trend';
import { simulate, runFolds, robustness, buyAndHoldPct, DEFAULT_COSTS } from '../src/lib/backtest-trend';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
const symbols = arg('symbols', 'BTCUSDT,ETHUSDT').split(',').map((s) => s.trim().toUpperCase());
const years = parseFloat(arg('years', '2'));
const fileArg = arg('file', '');
const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const BASE = process.env.BINANCE_DATA_URL || 'https://data-api.binance.vision';

async function download(symbol: string): Promise<Bar[]> {
  const cache = path.join(dataDir, `klines-${symbol}-15m-${years}y.json`);
  if (fs.existsSync(cache) && Date.now() - fs.statSync(cache).mtimeMs < 12 * 3600 * 1000) return JSON.parse(fs.readFileSync(cache, 'utf-8'));
  const all: Bar[] = [];
  let start = Date.now() - years * 365 * 86400000;
  for (;;) {
    const res = await fetch(`${BASE}/api/v3/klines?symbol=${symbol}&interval=15m&startTime=${Math.floor(start)}&limit=1000`);
    if (!res.ok) throw new Error(`Binance HTTP ${res.status} for ${symbol} (set BINANCE_DATA_URL if blocked in your region)`);
    const rows: any[][] = await res.json();
    if (!rows.length) break;
    for (const r of rows) all.push({ time: r[0], open: +r[1], high: +r[2], low: +r[3], close: +r[4], volume: +r[5] });
    start = rows[rows.length - 1][0] + 1;
    if (rows.length < 1000) break;
  }
  all.pop(); // last candle is still forming
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(cache, JSON.stringify(all));
  return all;
}

const pct = (n: number) => `${n.toFixed(2)}%`;
const pf = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : 'inf');

async function main() {
  const p = paramsFromEnv();
  let md = `# Trend strategy backtest\n\nGenerated ${new Date().toISOString()}. Fees ${DEFAULT_COSTS.feeRate * 100}%/side, slippage ${DEFAULT_COSTS.slippage * 100}%/side, ` +
    `risk ${p.riskFrac * 100}% of equity per trade, params: ${JSON.stringify(p)}\n\n`;
  let failures = 0;
  for (const symbol of symbols) {
    const bars = fileArg
      ? (JSON.parse(fs.readFileSync(fileArg, 'utf-8')) as any[]).map((r) => (Array.isArray(r) ? { time: r[0], open: +r[1], high: +r[2], low: +r[3], close: +r[4], volume: +r[5] } : r) as Bar)
      : await download(symbol);
    const ind = buildIndicators(bars);
    const full = simulate(bars, ind, p);
    const folds = runFolds(bars, ind, p, 4);
    const rob = robustness(bars, ind, p);
    const span = `${new Date(bars[0].time).toISOString().slice(0, 10)} to ${new Date(bars[bars.length - 1].time).toISOString().slice(0, 10)}`;
    const s = full.stats;
    md += `## ${symbol}  (${bars.length} bars, ${span})\n\n`;
    md += `| Metric | Strategy | Buy and hold |\n|---|---|---|\n| Net return (risk-sized) | ${pct(s.netPct)} | ${pct(buyAndHoldPct(bars))} |\n`;
    md += `| Trades | ${s.trades} (${s.tradesPerDay.toFixed(2)}/day) | |\n| Win rate | ${pct(s.winRate * 100)} | |\n| Profit factor | ${pf(s.profitFactor)} | |\n`;
    md += `| Expectancy per trade | ${pct(s.expectancyPct)} | |\n| Avg R | ${s.avgR.toFixed(2)} | |\n| Max drawdown | ${pct(s.maxDrawdownPct)} | |\n\n`;
    md += `**4 sequential folds** (each is a different market period):\n\n| Fold | Trades | Net | PF | Max DD |\n|---|---|---|---|---|\n`;
    folds.forEach((f, i) => { md += `| ${i + 1} | ${f.stats.trades} | ${pct(f.stats.netPct)} | ${pf(f.stats.profitFactor)} | ${pct(f.stats.maxDrawdownPct)} |\n`; });
    md += `\n**Robustness** (${rob.combos} nearby parameter sets): ${rob.profitable} profitable (${((rob.profitable / rob.combos) * 100).toFixed(0)}%), median PF ${pf(rob.medianPF)}.\n`;
    md += `Best in first half: ${JSON.stringify({ stopAtr: rob.best.stopAtr, rr: rob.best.rr, donchian: rob.best.donchian, adxMin: rob.best.adxMin })} PF ${pf(rob.bestInSample.profitFactor)}; ` +
      `then on the unseen second half: PF ${pf(rob.bestOutOfSample.profitFactor)}, net ${pct(rob.bestOutOfSample.netPct)} (${rob.bestOutOfSample.trades} trades).\n\n`;

    const checks: [string, boolean][] = [
      ['At least 150 trades', s.trades >= 150],
      ['Profit factor > 1.3 after costs', s.profitFactor > 1.3],
      ['Profitable in at least 3 of 4 folds', folds.filter((f) => f.stats.netPct > 0).length >= 3],
      ['At least 60% of nearby parameter sets profitable', rob.profitable / rob.combos >= 0.6],
      ['Unseen half (walk-forward) profit factor > 1.1', rob.bestOutOfSample.profitFactor > 1.1],
      ['Max drawdown < 25%', s.maxDrawdownPct < 25],
    ];
    md += `**Checks for ${symbol}**\n\n`;
    for (const [name, ok] of checks) { md += `- ${ok ? 'PASS' : 'FAIL'}: ${name}\n`; if (!ok) failures++; }
    md += '\n';
  }
  md += failures === 0
    ? `## Verdict\n\nAll checks passed on historical data. This is necessary, not sufficient: run testnet for 4 weeks next.\n`
    : `## Verdict\n\n${failures} check(s) failed. Do NOT trade this with real money as configured.\n`;
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, 'backtest-report.md'), md);
  console.log(md);
  process.exit(failures === 0 ? 0 : 2);
}
main().catch((e) => { console.error(e.message || e); process.exit(1); });
