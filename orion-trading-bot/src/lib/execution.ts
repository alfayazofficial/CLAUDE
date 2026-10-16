/**
 * SERVER-ONLY execution facade. One switch decides where orders go:
 *   EXECUTION_MODE=paper    simulated ledger (default, no keys needed)
 *   EXECUTION_MODE=testnet  real orders on Binance Spot Testnet (fake money, real API behaviour)
 *   EXECUTION_MODE=live     real orders, real money. Also needs LIVE_TRADING_CONFIRM=I_ACCEPT_REAL_MONEY_RISK
 */
import { PaperBroker } from './broker-store';
import { BinanceSpot } from './binance-spot';
import { LiveExecutor } from './live-executor';
import { ClosedPaperTrade, DailyCounts, OpenResult, PaperBrokerState, TradeTier } from '../types/paper';

export type ExecutionMode = 'paper' | 'testnet' | 'live';
export const CONFIRM_PHRASE = 'I_ACCEPT_REAL_MONEY_RISK';

const envNum = (k: string, d: number) => { const v = parseFloat(process.env[k] ?? ''); return Number.isFinite(v) && v > 0 ? v : d; };

const requested = (process.env.EXECUTION_MODE || 'paper').toLowerCase();
export const MODE: ExecutionMode = requested === 'live' ? 'live' : requested === 'testnet' ? 'testnet' : 'paper';

let live: LiveExecutor | null = null;
let configError: string | null = null;

if (MODE !== 'paper') {
  const key = (process.env.BINANCE_API_KEY || '').trim();
  const secret = (process.env.BINANCE_API_SECRET || '').trim();
  if (!key || !secret) configError = `EXECUTION_MODE=${MODE} needs BINANCE_API_KEY and BINANCE_API_SECRET in .env`;
  else if (MODE === 'live' && process.env.STRATEGY_BACKTEST_PASSED !== 'yes') configError = 'EXECUTION_MODE=live needs STRATEGY_BACKTEST_PASSED=yes in .env, set only after the strategy passed `npm run backtest` and testnet (see docs/BACKTEST_RESULTS.md: the built-in trend strategy FAILED)';
  else if (MODE === 'live' && process.env.LIVE_TRADING_CONFIRM !== CONFIRM_PHRASE) configError = `EXECUTION_MODE=live needs LIVE_TRADING_CONFIRM=${CONFIRM_PHRASE} in .env`;
  else {
    live = new LiveExecutor(
      new BinanceSpot(MODE, key, secret, process.env.BINANCE_BASE_URL?.trim() || undefined),
      {
        maxTradeUsd: envNum('LIVE_MAX_TRADE_USD', 25),
        maxDailyLossUsd: envNum('LIVE_MAX_DAILY_LOSS_USD', 20),
        maxConsecLosses: Math.round(envNum('LIVE_MAX_CONSEC_LOSSES', 5)),
      }
    );
  }
  if (configError) console.error(`[Execution] ${configError}. Trading is DISABLED (nothing falls back to paper silently).`);
}

const disabled = () => ({ success: false as const, reason: `EXECUTION_DISABLED: ${configError}` });

export const Execution = {
  mode: MODE,
  configError,
  /** Binance Spot cannot short. Paper can. */
  supportsShort: MODE === 'paper',
  isLive: MODE !== 'paper',
  executor: live,

  async getState(): Promise<PaperBrokerState & Record<string, unknown>> {
    if (MODE === 'paper') return { ...PaperBroker.getState(), mode: MODE };
    if (!live) return { balance: 0, activePosition: null, trades: [], mode: MODE, configError };
    return { ...(await live.getState()), mode: MODE };
  },

  async open(p: { symbol: string; side: string; price: number; tradeCapital: number; ratio?: string; riskPct?: number; tier?: TradeTier; maxHoldMs?: number }): Promise<OpenResult> {
    if (MODE === 'paper') return PaperBroker.openPosition(p);
    if (!live) return disabled();
    return live.open(p);
  },

  /** Paper: check SL/TP/time-stop against `price`. Live: reconcile with the exchange (stops live there). */
  async monitor(price: number, timeStopEnabled: boolean): Promise<ClosedPaperTrade | null> {
    if (MODE === 'paper') {
      const pos = PaperBroker.getState().activePosition;
      if (!pos) return null;
      let closed = PaperBroker.checkAndClosePosition(price);
      if (!closed && timeStopEnabled && pos.maxHoldMs && Date.now() - Date.parse(pos.entryTime) >= pos.maxHoldMs) closed = PaperBroker.manualClose(price, 'TIME_STOP');
      return closed;
    }
    return live ? live.monitor(timeStopEnabled) : null;
  },

  async manualClose(price: number): Promise<ClosedPaperTrade | null> {
    if (MODE === 'paper') return PaperBroker.manualClose(price);
    return live ? live.flatten(false) : null;
  },

  async dailyCounts(): Promise<DailyCounts> {
    return MODE === 'paper' ? PaperBroker.dailyCounts() : live ? live.dailyCounts() : PaperBroker.dailyCounts();
  },

  async hasOpenPosition(): Promise<boolean> {
    return !!(await this.getState()).activePosition;
  },
};
