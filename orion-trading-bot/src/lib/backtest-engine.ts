import { BacktestRequirements, Candle, MarketSymbol } from '../types/trading';
import { calculateBollingerBands, calculateEMA, calculateRSI, calculateUTBot } from './indicators';

export interface BacktestTrade {
  entryIndex: number;
  entryTime: number;
  exitIndex: number;
  exitTime: number;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  size: number;
  grossPnL: number;
  netPnL: number;
  returnPercent: number;
  reason: 'SIGNAL_REVERSAL' | 'STOP_LOSS' | 'TAKE_PROFIT' | 'TRAILING_STOP' | 'END_OF_DATA';
}

export interface BacktestResult {
  requirements: BacktestRequirements;
  initialCapital: number;
  finalCapital: number;
  totalReturnPercent: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  maxDrawdownPercent: number;
  sharpeRatio: number;
  expectancyRatio: number;
  equityCurve: { time: number; equity: number }[];
  trades: BacktestTrade[];
}

export function runBacktestWithRequirements(
  candles: Candle[],
  req: BacktestRequirements
): BacktestResult {
  // NOTE: the old code silently replaced short *real* data with a random walk and still reported the result
  // as if it were real. We now test exactly the candles supplied and refuse to run on too little data.
  if (candles.length < 60) {
    throw new Error(`Not enough candles to backtest (${candles.length}). Need at least 60.`);
  }

  const { states } = calculateUTBot(candles, req.utSensitivity, req.atrPeriod);
  const closes = candles.map((c) => c.close);
  const ema50 = calculateEMA(closes, 50);

  let capital = req.initialCapital;
  let peakCapital = capital;
  let maxDrawdown = 0;
  const equityCurve: { time: number; equity: number }[] = [
    { time: candles[0].time, equity: capital },
  ];

  const trades: BacktestTrade[] = [];
  let openTrade: {
    entryIndex: number;
    entryTime: number;
    side: 'LONG' | 'SHORT';
    entryPrice: number;
    size: number;
    stopLoss: number;
    takeProfit: number;
    highestPriceSinceEntry: number;
    lowestPriceSinceEntry: number;
  } | null = null;

  const slippageFraction = req.slippageBps / 10000;
  const feeFraction = req.feeBps / 10000;

  for (let i = 25; i < candles.length; i++) {
    const candle = candles[i];
    const utState = states[i];
    const subCandles = candles.slice(0, i + 1);
    const bb = calculateBollingerBands(subCandles, 20, 2.0);
    const rsi = calculateRSI(subCandles, 14);
    const curEma50 = ema50[i] || candle.close;

    // If an open trade exists, check exit conditions
    if (openTrade) {
      if (openTrade.side === 'LONG') {
        openTrade.highestPriceSinceEntry = Math.max(openTrade.highestPriceSinceEntry, candle.high);
      } else {
        openTrade.lowestPriceSinceEntry = Math.min(openTrade.lowestPriceSinceEntry, candle.low);
      }

      let exitPrice: number | null = null;
      let exitReason: BacktestTrade['reason'] | null = null;

      if (openTrade.side === 'LONG') {
        // Trailing stop trigger
        if (req.enableTrailingStop && utState.trailingStop > openTrade.stopLoss) {
          openTrade.stopLoss = utState.trailingStop;
        }

        if (candle.low <= openTrade.stopLoss) {
          exitPrice = openTrade.stopLoss * (1 - slippageFraction);
          exitReason = 'STOP_LOSS';
        } else if (candle.high >= openTrade.takeProfit) {
          exitPrice = openTrade.takeProfit * (1 - slippageFraction);
          exitReason = 'TAKE_PROFIT';
        } else if (utState.isSellTrigger) {
          exitPrice = candle.close * (1 - slippageFraction);
          exitReason = 'SIGNAL_REVERSAL';
        }
      } else {
        // Short position
        if (req.enableTrailingStop && utState.trailingStop < openTrade.stopLoss) {
          openTrade.stopLoss = utState.trailingStop;
        }

        if (candle.high >= openTrade.stopLoss) {
          exitPrice = openTrade.stopLoss * (1 + slippageFraction);
          exitReason = 'STOP_LOSS';
        } else if (candle.low <= openTrade.takeProfit) {
          exitPrice = openTrade.takeProfit * (1 + slippageFraction);
          exitReason = 'TAKE_PROFIT';
        } else if (utState.isBuyTrigger) {
          exitPrice = candle.close * (1 + slippageFraction);
          exitReason = 'SIGNAL_REVERSAL';
        }
      }

      if (exitPrice !== null && exitReason !== null) {
        const pnlMultiplier = openTrade.side === 'LONG' ? 1 : -1;
        const grossPnL = (exitPrice - openTrade.entryPrice) * openTrade.size * pnlMultiplier;
        const totalFee = (openTrade.entryPrice + exitPrice) * openTrade.size * feeFraction;
        const netPnL = grossPnL - totalFee;

        capital += netPnL;
        if (capital > peakCapital) peakCapital = capital;
        const dd = ((peakCapital - capital) / peakCapital) * 100;
        if (dd > maxDrawdown) maxDrawdown = dd;

        trades.push({
          entryIndex: openTrade.entryIndex,
          entryTime: openTrade.entryTime,
          exitIndex: i,
          exitTime: candle.time,
          side: openTrade.side,
          entryPrice: Number(openTrade.entryPrice.toFixed(2)),
          exitPrice: Number(exitPrice.toFixed(2)),
          size: openTrade.size,
          grossPnL: Number(grossPnL.toFixed(2)),
          netPnL: Number(netPnL.toFixed(2)),
          returnPercent: Number(((netPnL / (openTrade.entryPrice * openTrade.size)) * 100).toFixed(2)),
          reason: exitReason,
        });

        openTrade = null;
      }
    }

    // Check entry signals if no active trade
    if (!openTrade) {
      let triggerSide: 'LONG' | 'SHORT' | null = null;

      // Long Trigger Check
      if (utState.isBuyTrigger) {
        let pass = true;

        // %B filter requirement
        if (req.enablePercentBFilter && bb.percentB > req.percentBUpperCutoff) {
          pass = false;
        }

        // EMA Trend filter requirement
        if (req.enableEMATrendFilter && candle.close < curEma50) {
          pass = false;
        }

        // RSI Guard requirement
        if (req.enableRSIGuard && rsi > req.rsiOverbought) {
          pass = false;
        }

        if (pass) triggerSide = 'LONG';
      }
      // Short Trigger Check
      else if (utState.isSellTrigger) {
        let pass = true;

        if (req.enablePercentBFilter && bb.percentB < req.percentBLowerCutoff) {
          pass = false;
        }

        if (req.enableEMATrendFilter && candle.close > curEma50) {
          pass = false;
        }

        if (req.enableRSIGuard && rsi < req.rsiOversold) {
          pass = false;
        }

        if (pass) triggerSide = 'SHORT';
      }

      if (triggerSide) {
        const entryPrice =
          triggerSide === 'LONG'
            ? candle.close * (1 + slippageFraction)
            : candle.close * (1 - slippageFraction);

        const allocation = (capital * req.positionSizePercent * (req.leverage || 1)) / 100;
        const size = Number((allocation / entryPrice).toFixed(4));

        if (size > 0) {
          const stopDist = entryPrice * (req.stopLossPercent / 100);
          const tpDist = entryPrice * (req.takeProfitPercent / 100);

          openTrade = {
            entryIndex: i,
            entryTime: candle.time,
            side: triggerSide,
            entryPrice,
            size,
            stopLoss: triggerSide === 'LONG' ? entryPrice - stopDist : entryPrice + stopDist,
            takeProfit: triggerSide === 'LONG' ? entryPrice + tpDist : entryPrice - tpDist,
            highestPriceSinceEntry: candle.high,
            lowestPriceSinceEntry: candle.low,
          };
        }
      }
    }

    equityCurve.push({
      time: candle.time,
      equity: Number(capital.toFixed(2)),
    });
  }

  // Close open trade at final bar
  if (openTrade) {
    const lastCandle = candles[candles.length - 1];
    const exitPrice = lastCandle.close;
    const pnlMultiplier = openTrade.side === 'LONG' ? 1 : -1;
    const grossPnL = (exitPrice - openTrade.entryPrice) * openTrade.size * pnlMultiplier;
    const totalFee = (openTrade.entryPrice + exitPrice) * openTrade.size * feeFraction;
    const netPnL = grossPnL - totalFee;
    capital += netPnL;
    if (capital > peakCapital) peakCapital = capital;
    const finalDd = ((peakCapital - capital) / peakCapital) * 100;
    if (finalDd > maxDrawdown) maxDrawdown = finalDd;
    equityCurve.push({ time: lastCandle.time, equity: Number(capital.toFixed(2)) });

    trades.push({
      entryIndex: openTrade.entryIndex,
      entryTime: openTrade.entryTime,
      exitIndex: candles.length - 1,
      exitTime: lastCandle.time,
      side: openTrade.side,
      entryPrice: Number(openTrade.entryPrice.toFixed(2)),
      exitPrice: Number(exitPrice.toFixed(2)),
      size: openTrade.size,
      grossPnL: Number(grossPnL.toFixed(2)),
      netPnL: Number(netPnL.toFixed(2)),
      returnPercent: Number(((netPnL / (openTrade.entryPrice * openTrade.size)) * 100).toFixed(2)),
      reason: 'END_OF_DATA',
    });
  }

  const winning = trades.filter((t) => t.netPnL > 0);
  const losing = trades.filter((t) => t.netPnL <= 0);
  const totalTrades = trades.length;
  const winRate = totalTrades > 0 ? Number(((winning.length / totalTrades) * 100).toFixed(1)) : 0;

  const totalGrossProfit = winning.reduce((s, t) => s + t.netPnL, 0);
  const totalGrossLoss = Math.abs(losing.reduce((s, t) => s + t.netPnL, 0));
  // With zero losing trades the ratio is undefined; report a capped 99.99 instead of the raw profit amount.
  const profitFactor =
    totalGrossLoss === 0
      ? totalGrossProfit > 0 ? 99.99 : 0
      : Number(Math.min(99.99, totalGrossProfit / totalGrossLoss).toFixed(2));

  const totalReturnPercent = Number(
    (((capital - req.initialCapital) / req.initialCapital) * 100).toFixed(2)
  );

  // Sharpe from per-bar equity returns, annualised by how many bars fit in a year for this timeframe.
  // (Before: per-TRADE returns x sqrt(252), which has no meaning for intraday strategies.)
  const BARS_PER_YEAR: Record<string, number> = { '1m': 525600, '5m': 105120, '15m': 35040, '1h': 8760, '4h': 2190, '1D': 365 };
  const barReturns: number[] = [];
  for (let k = 1; k < equityCurve.length; k++) {
    const prevEq = equityCurve[k - 1].equity;
    if (prevEq > 0) barReturns.push(equityCurve[k].equity / prevEq - 1);
  }
  const meanBar = barReturns.length ? barReturns.reduce((a, b) => a + b, 0) / barReturns.length : 0;
  const varBar = barReturns.length ? barReturns.reduce((a, r) => a + (r - meanBar) ** 2, 0) / barReturns.length : 0;
  const stdBar = Math.sqrt(varBar);
  const sharpeRatio = stdBar > 0 ? Number(((meanBar / stdBar) * Math.sqrt(BARS_PER_YEAR[req.timeframe] || 8760)).toFixed(2)) : 0;

  const avgWin = winning.length > 0 ? totalGrossProfit / winning.length : 0;
  const avgLoss = losing.length > 0 ? totalGrossLoss / losing.length : 0;
  const expectancy = totalTrades > 0 ? (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss : 0;

  return {
    requirements: req,
    initialCapital: req.initialCapital,
    finalCapital: Number(capital.toFixed(2)),
    totalReturnPercent,
    totalTrades,
    winningTrades: winning.length,
    losingTrades: losing.length,
    winRate,
    profitFactor,
    maxDrawdownPercent: Number(maxDrawdown.toFixed(2)),
    sharpeRatio,
    expectancyRatio: Number(expectancy.toFixed(2)),
    equityCurve,
    trades,
  };
}
