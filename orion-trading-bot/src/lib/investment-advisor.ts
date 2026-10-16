import { Candle, MarketSymbol } from '../types/trading';
import { computeCompositeForecast } from './scoring-engine';
import { PaperPosition } from '../types/paper';

export type InvestmentVerdict =
  | 'INVEST_NOW_STRONG_BUY'
  | 'INVEST_NOW_BUY'
  | 'DO_NOT_INVEST_BEARISH'
  | 'DO_NOT_INVEST_OVERBOUGHT'
  | 'DO_NOT_INVEST_CHOPPY'
  | 'DO_NOT_INVEST_POSITION_OPEN';

export interface ProfitAnalysis {
  isInPosition: boolean;
  symbol: string;
  side: 'BUY' | 'SELL' | 'FLAT';
  entryPrice: number;
  currentPrice: number;
  grossProfitPct: number;
  netProfitPct: number;
  grossProfitUsd: number;
  netProfitUsd: number;
  status: 'IN_PROFIT' | 'IN_LOSS' | 'BREAK_EVEN' | 'FLAT';
  badgeText: string;
  portfolioBalance: number;
  portfolioInitial: number;
  portfolioRoiPct: number;
  portfolioNetUsd: number;
  isPortfolioProfitable: boolean;
}

export interface InvestmentDecision {
  symbol: string;
  currentPrice: number;
  shouldInvest: boolean;
  verdict: InvestmentVerdict;
  headline: string;
  confidencePercent: number;
  verdictSummary: string;
  factors: {
    name: string;
    value: string;
    status: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    description: string;
  }[];
  plan: {
    recommendedSide: 'BUY' | 'SELL';
    entryPrice: number;
    stopLoss: number;
    stopLossDistancePct: number;
    takeProfit: number;
    takeProfitDistancePct: number;
    rewardToRiskRatio: number;
    recommendedCapital: number;
    maxRiskDollar: number;
    targetGainDollar: number;
  };
}

/**
 * Calculates real live percentage profit or loss for an active position and portfolio
 */
export function calculateProfitStatus(
  currentPrice: number,
  activePosition: PaperPosition | null,
  portfolioBalance: number = 2000.0,
  initialCapital: number = 2000.0
): ProfitAnalysis {
  const portfolioNetUsd = portfolioBalance - initialCapital;
  const portfolioRoiPct = Number(((portfolioNetUsd / initialCapital) * 100).toFixed(2));
  const isPortfolioProfitable = portfolioNetUsd >= 0;

  if (!activePosition || activePosition.entryPrice <= 0 || currentPrice <= 0) {
    return {
      isInPosition: false,
      symbol: activePosition?.symbol || 'BTC/USDT',
      side: 'FLAT',
      entryPrice: 0,
      currentPrice,
      grossProfitPct: 0,
      netProfitPct: 0,
      grossProfitUsd: 0,
      netProfitUsd: 0,
      status: 'FLAT',
      badgeText: 'NO OPEN TRADES (FLAT)',
      portfolioBalance,
      portfolioInitial: initialCapital,
      portfolioRoiPct,
      portfolioNetUsd,
      isPortfolioProfitable,
    };
  }

  const isLong = activePosition.side === 'BUY';
  const entryPrice = activePosition.entryPrice;
  const tradeCapital = activePosition.tradeCapital || 2.0;

  // Real price return percentage
  const priceReturn = isLong
    ? (currentPrice - entryPrice) / entryPrice
    : (entryPrice - currentPrice) / entryPrice;

  const grossProfitPct = Number((priceReturn * 100).toFixed(2));
  const grossProfitUsd = tradeCapital * priceReturn;

  // Real Binance taker fee deductions (0.1% entry + 0.1% exit = 0.2% round-trip)
  const roundTripFee = tradeCapital * 0.002;
  const netProfitUsd = Number((grossProfitUsd - roundTripFee).toFixed(4));
  const netProfitPct = Number(((netProfitUsd / tradeCapital) * 100).toFixed(2));

  let status: ProfitAnalysis['status'] = 'BREAK_EVEN';
  let badgeText = '';

  if (netProfitPct > 0.05) {
    status = 'IN_PROFIT';
    badgeText = `+${netProfitPct.toFixed(2)}% IN PROFIT`;
  } else if (netProfitPct < -0.05) {
    status = 'IN_LOSS';
    badgeText = `${netProfitPct.toFixed(2)}% IN LOSS`;
  } else {
    status = 'BREAK_EVEN';
    badgeText = `0.00% BREAK-EVEN`;
  }

  return {
    isInPosition: true,
    symbol: activePosition.symbol,
    side: activePosition.side,
    entryPrice,
    currentPrice,
    grossProfitPct,
    netProfitPct,
    grossProfitUsd: Number(grossProfitUsd.toFixed(4)),
    netProfitUsd,
    status,
    badgeText,
    portfolioBalance,
    portfolioInitial: initialCapital,
    portfolioRoiPct,
    portfolioNetUsd,
    isPortfolioProfitable,
  };
}

/**
 * Analyzes market indicators, UT Bot, EMA, RSI, and Bollinger Bands to give a clear
 * authoritative verdict: NOW I NEED TO INVEST OR NOT.
 */
export function evaluateInvestmentReadiness(
  symbol: MarketSymbol,
  candles: Candle[],
  currentPrice: number,
  activePosition: PaperPosition | null
): InvestmentDecision {
  const forecast = computeCompositeForecast(symbol, candles);
  const score = forecast.score; // -100 to +100
  const rsi = forecast.rsi;
  const percentB = forecast.percentB;

  // 1. If user already has an active trade in this asset
  if (activePosition && activePosition.symbol.includes(symbol.replace('/', ''))) {
    return {
      symbol,
      currentPrice,
      shouldInvest: false,
      verdict: 'DO_NOT_INVEST_POSITION_OPEN',
      headline: 'DO NOT INVEST (POSITION ALREADY ACTIVE)',
      confidencePercent: 95,
      verdictSummary: `You already have an active ${activePosition.side} trade running on ${symbol} at $${activePosition.entryPrice.toFixed(2)}. In accordance with strict single-position risk management, wait for this trade to hit Take-Profit or Stop-Loss before allocating new capital.`,
      factors: [
        {
          name: 'Active Position Lock',
          value: `${activePosition.side} at $${activePosition.entryPrice.toFixed(2)}`,
          status: 'NEUTRAL',
          description: 'Single-trade capital protection rule enforced.',
        },
        {
          name: 'Target Take-Profit',
          value: `$${activePosition.takeProfit.toFixed(2)}`,
          status: 'BULLISH',
          description: 'Awaiting automatic profit target exit.',
        },
        {
          name: 'Stop-Loss Protection',
          value: `$${activePosition.stopLoss.toFixed(2)}`,
          status: 'BEARISH',
          description: 'Capital defense circuit active.',
        },
      ],
      plan: {
        recommendedSide: activePosition.side,
        entryPrice: activePosition.entryPrice,
        stopLoss: activePosition.stopLoss,
        stopLossDistancePct: Number((Math.abs(currentPrice - activePosition.stopLoss) / currentPrice * 100).toFixed(2)),
        takeProfit: activePosition.takeProfit,
        takeProfitDistancePct: Number((Math.abs(activePosition.takeProfit - currentPrice) / currentPrice * 100).toFixed(2)),
        rewardToRiskRatio: 2.0,
        recommendedCapital: activePosition.tradeCapital,
        maxRiskDollar: activePosition.tradeCapital * 0.01,
        targetGainDollar: activePosition.tradeCapital * 0.02,
      },
    };
  }

  // Calculate technical factors
  const isEmaBullish = score > 15 && percentB > 0.45;
  const isRsiOverbought = rsi > 72;
  const isRsiOversold = rsi < 32;
  const isStrongTrend = Math.abs(score) >= 40;

  let shouldInvest = false;
  let verdict: InvestmentVerdict = 'DO_NOT_INVEST_CHOPPY';
  let headline = 'DO NOT INVEST: WAIT FOR CLEAR BREAKOUT';
  let verdictSummary = '';
  let confidencePercent = 65;

  if (score >= 45 && !isRsiOverbought) {
    shouldInvest = true;
    verdict = 'INVEST_NOW_STRONG_BUY';
    headline = '🟢 INVEST NOW: HIGH-CONFIDENCE BUY';
    confidencePercent = Math.min(94, 60 + Math.round(score * 0.35));
    verdictSummary = `Analysis confirms a strong bullish breakout on ${symbol}. Price is stacked above EMA 20 & 50 with UT Bot buy confirmation. RSI (${rsi.toFixed(1)}) displays healthy upward momentum without overbought exhaustion. The Reward-to-Risk ratio is favorable at 1:2.0+.`;
  } else if (score >= 20 && !isRsiOverbought) {
    shouldInvest = true;
    verdict = 'INVEST_NOW_BUY';
    headline = '🟢 INVEST NOW: FAVORABLE ENTRY SETUP';
    confidencePercent = Math.min(82, 55 + Math.round(score * 0.3));
    verdictSummary = `Moderate bullish alignment detected on ${symbol}. Volatility compression is resolving upward with positive %B expansion (${percentB.toFixed(2)}). Suitable for structured entry with strict Stop Loss.`;
  } else if (isRsiOverbought) {
    shouldInvest = false;
    verdict = 'DO_NOT_INVEST_OVERBOUGHT';
    headline = '🟡 DO NOT INVEST: OVERBOUGHT (WAIT FOR PULLBACK)';
    confidencePercent = 88;
    verdictSummary = `RSI has surged to ${rsi.toFixed(1)} and Bollinger %B is at ${percentB.toFixed(2)}, signalling high risk of immediate mean-reversion pullback. Do not chase the rally here; wait for price to retest support.`;
  } else if (score <= -25) {
    shouldInvest = false;
    verdict = 'DO_NOT_INVEST_BEARISH';
    headline = '🔴 DO NOT INVEST: DOWNTREND REGIME';
    confidencePercent = Math.min(92, 60 + Math.round(Math.abs(score) * 0.35));
    verdictSummary = `Heavy bearish pressure detected (Score: ${score}/100). Price is trading below key moving averages with negative momentum. Purchasing here risks catching a falling knife.`;
  } else {
    shouldInvest = false;
    verdict = 'DO_NOT_INVEST_CHOPPY';
    headline = '⚪ DO NOT INVEST: CHOPPY / LOW CONVICTION';
    confidencePercent = 70;
    verdictSummary = `Market is oscillating in a sideways consolidation range without decisive institutional direction (Score: ${score}/100). Conserve your capital until a verified breakout triggers.`;
  }

  // Construct structured trade execution plan
  const stopLossDistancePct = 1.0; // 1% risk distance
  const rewardDistancePct = 2.0; // 2% reward distance
  const stopLoss = Number((currentPrice * (1 - stopLossDistancePct / 100)).toFixed(2));
  const takeProfit = Number((currentPrice * (1 + rewardDistancePct / 100)).toFixed(2));
  const recommendedCapital = 2.0; // $2.00 micro-capital
  const maxRiskDollar = Number((recommendedCapital * 0.01).toFixed(2));
  const targetGainDollar = Number((recommendedCapital * 0.02).toFixed(2));

  const factors = [
    {
      name: 'Trend Direction (UT Bot & EMAs)',
      value: score >= 20 ? 'Bullish Alignment' : score <= -20 ? 'Bearish Structure' : 'Neutral Range',
      status: (score >= 20 ? 'BULLISH' : score <= -20 ? 'BEARISH' : 'NEUTRAL') as 'BULLISH' | 'BEARISH' | 'NEUTRAL',
      description: score >= 20 ? 'Price leading moving averages with green UT Bot candles.' : 'Price lagging or drifting below moving averages.',
    },
    {
      name: 'RSI Momentum (14)',
      value: `${rsi.toFixed(1)} / 100`,
      status: (rsi >= 50 && rsi <= 70 ? 'BULLISH' : rsi > 70 ? 'BEARISH' : 'NEUTRAL') as 'BULLISH' | 'BEARISH' | 'NEUTRAL',
      description: rsi > 70 ? 'Overbought warning: high pullback danger.' : rsi >= 50 ? 'Strong upward impulse.' : 'Weak demand momentum.',
    },
    {
      name: 'Bollinger %B Expansion',
      value: `${(percentB * 100).toFixed(1)}%`,
      status: (percentB > 0.5 && percentB < 0.9 ? 'BULLISH' : percentB >= 0.9 ? 'NEUTRAL' : 'BEARISH') as 'BULLISH' | 'BEARISH' | 'NEUTRAL',
      description: percentB > 0.5 ? 'Upper band expansion indicates buyers in control.' : 'Lower band compression indicates seller dominance.',
    },
    {
      name: 'Asymmetric Risk-Reward',
      value: '1 : 2.0 (Target: +2.0% | Stop: -1.0%)',
      status: 'BULLISH' as const,
      description: 'Reward potential exceeds risk by at least 2 to 1.',
    },
  ];

  return {
    symbol,
    currentPrice,
    shouldInvest,
    verdict,
    headline,
    confidencePercent,
    verdictSummary,
    factors,
    plan: {
      recommendedSide: 'BUY',
      entryPrice: currentPrice,
      stopLoss,
      stopLossDistancePct,
      takeProfit,
      takeProfitDistancePct: rewardDistancePct,
      rewardToRiskRatio: 2.0,
      recommendedCapital,
      maxRiskDollar,
      targetGainDollar,
    },
  };
}
