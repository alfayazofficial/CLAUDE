import { Candle, UTBotState, BollingerPercentBState, IndicatorBundle } from '../types/trading';

/**
 * Computes Exponential Moving Average array
 */
export function calculateEMA(data: number[], period: number): number[] {
  if (data.length === 0) return [];
  const k = 2 / (period + 1);
  const emaArray: number[] = new Array(data.length);
  
  // Start with simple average for first 'period' values
  let sum = 0;
  const firstCount = Math.min(period, data.length);
  for (let i = 0; i < firstCount; i++) {
    sum += data[i];
  }
  emaArray[firstCount - 1] = sum / firstCount;

  for (let i = 0; i < firstCount - 1; i++) {
    emaArray[i] = data[i];
  }

  for (let i = firstCount; i < data.length; i++) {
    emaArray[i] = data[i] * k + emaArray[i - 1] * (1 - k);
  }
  return emaArray;
}

/**
 * Computes Average True Range (ATR)
 */
export function calculateATR(candles: Candle[], period: number = 10): number[] {
  if (candles.length === 0) return [];
  const tr: number[] = new Array(candles.length);
  tr[0] = candles[0].high - candles[0].low;

  for (let i = 1; i < candles.length; i++) {
    const hl = candles[i].high - candles[i].low;
    const hc = Math.abs(candles[i].high - candles[i - 1].close);
    const lc = Math.abs(candles[i].low - candles[i - 1].close);
    tr[i] = Math.max(hl, hc, lc);
  }

  // Wilder's smoothing (RMA, alpha = 1/period) -- what TradingView's ta.atr and the UT Bot script use.
  // Early bars use an expanding mean so the series is never zero/undefined during warm-up.
  const atr: number[] = new Array(candles.length);
  let sum = 0;
  for (let i = 0; i < tr.length; i++) {
    if (i < period) {
      sum += tr[i];
      atr[i] = sum / (i + 1);
    } else {
      atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period;
    }
  }
  return atr;
}

/**
 * UT Bot Study
 * Sensitivity (key value, default 1 or 2)
 * ATR Period (default 10)
 * Uses ATR Trailing Stop algorithm
 */
export function calculateUTBot(
  candles: Candle[],
  keyValue: number = 1,
  atrPeriod: number = 10
): { trailingStops: number[]; states: UTBotState[] } {
  const atr = calculateATR(candles, atrPeriod);
  const trailingStops: number[] = new Array(candles.length).fill(0);
  const states: UTBotState[] = [];

  let prevTrailing = candles[0]?.close ?? 0;
  let prevPos = 0; // 1 = long, -1 = short

  for (let i = 0; i < candles.length; i++) {
    const close = candles[i].close;
    const nLoss = keyValue * (atr[i] || (close * 0.01));

    const prevClose = i > 0 ? candles[i - 1].close : close;
    let trailingStop: number;
    if (close > prevTrailing && prevClose > prevTrailing) {
      trailingStop = Math.max(prevTrailing, close - nLoss); // trend up: ratchet up only
    } else if (close < prevTrailing && prevClose < prevTrailing) {
      trailingStop = Math.min(prevTrailing, close + nLoss); // trend down: ratchet down only
    } else if (close > prevTrailing) {
      trailingStop = close - nLoss; // just flipped up: re-anchor below price (was left stuck at the old stop)
    } else {
      trailingStop = close + nLoss; // just flipped down: re-anchor above price
    }

    let pos = prevPos;
    let isBuyTrigger = false;
    let isSellTrigger = false;

    if (close > prevTrailing && (i > 0 ? candles[i - 1].close <= prevTrailing : true)) {
      pos = 1;
      isBuyTrigger = true;
    } else if (close < prevTrailing && (i > 0 ? candles[i - 1].close >= prevTrailing : true)) {
      pos = -1;
      isSellTrigger = true;
    }

    trailingStops[i] = trailingStop;
    prevTrailing = trailingStop;
    prevPos = pos;

    states.push({
      trailingStop,
      signal: pos === 1 ? 'BUY' : pos === -1 ? 'SELL' : 'HOLD',
      isBuyTrigger,
      isSellTrigger,
      sensitivity: keyValue,
      atrPeriod,
      lastClose: close,
    });
  }

  return { trailingStops, states };
}

/**
 * Bollinger Bands & %B Study
 * Period: 20, Multiplier: 2.0
 * %B = (Price - Lower) / (Upper - Lower)
 */
export function calculateBollingerBands(
  candles: Candle[],
  period: number = 20,
  stdDevMultiplier: number = 2.0
): BollingerPercentBState {
  if (candles.length < 2) {
    const c = candles[0]?.close ?? 100;
    return { basis: c, upper: c * 1.02, lower: c * 0.98, percentB: 0.5, bandwidth: 0.04, signal: 'NEUTRAL' };
  }

  const windowCandles = candles.slice(-period);
  const closes = windowCandles.map((c) => c.close);
  const n = closes.length;
  
  const sum = closes.reduce((a, b) => a + b, 0);
  const sma = sum / n;

  const variance = closes.reduce((acc, val) => acc + Math.pow(val - sma, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  const upper = sma + stdDevMultiplier * stdDev;
  const lower = sma - stdDevMultiplier * stdDev;
  const currentClose = closes[closes.length - 1];

  const range = upper - lower;
  const percentB = range === 0 ? 0.5 : (currentClose - lower) / range;
  const bandwidth = sma === 0 ? 0 : range / sma;

  let signal: 'OVERBOUGHT' | 'OVERSOLD' | 'NEUTRAL' = 'NEUTRAL';
  if (percentB >= 1.0) signal = 'OVERBOUGHT';
  else if (percentB <= 0.0) signal = 'OVERSOLD';

  return {
    basis: sma,
    upper,
    lower,
    percentB,
    bandwidth,
    signal,
  };
}

/**
 * Relative Strength Index (RSI 14)
 */
export function calculateRSI(candles: Candle[], period: number = 14): number {
  if (candles.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff >= 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(diff)) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * Bundle all indicator calculations for a candle series
 */
export function calculateIndicatorBundle(candles: Candle[]): IndicatorBundle {
  const closes = candles.map((c) => c.close);
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  const ema200 = calculateEMA(closes, 200);
  const atrList = calculateATR(candles, 14);
  const { states } = calculateUTBot(candles, 1.5, 10);
  const bollinger = calculateBollingerBands(candles, 20, 2.0);
  const rsi = calculateRSI(candles, 14);

  return {
    candles,
    utBot: states[states.length - 1] || {
      trailingStop: candles[candles.length - 1]?.close ?? 0,
      signal: 'HOLD',
      isBuyTrigger: false,
      isSellTrigger: false,
      sensitivity: 1.5,
      atrPeriod: 10,
      lastClose: candles[candles.length - 1]?.close ?? 0,
    },
    bollinger,
    rsi,
    ema20: ema20[ema20.length - 1] ?? (closes[closes.length - 1] || 0),
    ema50: ema50[ema50.length - 1] ?? (closes[closes.length - 1] || 0),
    ema200: ema200[ema200.length - 1] ?? (closes[closes.length - 1] || 0),
    atr: atrList[atrList.length - 1] ?? (closes[closes.length - 1] * 0.01),
  };
}
