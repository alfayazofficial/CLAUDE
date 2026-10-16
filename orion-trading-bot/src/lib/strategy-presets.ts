export interface StrategyPreset {
  id: string;
  name: string;
  badge: string;
  tagline: string;
  philosophy: string;
  edge: string;
  recommendedTimeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1D';
  historicalWindow: '7D' | '14D' | '30D' | '90D' | '180D' | '1Y';
  requirements: {
    utSensitivity: number;
    atrPeriod: number;
    enablePercentBFilter: boolean;
    percentBUpperCutoff: number;
    percentBLowerCutoff: number;
    enableEMATrendFilter: boolean;
    enableRSIGuard: boolean;
    rsiOverbought: number;
    rsiOversold: number;
    enableMultiTimeframeConfirm: boolean;
    stopLossPercent: number;
    takeProfitPercent: number;
    enableTrailingStop: boolean;
    positionSizePercent: number;
    leverage: number;
    slippageBps: number;
    feeBps: number;
  };
}

export const STRATEGY_PRESETS: StrategyPreset[] = [
  {
    id: 'TREND_SURFER',
    name: 'Orion UT Bot Trend Surfer',
    badge: 'TREND FOLLOWING',
    tagline: 'Multi-week momentum breakouts with dynamic ATR trailing stops',
    philosophy:
      'Aligns with prevailing institutional directional flows. Uses UT Bot ATR trailing stops combined with 50-EMA filter to ride strong trend expansions while cutting false breaks immediately.',
    edge: 'High reward-to-risk ratio (2.5R+). Lets winners run while trailing stop ratchets up.',
    recommendedTimeframe: '1h',
    historicalWindow: '90D',
    requirements: {
      utSensitivity: 1.5,
      atrPeriod: 10,
      enablePercentBFilter: false,
      percentBUpperCutoff: 0.9,
      percentBLowerCutoff: 0.1,
      enableEMATrendFilter: true,
      enableRSIGuard: false,
      rsiOverbought: 75,
      rsiOversold: 25,
      enableMultiTimeframeConfirm: true,
      stopLossPercent: 2.2,
      takeProfitPercent: 6.0,
      enableTrailingStop: true,
      positionSizePercent: 15,
      leverage: 1,
      slippageBps: 5,
      feeBps: 6,
    },
  },
  {
    id: 'PERCENT_B_REVERSION',
    name: 'Bollinger %B Mean Reversion',
    badge: 'MEAN REVERSION',
    tagline: 'Statistical extremes: Buys deep oversold dips, sells overbought blowoffs',
    philosophy:
      'Capitalizes on mathematical exhaustion at Bollinger Band bands. Triggers long entries when %B drops below 0.15 with RSI < 32 (capitulation bottom), and takes profit as price reverts to the mean 20-SMA basis.',
    edge: 'High win rate (65%+ in consolidating/ranging markets). Low drawdown.',
    recommendedTimeframe: '15m',
    historicalWindow: '30D',
    requirements: {
      utSensitivity: 2.0,
      atrPeriod: 14,
      enablePercentBFilter: true,
      percentBUpperCutoff: 0.85,
      percentBLowerCutoff: 0.15,
      enableEMATrendFilter: false,
      enableRSIGuard: true,
      rsiOverbought: 68,
      rsiOversold: 32,
      enableMultiTimeframeConfirm: false,
      stopLossPercent: 1.8,
      takeProfitPercent: 3.6,
      enableTrailingStop: false,
      positionSizePercent: 20,
      leverage: 1,
      slippageBps: 4,
      feeBps: 6,
    },
  },
  {
    id: 'HIGH_FREQUENCY_SCALP',
    name: 'Institutional Scalper (High-Frequency)',
    badge: 'SCALPING',
    tagline: 'Tight 1m - 5m rapid execution with micro ATR trailing stops',
    philosophy:
      'Engineered for rapid intraday momentum bursts. Exploits short-term liquidity imbalances using low sensitivity UT Bot triggers with strict slippage bounds.',
    edge: 'Rapid turnover, high trade frequency, minimal overnight gap risk.',
    recommendedTimeframe: '5m',
    historicalWindow: '14D',
    requirements: {
      utSensitivity: 0.8,
      atrPeriod: 7,
      enablePercentBFilter: true,
      percentBUpperCutoff: 0.80,
      percentBLowerCutoff: 0.20,
      enableEMATrendFilter: true,
      enableRSIGuard: true,
      rsiOverbought: 65,
      rsiOversold: 35,
      enableMultiTimeframeConfirm: true,
      stopLossPercent: 0.9,
      takeProfitPercent: 1.8,
      enableTrailingStop: true,
      positionSizePercent: 10,
      leverage: 1,
      slippageBps: 3,
      feeBps: 6,
    },
  },
  {
    id: 'MACRO_SWING',
    name: 'Golden Cross Macro Swing (4h - 1D)',
    badge: 'SWING POSITION',
    tagline: 'Patient macro trend positioning for large market cycle moves',
    philosophy:
      'Filters out day-to-day market noise. Operates exclusively on 4h and Daily candles with wide ATR trailing stops to capture hundreds of percent in multi-month bull/bear runs.',
    edge: 'Low commission drag, maximum trend capture, high total expectancy.',
    recommendedTimeframe: '4h',
    historicalWindow: '180D',
    requirements: {
      utSensitivity: 2.5,
      atrPeriod: 14,
      enablePercentBFilter: true,
      percentBUpperCutoff: 0.92,
      percentBLowerCutoff: 0.08,
      enableEMATrendFilter: true,
      enableRSIGuard: true,
      rsiOverbought: 72,
      rsiOversold: 28,
      enableMultiTimeframeConfirm: true,
      stopLossPercent: 3.5,
      takeProfitPercent: 9.5,
      enableTrailingStop: true,
      positionSizePercent: 25,
      leverage: 1,
      slippageBps: 6,
      feeBps: 6,
    },
  },
  {
    id: 'VOLATILITY_BREAKOUT',
    name: 'Bollinger Band Squeeze Breakout',
    badge: 'VOLATILITY EXPANSION',
    tagline: 'Detects volatility compression squeezes and rides explosive surges',
    philosophy:
      'Identifies periods where Bollinger Bandwidth contracts to multi-week lows, then triggers immediate execution as price bursts out of the channel with surging volume.',
    edge: 'Catches the start of massive momentum surges with asymmetric 3:1 R:R.',
    recommendedTimeframe: '15m',
    historicalWindow: '60D' as any,
    requirements: {
      utSensitivity: 1.2,
      atrPeriod: 10,
      enablePercentBFilter: true,
      percentBUpperCutoff: 0.95,
      percentBLowerCutoff: 0.05,
      enableEMATrendFilter: true,
      enableRSIGuard: false,
      rsiOverbought: 75,
      rsiOversold: 25,
      enableMultiTimeframeConfirm: false,
      stopLossPercent: 1.6,
      takeProfitPercent: 4.8,
      enableTrailingStop: true,
      positionSizePercent: 15,
      leverage: 1,
      slippageBps: 5,
      feeBps: 6,
    },
  },
  {
    id: 'CUSTOM_SANDBOX',
    name: 'Custom Algorithmic Sandbox',
    badge: 'CUSTOM BUILDER',
    tagline: 'Full manual control to engineer and test your own proprietary rules',
    philosophy: 'Customize every indicator threshold, risk parameter, and execution rule freely.',
    edge: 'Bespoke strategy development tuned to specific market niches.',
    recommendedTimeframe: '15m',
    historicalWindow: '30D',
    requirements: {
      utSensitivity: 1.5,
      atrPeriod: 10,
      enablePercentBFilter: true,
      percentBUpperCutoff: 0.85,
      percentBLowerCutoff: 0.15,
      enableEMATrendFilter: true,
      enableRSIGuard: true,
      rsiOverbought: 70,
      rsiOversold: 30,
      enableMultiTimeframeConfirm: false,
      stopLossPercent: 2.0,
      takeProfitPercent: 4.5,
      enableTrailingStop: true,
      positionSizePercent: 15,
      leverage: 1,
      slippageBps: 5,
      feeBps: 6,
    },
  },
];
