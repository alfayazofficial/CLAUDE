/**
 * Testnet scorecard: reads data/live-state-<env>.json and prints stats + a go/no-go verdict.
 * Usage: npm run report            (or: npm run report -- path/to/live-state-testnet.json)
 */
import fs from 'fs';
import path from 'path';

const file = process.argv[2] || path.join(process.env.DATA_DIR || path.join(process.cwd(), 'data'), 'live-state-testnet.json');
if (!fs.existsSync(file)) { console.error(`No trade file at ${file}. The bot has not traded yet.`); process.exit(1); }
const st = JSON.parse(fs.readFileSync(file, 'utf-8'));
const trades: { netPnl: number; exitTime: string; entryTime: string; exitReason: string; tradeCapital: number }[] = [...(st.trades || [])].reverse();
if (trades.length === 0) { console.log('No closed trades yet.'); process.exit(0); }

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const pnl = trades.map((t) => t.netPnl);
const wins = pnl.filter((p) => p > 0), losses = pnl.filter((p) => p < 0);
const net = sum(pnl);
const pf = losses.length ? sum(wins) / Math.abs(sum(losses)) : Infinity;
let eq = 0, peak = 0, maxDD = 0;
for (const p of pnl) { eq += p; peak = Math.max(peak, eq); maxDD = Math.max(maxDD, peak - eq); }

const byDay = new Map<string, number>();
for (const t of trades) { const d = t.exitTime.slice(0, 10); byDay.set(d, (byDay.get(d) || 0) + t.netPnl); }
const days = [...byDay.values()];
const firstDay = Date.parse(trades[0].entryTime), lastDay = Date.parse(trades[trades.length - 1].exitTime);
const spanDays = Math.max(1, Math.round((lastDay - firstDay) / 86400000));
const reasons: Record<string, number> = {};
for (const t of trades) reasons[t.exitReason] = (reasons[t.exitReason] || 0) + 1;
const money = (n: number) => `${n >= 0 ? '+' : '-'}$${Math.abs(n).toFixed(2)}`;

console.log(`\nTESTNET SCORECARD  (${spanDays} days, ${trades.length} trades)\n${'-'.repeat(50)}`);
console.log(`Net P&L after fees : ${money(net)}   (avg ${money(net / trades.length)} per trade)`);
console.log(`Win rate           : ${((wins.length / trades.length) * 100).toFixed(1)}%  (${wins.length}W / ${losses.length}L)`);
console.log(`Profit factor      : ${Number.isFinite(pf) ? pf.toFixed(2) : 'n/a'}   (gross wins / gross losses, needs > 1.3)`);
console.log(`Max drawdown       : ${money(-maxDD)}`);
console.log(`Winning days       : ${days.filter((d) => d > 0).length} of ${days.length}`);
console.log(`Worst day          : ${money(Math.min(...days))}   Best day: ${money(Math.max(...days))}`);
console.log(`Exits              : ${Object.entries(reasons).map(([k, v]) => `${k}=${v}`).join('  ')}`);
console.log(`Halts              : ${st.halt?.on ? `CURRENTLY HALTED (${st.halt.kind}): ${st.halt.reason}` : 'none right now'}`);

const checks: [string, boolean][] = [
  ['At least 28 days of data', spanDays >= 28],
  ['At least 200 trades', trades.length >= 200],
  ['Net P&L after fees > 0', net > 0],
  ['Profit factor > 1.3', pf > 1.3],
  ['Max drawdown under 4x the average trade size', maxDD < 4 * (sum(trades.map((t) => t.tradeCapital)) / trades.length)],
  ['More than half of days were profitable', days.filter((d) => d > 0).length > days.length / 2],
];
console.log(`\nGO / NO-GO CHECKS\n${'-'.repeat(50)}`);
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
const allPass = checks.every(([, ok]) => ok);
console.log(`\nVerdict: ${allPass ? 'Passed the minimum bar. Real money is still a risk; start tiny.' : 'NOT ready for real money. Do not go live on this result.'}\n`);
