import {
  Candle,
  CompositeForecast,
  ForecastDirection,
  MarketSymbol,
  MultiTimeframeMatrix,
} from '../types/trading';
import {
  calculateBollingerBands,
  calculateEMA,
  calculateRSI,
  calculateUTBot,
} from './indicators';

export function computeCompositeForecast(
  symbol: MarketSymbol,
  candles: Candle[]
): CompositeForecast {
  if (candles.length < 20) {
    return {
      symbol,
      score: 0,
      conviction: 0,
      direction: 'NEUTRAL',
      utBotSignal: 'HOLD',
      percentB: 0.5,
      rsi: 50,
      volatilityScore: 0,
      momentumScore: 0,
      multiTimeframe: {
        '1m': 'NEUTRAL',
        '5m': 'NEUTRAL',
        '15m': 'NEUTRAL',
        '1h': 'NEUTRAL',
        '4h': 'NEUTRAL',
        '1D': 'NEUTRAL',
      },
      suggestedStopLoss: candles[candles.length - 1]?.close * 0.98 || 0,
      suggestedTakeProfit: candles[candles.length - 1]?.close * 1.04 || 0,
      riskRewardRatio: 2.0,
      timestamp: Date.now(),
    };
  }

  const closes = candles.map((c) => c.close);
  const currentPrice = closes[closes.length - 1];

  // 1. UT Bot Component (-35 to +35)
  const { states } = calculateUTBot(candles, 1.5, 10);
  const utState = states[states.length - 1];
  let utScore = 0;
  if (utState.signal === 'BUY') {
    utScore = utState.isBuyTrigger ? 35 : 25;
  } else if (utState.signal === 'SELL') {
    utScore = utState.isSellTrigger ? -35 : -25;
  }

  // 2. Bollinger %B Component (-25 to +25)
  const bb = calculateBollingerBands(candles, 20, 2.0);
  let bbScore = 0;
  // %B around 0.5 is neutral. %B < 0.2 indicates oversold / dip buy zone. %B > 0.8 indicates overbought / high band test.
  // In Orion model, if %B is between 0.5 and 0.9 in an uptrend, it's strong bullish (+15 to +25)
  if (bb.percentB > 0.5 && bb.percentB <= 0.85) {
    bbScore = 20; // Healthy bullish expansion
  } else if (bb.percentB > 0.85 && bb.percentB <= 1.05) {
    bbScore = 10; // High momentum, approaching overbought
  } else if (bb.percentB > 1.05) {
    bbScore = -15; // Mean reversion sell risk
  } else if (bb.percentB < 0.5 && bb.percentB >= 0.15) {
    bbScore = -20; // Bearish compression
  } else if (bb.percentB < 0.15) {
    bbScore = 15; // Oversold spring setup
  }

  // 3. EMA Trend Structure (-20 to +20)
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  const curEma20 = ema20[ema20.length - 1];
  const curEma50 = ema50[ema50.length - 1];

  let emaScore = 0;
  if (currentPrice > curEma20 && curEma20 > curEma50) {
    emaScore = 20; // Bullish golden stacked
  } else if (currentPrice < curEma20 && curEma20 < curEma50) {
    emaScore = -20; // Bearish stacked
  } else if (currentPrice > curEma20) {
    emaScore = 8;
  } else {
    emaScore = -8;
  }

  // 4. RSI & Momentum (-15 to +15)
  const rsi = calculateRSI(candles, 14);
  let rsiScore = 0;
  if (rsi >= 55 && rsi <= 70) {
    rsiScore = 15; // Strong bullish momentum without extreme exhaustion
  } else if (rsi > 70) {
    rsiScore = 5; // Overbought caution
  } else if (rsi <= 45 && rsi >= 30) {
    rsiScore = -15; // Strong bearish drift
  } else if (rsi < 30) {
    rsiScore = -5; // Oversold bounce risk
  } else {
    rsiScore = 0;
  }

  // 5. Volume Volatility confirmation (-5 to +5)
  const recentVol = candles.slice(-5).reduce((s, c) => s + c.volume, 0) / 5;
  const prevVol = candles.slice(-20, -5).reduce((s, c) => s + c.volume, 0) / 15 || 1;
  const volRatio = recentVol / prevVol;
  let volScore = 0;
  if (volRatio > 1.2) {
    volScore = utScore > 0 ? 5 : -5;
  }

  // Raw aggregate score
  const totalScore = Math.max(-100, Math.min(100, Math.round(utScore + bbScore + emaScore + rsiScore + volScore)));
  const conviction = Math.abs(totalScore);

  let direction: ForecastDirection = 'NEUTRAL';
  if (totalScore >= 60) direction = 'STRONG_BUY';
  else if (totalScore >= 25) direction = 'BUY';
  else if (totalScore <= -60) direction = 'STRONG_SELL';
  else if (totalScore <= -25) direction = 'SELL';
  else direction = 'NEUTRAL';

  // Multi-timeframe synthesis (simulated matrix based on sub-slices and momentum)
  const getSubDir = (offset: number): 'BULL' | 'BEAR' | 'NEUTRAL' => {
    const subCloses = closes.slice(-offset);
    if (subCloses.length < 2) return 'NEUTRAL';
    const delta = subCloses[subCloses.length - 1] - subCloses[0];
    if (delta > 0.002 * currentPrice) return 'BULL';
    if (delta < -0.002 * currentPrice) return 'BEAR';
    return 'NEUTRAL';
  };

  const multiTimeframe: MultiTimeframeMatrix = {
    '1m': getSubDir(5),
    '5m': getSubDir(12),
    '15m': totalScore > 15 ? 'BULL' : totalScore < -15 ? 'BEAR' : 'NEUTRAL',
    '1h': curEma20 > curEma50 ? 'BULL' : 'BEAR',
    '4h': totalScore > 0 ? 'BULL' : 'BEAR',
    '1D': totalScore > 30 ? 'BULL' : totalScore < -30 ? 'BEAR' : 'NEUTRAL',
  };

  // Dynamic Stop Loss and Take Profit
  // Use UT Bot trailing stop or dynamic ATR boundary
  let stopLoss: number;
  let takeProfit: number;
  const atrDist = Math.max(currentPrice * 0.015, Math.abs(currentPrice - utState.trailingStop));

  if (direction === 'STRONG_BUY' || direction === 'BUY') {
    stopLoss = Math.min(currentPrice * 0.985, utState.trailingStop || currentPrice - atrDist);
    takeProfit = currentPrice + (currentPrice - stopLoss) * 2.2;
  } else if (direction === 'STRONG_SELL' || direction === 'SELL') {
    stopLoss = Math.max(currentPrice * 1.015, utState.trailingStop || currentPrice + atrDist);
    takeProfit = currentPrice - (stopLoss - currentPrice) * 2.2;
  } else {
    stopLoss = currentPrice * 0.98;
    takeProfit = currentPrice * 1.03;
  }

  const riskDist = Math.abs(currentPrice - stopLoss);
  const rewardDist = Math.abs(takeProfit - currentPrice);
  const riskRewardRatio = riskDist > 0 ? Number((rewardDist / riskDist).toFixed(2)) : 2.0;

  return {
    symbol,
    score: totalScore,
    conviction,
    direction,
    utBotSignal: utState.signal,
    percentB: Number(bb.percentB.toFixed(3)),
    rsi: Number(rsi.toFixed(1)),
    volatilityScore: Number((bb.bandwidth * 100).toFixed(2)),
    momentumScore: Number(rsiScore.toFixed(0)),
    multiTimeframe,
    suggestedStopLoss: Number(stopLoss.toFixed(2)),
    suggestedTakeProfit: Number(takeProfit.toFixed(2)),
    riskRewardRatio,
    timestamp: Date.now(),
  };
}
