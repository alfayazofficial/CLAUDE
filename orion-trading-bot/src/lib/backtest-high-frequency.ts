import { Candle } from '../types/trading';

export interface HFBacktestOptions {
  timeframe?: string; // '1h' (default), '1m', '5m', '15m', '4h', '1d'
  tradeCapital?: number; // e.g. $2.00 fixed
  ratio?: '1:1.5' | '1:2' | '2:3' | '3:6' | '1:3' | '3:9' | string;
  baseStopPct?: number; // default 0.01 (1.0% risk distance)
  feeRate?: number; // Binance 0.1% taker fee per side = 0.001
  spreadRate?: number; // 0.02% estimated bid/ask spread = 0.0002
  initialBalance?: number; // default $2,000.00
  signalMethod?: 'MOMENTUM_BAR' | 'EMA_MICRO' | 'BOLLINGER_TOUCH' | 'UT_BOT_1M';
}

export interface HFTrade {
  barIndex: number;
  minuteIndex: number;
  time: number;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  exitReason: 'TAKE_PROFIT' | 'STOP_LOSS' | 'BAR_CLOSE_TIMEOUT';
  isWin: boolean;
  grossPnl: number;
  roundTripFee: number;
  spreadCost: number;
  netPnl: number;
  runningBalance: number;
}

export interface HFBacktestResult {
  timeframe: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  timeoutTrades: number;
  winRate: number; // in percentage e.g. 38.5%
  breakEvenWinRate: number; // theoretical break-even win rate e.g. 33.3%
  initialBalance: number;
  finalBalance: number;
  grossProfit: number;
  totalFeesPaid: number;
  totalSpreadCost: number;
  totalFriction: number;
  netProfit: number;
  returnPercent: number;
  profitFactor: number;
  maxDrawdownPercent: number;
  tradeCapital: number;
  ratio: string;
  normalizedR: number;
  trades: HFTrade[];
  equityCurve: { minute: number; time: number; equity: number }[];
}

/**
 * Runs a deterministic 1-minute high-frequency scalping backtest over real historical data.
 * Executes up to 1 trade per minute, factoring in exchange fees, spreads, and asymmetric risk/reward targets.
 */
export function runHighFrequencyBacktest(
  candles: Candle[],
  options: HFBacktestOptions = {}
): HFBacktestResult {
  const {
    tradeCapital = 2.0, // $2.00 per trade
    ratio = '1:2',
    baseStopPct = 0.01, // 1% stop loss distance
    feeRate = 0.001, // Binance 0.1% taker fee per side
    spreadRate = 0.0002, // 0.02% estimated bid/ask spread
    initialBalance = 2000.0,
    signalMethod = 'MOMENTUM_BAR',
  } = options;

  let totalBalance = initialBalance;
  let peakBalance = totalBalance;
  let maxDrawdown = 0;
  const trades: HFTrade[] = [];
  const equityCurve: { minute: number; time: number; equity: number }[] = [
    { minute: 0, time: candles[0]?.time || Date.now(), equity: totalBalance },
  ];

  // Parse risk:reward multiples
  let riskMul = 1;
  let rewardMul = 2;
  if (ratio.includes(':')) {
    const parts = ratio.split(':').map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[0] > 0) {
      riskMul = parts[0];
      rewardMul = parts[1];
    }
  }
  const normalizedR = rewardMul / riskMul; // e.g., 2 / 1 = 2R
  const targetProfitPct = baseStopPct * normalizedR; // e.g. 2% for 1:2
  const breakEvenWinRate = Number(((1 / (1 + normalizedR)) * 100).toFixed(1));

  // Precalculate EMA9 / EMA21 if EMA signal is used
  const closes = candles.map((c) => c.close);
  const emaFast: number[] = [];
  const emaSlow: number[] = [];
  if (signalMethod === 'EMA_MICRO') {
    let kFast = 2 / (9 + 1);
    let kSlow = 2 / (21 + 1);
    let prevFast = closes[0];
    let prevSlow = closes[0];
    for (let i = 0; i < closes.length; i++) {
      prevFast = i === 0 ? closes[i] : closes[i] * kFast + prevFast * (1 - kFast);
      prevSlow = i === 0 ? closes[i] : closes[i] * kSlow + prevSlow * (1 - kSlow);
      emaFast.push(prevFast);
      emaSlow.push(prevSlow);
    }
  }

  for (let i = 1; i < candles.length - 1; i++) {
    const currentBar = candles[i];
    const nextBar = candles[i + 1];

    // Determine signal using chosen market action (evaluated on bar i)
    let isBullishSignal = false;
    let isBearishSignal = false;

    if (signalMethod === 'EMA_MICRO') {
      isBullishSignal = (emaFast[i] || currentBar.close) > (emaSlow[i] || currentBar.close);
      isBearishSignal = !isBullishSignal;
    } else if (signalMethod === 'BOLLINGER_TOUCH') {
      // Mean reversion touch
      isBullishSignal = currentBar.close < currentBar.open && currentBar.low <= currentBar.close * 0.998;
      isBearishSignal = currentBar.close > currentBar.open && currentBar.high >= currentBar.close * 1.002;
    } else {
      // Default: Clean Momentum Bar (Bar close vs open)
      isBullishSignal = currentBar.close >= currentBar.open;
      isBearishSignal = !isBullishSignal;
    }

    // Eliminate look-ahead bias: entry executed on Open of next bar (i+1)
    const entryPrice = nextBar.open;
    let exitPrice = 0;
    let isWin = false;
    let exitReason: HFTrade['exitReason'] = 'BAR_CLOSE_TIMEOUT';

    if (isBullishSignal) {
      const takeProfitPrice = entryPrice * (1 + targetProfitPct);
      const stopLossPrice = entryPrice * (1 - baseStopPct);

      // Evaluate price action within the 1-minute execution bar (nextBar)
      // When one candle touches BOTH levels we cannot know which came first; assume the stop did (pessimistic).
      // Checking take-profit first inflated win rates.
      if (nextBar.low <= stopLossPrice) {
        exitPrice = stopLossPrice;
        isWin = false;
        exitReason = 'STOP_LOSS';
      } else if (nextBar.high >= takeProfitPrice) {
        exitPrice = takeProfitPrice;
        isWin = true;
        exitReason = 'TAKE_PROFIT';
      } else {
        // Did not reach target or stop; exit at 1-minute candle close
        exitPrice = nextBar.close;
        isWin = exitPrice > entryPrice;
      }
    } else {
      // Bearish signal logic (Short entry)
      const takeProfitPrice = entryPrice * (1 - targetProfitPct);
      const stopLossPrice = entryPrice * (1 + baseStopPct);

      if (nextBar.high >= stopLossPrice) {
        exitPrice = stopLossPrice;
        isWin = false;
        exitReason = 'STOP_LOSS';
      } else if (nextBar.low <= takeProfitPrice) {
        exitPrice = takeProfitPrice;
        isWin = true;
        exitReason = 'TAKE_PROFIT';
      } else {
        exitPrice = nextBar.close;
        isWin = exitPrice < entryPrice;
      }
    }

    // Gross PnL Calculation based on fixed trade capital ($2.00)
    const priceReturn = isBullishSignal
      ? (exitPrice - entryPrice) / entryPrice
      : (entryPrice - exitPrice) / entryPrice;

    const grossPnl = tradeCapital * priceReturn;

    // Real-World Friction Deductions
    const roundTripFee = tradeCapital * (feeRate * 2); // 0.1% entry + 0.1% exit
    const spreadCost = tradeCapital * spreadRate; // 0.02% bid/ask spread
    const netPnl = grossPnl - roundTripFee - spreadCost;

    totalBalance += netPnl;

    if (totalBalance > peakBalance) peakBalance = totalBalance;
    const dd = ((peakBalance - totalBalance) / peakBalance) * 100;
    if (dd > maxDrawdown) maxDrawdown = dd;

    trades.push({
      barIndex: i,
      minuteIndex: i,
      time: nextBar.time,
      side: isBullishSignal ? 'LONG' : 'SHORT',
      entryPrice: Number(entryPrice.toFixed(2)),
      exitPrice: Number(exitPrice.toFixed(2)),
      exitReason,
      isWin: netPnl > 0,
      grossPnl: Number(grossPnl.toFixed(4)),
      roundTripFee: Number(roundTripFee.toFixed(4)),
      spreadCost: Number(spreadCost.toFixed(4)),
      netPnl: Number(netPnl.toFixed(4)),
      runningBalance: Number(totalBalance.toFixed(2)),
    });

    // Sample equity curve every 10 bars or at end
    if (i % 10 === 0 || i === candles.length - 2) {
      equityCurve.push({
        minute: i,
        time: nextBar.time,
        equity: Number(totalBalance.toFixed(2)),
      });
    }
  }

  // Performance Statistics
  const wins = trades.filter((t) => t.netPnl > 0);
  const losses = trades.filter((t) => t.netPnl <= 0 && t.exitReason === 'STOP_LOSS');
  const timeouts = trades.filter((t) => t.exitReason === 'BAR_CLOSE_TIMEOUT');

  const winRate = trades.length > 0 ? Number(((wins.length / trades.length) * 100).toFixed(2)) : 0;
  const totalNetProfit = Number((totalBalance - initialBalance).toFixed(2));
  const totalGrossProfit = trades.reduce((sum, t) => sum + t.grossPnl, 0);
  const totalFeesPaid = Number((trades.length * (tradeCapital * (feeRate * 2))).toFixed(2));
  const totalSpreadCost = Number((trades.length * (tradeCapital * spreadRate)).toFixed(2));
  const totalFriction = Number((totalFeesPaid + totalSpreadCost).toFixed(2));

  const winningTradesPnL = wins.reduce((sum, t) => sum + t.netPnl, 0);
  const losingTradesPnL = Math.abs(trades.filter((t) => t.netPnl <= 0).reduce((sum, t) => sum + t.netPnl, 0));
  const profitFactor =
    losingTradesPnL === 0 ? Number(winningTradesPnL.toFixed(2)) : Number((winningTradesPnL / losingTradesPnL).toFixed(2));

  const returnPercent = Number((((totalBalance - initialBalance) / initialBalance) * 100).toFixed(2));

  return {
    timeframe: options.timeframe || '1h',
    totalTrades: trades.length,
    winningTrades: wins.length,
    losingTrades: losses.length,
    timeoutTrades: timeouts.length,
    winRate,
    breakEvenWinRate,
    initialBalance,
    finalBalance: Number(totalBalance.toFixed(2)),
    grossProfit: Number(totalGrossProfit.toFixed(2)),
    totalFeesPaid,
    totalSpreadCost,
    totalFriction,
    netProfit: totalNetProfit,
    returnPercent,
    profitFactor,
    maxDrawdownPercent: Number(maxDrawdown.toFixed(2)),
    tradeCapital,
    ratio,
    normalizedR,
    trades,
    equityCurve,
  };
}
