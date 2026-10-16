import React, { useState, useEffect } from 'react';
import { MarketSymbol, Candle } from '../types/trading';
import { PaperBroker, PaperBrokerState, PaperPosition } from '../lib/broker-client';
import {
  calculateProfitStatus,
  evaluateInvestmentReadiness,
  ProfitAnalysis,
  InvestmentDecision,
} from '../lib/investment-advisor';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Zap,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Activity,
  Layers,
  Lock,
} from 'lucide-react';

interface ProfitAndInvestmentAdvisorProps {
  symbol: MarketSymbol;
  candles: Candle[];
  currentPrice: number;
}

export const ProfitAndInvestmentAdvisor: React.FC<ProfitAndInvestmentAdvisorProps> = ({
  symbol,
  candles,
  currentPrice,
}) => {
  const [brokerState, setBrokerState] = useState<PaperBrokerState>(PaperBroker.getState());
  const [executeFeedback, setExecuteFeedback] = useState<string | null>(null);

  useEffect(() => {
    const unsub = PaperBroker.subscribe(setBrokerState);
    return () => unsub();
  }, []);

  const activePos = brokerState.activePosition;

  // 1. Calculate Live Profit/Loss metrics
  const profitStatus: ProfitAnalysis = calculateProfitStatus(
    currentPrice,
    activePos,
    brokerState.balance,
    2000.0
  );

  // 2. Evaluate "Now I need to invest or not"
  const decision: InvestmentDecision = evaluateInvestmentReadiness(
    symbol,
    candles,
    currentPrice,
    activePos
  );

  const handleExecuteInvestment = async () => {
    if (!decision.shouldInvest) return;

    const result = await PaperBroker.openPosition({
      symbol,
      side: decision.plan.recommendedSide,
      price: currentPrice,
      tradeCapital: decision.plan.recommendedCapital,
      ratio: '1:2',
    });

    if (result.success) {
      setExecuteFeedback(`✅ Position opened: ${decision.plan.recommendedSide} at $${currentPrice.toFixed(2)}`);
    } else {
      setExecuteFeedback(`⚠️ Could not open: ${result.reason}`);
    }

    setTimeout(() => setExecuteFeedback(null), 4000);
  };

  const handleCloseActivePosition = async () => {
    if (!activePos) return;
    const closed = await PaperBroker.manualClose(currentPrice);
    if (closed) {
      setExecuteFeedback(`Position closed at $${currentPrice.toFixed(2)} | Net PnL: ${closed.netPnl >= 0 ? '+' : ''}$${closed.netPnl.toFixed(4)}`);
      setTimeout(() => setExecuteFeedback(null), 4000);
    }
  };

  // Calculate SL/TP progress for visual bar if active position exists
  let posProgress = 50;
  if (activePos && activePos.takeProfit !== activePos.stopLoss) {
    const range = Math.abs(activePos.takeProfit - activePos.stopLoss);
    const distFromSl = Math.abs(currentPrice - activePos.stopLoss);
    posProgress = Math.min(100, Math.max(0, (distFromSl / range) * 100));
  }

  return (
    <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-b from-[#090e1a] via-[#070b14] to-[#05080e] p-4 shadow-xl space-y-4">
      {/* Top Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-black text-xs uppercase tracking-wider text-slate-100 flex items-center gap-2">
              <span>Live Profit Percentage &amp; Investment Decision Engine</span>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-700/50 text-cyan-300">
                REAL MARKET DATA
              </span>
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">
              Real-time PnL percentage tracking with exchange taker fee deductions &amp; algorithmic market timing verdict
            </p>
          </div>
        </div>

        {/* Global Paper Balance & ROI pill */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block uppercase">Paper Capital</span>
            <span className="font-bold text-slate-100">${brokerState.balance.toFixed(2)}</span>
          </div>
          <div className="text-right pl-3 border-l border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase">All-Time ROI</span>
            <span className={`font-bold ${profitStatus.isPortfolioProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
              {profitStatus.isPortfolioProfitable ? '+' : ''}{profitStatus.portfolioRoiPct}%
            </span>
          </div>
        </div>
      </div>

      {/* Main Split: Left (Profit/Loss Status) vs Right (Invest or Not Verdict) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ========================================================= */}
        {/* SECTION 1: HOW MUCH PERCENTAGE PROFIT I AM IN OR NOT (5 cols) */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-[#070a12] p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5 font-mono">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              <span>Real Profit Percentage Tracker</span>
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded font-black border ${
                profitStatus.status === 'IN_PROFIT'
                  ? 'border-emerald-500/50 bg-emerald-950/60 text-emerald-300 shadow-[0_0_8px_#10b981]'
                  : profitStatus.status === 'IN_LOSS'
                  ? 'border-rose-500/50 bg-rose-950/60 text-rose-300 shadow-[0_0_8px_#f43f5e]'
                  : 'border-slate-800 bg-slate-900 text-slate-400'
              }`}
            >
              {profitStatus.status === 'IN_PROFIT'
                ? '🟢 IN PROFIT'
                : profitStatus.status === 'IN_LOSS'
                ? '🔴 IN LOSS'
                : '⚪ FLAT / NO RISK'}
            </span>
          </div>

          {/* Large Real Percentage Display */}
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-center space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
              {profitStatus.isInPosition ? `Live Return on Position (${profitStatus.symbol})` : 'Active Position Return'}
            </span>
            <div
              className={`text-3xl font-black font-mono tracking-tight ${
                profitStatus.status === 'IN_PROFIT'
                  ? 'text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                  : profitStatus.status === 'IN_LOSS'
                  ? 'text-rose-400 drop-shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                  : 'text-slate-400'
              }`}
            >
              {profitStatus.isInPosition
                ? `${profitStatus.netProfitPct >= 0 ? '+' : ''}${profitStatus.netProfitPct.toFixed(2)}%`
                : '0.00%'}
            </div>
            <div className="text-xs font-mono text-slate-300 flex items-center justify-center gap-2">
              <span>Net PnL:</span>
              <strong className={profitStatus.netProfitUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {profitStatus.netProfitUsd >= 0 ? '+' : ''}${profitStatus.netProfitUsd.toFixed(4)} USD
              </strong>
              <span className="text-[10px] text-slate-500">(After 0.2% Taker Fee)</span>
            </div>
          </div>

          {/* Real Position Details or Standby Message */}
          {profitStatus.isInPosition && activePos ? (
            <div className="space-y-2 text-xs font-mono">
              <div className="grid grid-cols-2 gap-2 text-[11px] p-2 rounded bg-slate-950 border border-slate-800/60">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase">Entry Price</span>
                  <span className="font-bold text-slate-200">${activePos.entryPrice.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase">Current Market</span>
                  <span className="font-bold text-cyan-300">${currentPrice.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase">Capital at Risk</span>
                  <span className="font-bold text-slate-200">${activePos.tradeCapital.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase">Side &amp; Ratio</span>
                  <span className="font-bold text-emerald-400">{activePos.side} ({activePos.ratio})</span>
                </div>
              </div>

              {/* TP vs SL Trajectory Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span className="text-rose-400">SL: ${activePos.stopLoss.toFixed(2)}</span>
                  <span className="text-cyan-400 font-bold">${currentPrice.toFixed(2)}</span>
                  <span className="text-emerald-400">TP: ${activePos.takeProfit.toFixed(2)}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-900 border border-slate-800 overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500 transition-all duration-300"
                    style={{ width: `${posProgress}%` }}
                  />
                </div>
              </div>

              <button
                onClick={handleCloseActivePosition}
                className="w-full py-1.5 rounded bg-rose-600/80 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider transition-all"
              >
                Close Trade Now &amp; Take Profit/Loss
              </button>
            </div>
          ) : (
            <div className="p-3 rounded-lg border border-dashed border-slate-800 text-center space-y-1">
              <span className="text-xs font-mono text-slate-400 block">
                No active position currently open.
              </span>
              <p className="text-[10px] font-mono text-slate-400">
                Total portfolio balance is preserved at <strong>${brokerState.balance.toFixed(2)}</strong>. See recommendation on the right to decide if you should invest now.
              </p>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* SECTION 2: "NOW I NEED TO INVEST OR NOT" DECISION ENGINE (7 cols) */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-[#070a12] p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5 font-mono">
              <Activity className="h-4 w-4 text-cyan-400" />
              <span>Investment Timing Decision Engine</span>
            </span>
            <div className="flex items-center gap-1 text-[10px] font-mono">
              <span className="text-slate-400">Target Asset:</span>
              <span className="font-bold text-cyan-300">{symbol}</span>
            </div>
          </div>

          {/* Authoritative "INVEST NOW OR NOT" Verdict Banner */}
          <div
            className={`p-3.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg ${
              decision.verdict.startsWith('INVEST_NOW')
                ? 'border-emerald-500/60 bg-emerald-950/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                : decision.verdict === 'DO_NOT_INVEST_OVERBOUGHT'
                ? 'border-amber-500/60 bg-amber-950/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                : 'border-rose-500/60 bg-rose-950/30 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {decision.shouldInvest ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                ) : decision.verdict === 'DO_NOT_INVEST_OVERBOUGHT' ? (
                  <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-rose-400 shrink-0" />
                )}
                <h4 className="font-black text-sm font-mono uppercase tracking-wider text-slate-100">
                  {decision.headline}
                </h4>
              </div>
              <p className="text-[11px] text-slate-300 font-mono leading-relaxed max-w-lg">
                {decision.verdictSummary}
              </p>
            </div>

            {/* Algorithm Confidence Gauge */}
            <div className="sm:text-right shrink-0 p-2 rounded bg-slate-950/80 border border-slate-800">
              <span className="text-[9px] uppercase font-mono text-slate-400 block">Confidence</span>
              <span
                className={`text-lg font-black font-mono ${
                  decision.shouldInvest ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {decision.confidencePercent}%
              </span>
            </div>
          </div>

          {/* Key Quantitative Factors Table */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            {decision.factors.map((f, i) => (
              <div key={i} className="p-2 rounded bg-slate-950 border border-slate-800/80 space-y-0.5">
                <span className="text-[9px] text-slate-400 uppercase block truncate">{f.name}</span>
                <span
                  className={`text-xs font-bold block truncate ${
                    f.status === 'BULLISH'
                      ? 'text-emerald-400'
                      : f.status === 'BEARISH'
                      ? 'text-rose-400'
                      : 'text-slate-300'
                  }`}
                >
                  {f.value}
                </span>
                <span className="text-[8px] text-slate-400 block line-clamp-2 leading-tight">
                  {f.description}
                </span>
              </div>
            ))}
          </div>

          {/* Structured Execution Plan & Action Button */}
          <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
            <div className="flex flex-wrap items-center gap-3 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[9px]">Entry</span>
                <strong className="text-slate-200">${decision.plan.entryPrice.toFixed(2)}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px]">Take Profit (TP)</span>
                <strong className="text-emerald-400">${decision.plan.takeProfit.toFixed(2)} (+{decision.plan.takeProfitDistancePct}%)</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px]">Stop Loss (SL)</span>
                <strong className="text-rose-400">${decision.plan.stopLoss.toFixed(2)} (-{decision.plan.stopLossDistancePct}%)</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px]">Reward / Risk</span>
                <strong className="text-cyan-300">1 : {decision.plan.rewardToRiskRatio.toFixed(1)}</strong>
              </div>
            </div>

            {/* Action Button */}
            {decision.shouldInvest ? (
              <button
                onClick={handleExecuteInvestment}
                className="px-5 py-2.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black uppercase tracking-wider text-xs shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all flex items-center gap-1.5"
              >
                <Zap className="h-4 w-4 fill-current" />
                <span>INVEST NOW ($2.00)</span>
              </button>
            ) : (
              <button
                disabled
                className="px-4 py-2 rounded bg-slate-900 border border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-xs cursor-not-allowed flex items-center gap-1.5"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>DO NOT INVEST (WAIT)</span>
              </button>
            )}
          </div>

          {executeFeedback && (
            <div className="p-2 rounded bg-cyan-950 border border-cyan-700/60 text-xs font-mono text-cyan-200">
              {executeFeedback}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
