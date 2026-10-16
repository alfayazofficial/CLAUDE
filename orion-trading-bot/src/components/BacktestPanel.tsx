import React, { useState, useEffect, useRef } from 'react';
import { BacktestRequirements, MarketSymbol } from '../types/trading';
import { fetchRealHistoricalCandles } from '../lib/market-data';
import { runBacktestWithRequirements, BacktestResult } from '../lib/backtest-engine';
import { autoCycleDaemon } from '../lib/auto-cycle';
import { ALL_TRADINGVIEW_SYMBOLS, resolveTradingViewSymbol } from '../lib/tradingview-service';
import { STRATEGY_PRESETS, StrategyPreset } from '../lib/strategy-presets';
import { TradingViewEmbed } from './TradingViewEmbed';
import { HighFrequencyPanel } from './HighFrequencyPanel';
import {
  Play,
  CheckCircle2,
  TrendingUp,
  ShieldAlert,
  Sliders,
  DollarSign,
  Layers,
  Sparkles,
  Zap,
  RotateCcw,
  Clock,
  Compass,
  Database,
  ExternalLink,
  Calendar,
  Building,
  Scale,
  Activity,
} from 'lucide-react';

declare global {
  interface Window {
    TradingView?: any;
  }
}

export const BacktestPanel: React.FC = () => {
  const [backtestMode, setBacktestMode] = useState<'HF_1M' | 'CAMPAIGN'>('HF_1M');
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('TREND_SURFER');
  const activePreset =
    STRATEGY_PRESETS.find((p) => p.id === selectedStrategyId) || STRATEGY_PRESETS[0];

  // Core user requirements state
  const [req, setReq] = useState<BacktestRequirements>({
    symbol: 'BTC/USDT',
    exchange: 'BINANCE',
    strategyId: activePreset.id,
    dailyBudget: 1000, // $1,000 per day
    tradingDurationDays: 30, // 30 Days of trading
    profitToLossRatio: 2.0, // 1:2.0 Risk-to-Reward Ratio
    timeframe: activePreset.recommendedTimeframe,
    historicalRange: '30D',
    candleCount: 500,
    initialCapital: 100000,
    positionSizePercent: activePreset.requirements.positionSizePercent,
    leverage: activePreset.requirements.leverage,
    utSensitivity: activePreset.requirements.utSensitivity,
    atrPeriod: activePreset.requirements.atrPeriod,
    enablePercentBFilter: activePreset.requirements.enablePercentBFilter,
    percentBUpperCutoff: activePreset.requirements.percentBUpperCutoff,
    percentBLowerCutoff: activePreset.requirements.percentBLowerCutoff,
    enableEMATrendFilter: activePreset.requirements.enableEMATrendFilter,
    enableRSIGuard: activePreset.requirements.enableRSIGuard,
    rsiOverbought: activePreset.requirements.rsiOverbought,
    rsiOversold: activePreset.requirements.rsiOversold,
    enableMultiTimeframeConfirm: activePreset.requirements.enableMultiTimeframeConfirm,
    stopLossPercent: activePreset.requirements.stopLossPercent,
    takeProfitPercent: Number((activePreset.requirements.stopLossPercent * 2.0).toFixed(1)),
    enableTrailingStop: activePreset.requirements.enableTrailingStop,
    slippageBps: activePreset.requirements.slippageBps,
    feeBps: activePreset.requirements.feeBps,
  });

  const [result, setResult] = useState<BacktestResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [backtestError, setBacktestError] = useState<string | null>(null);
  const [autoTradeActive, setAutoTradeActive] = useState(false);
  const [dataMeta, setDataMeta] = useState<{
    isReal: boolean;
    source: string;
    startDate: string;
    endDate: string;
    totalBars: number;
  } | null>(null);

  // Auto-update Take Profit when Stop Loss or Profit/Loss ratio changes
  const handleRatioChange = (ratio: number) => {
    const newTP = Number((req.stopLossPercent * ratio).toFixed(1));
    setReq((prev) => ({
      ...prev,
      profitToLossRatio: ratio,
      takeProfitPercent: newTP,
    }));
  };

  const handleStopLossChange = (sl: number) => {
    const newTP = Number((sl * req.profitToLossRatio).toFixed(1));
    setReq((prev) => ({
      ...prev,
      stopLossPercent: sl,
      takeProfitPercent: newTP,
    }));
  };

  // When user selects a strategy preset, automatically adapt all options
  const handleSelectStrategy = (preset: StrategyPreset) => {
    setSelectedStrategyId(preset.id);
    const newTP = Number((preset.requirements.stopLossPercent * req.profitToLossRatio).toFixed(1));

    setReq((prev) => ({
      ...prev,
      strategyId: preset.id,
      timeframe: preset.recommendedTimeframe,
      ...preset.requirements,
      takeProfitPercent: newTP,
    }));
  };

  // Run the backtest using real exchange data
  const handleStartBacktest = async () => {
    setIsSimulating(true);
    setBacktestError(null);
    setAutoTradeActive(false);

    try {
      // Bars per day for each timeframe (the old formula assumed 15m bars for 1m/5m, so the tested window was far shorter than requested).
      // Binance returns at most 1000 bars per request, so long windows on small timeframes are truncated; the real window is shown below.
      const BARS_PER_DAY: Record<string, number> = { '1m': 1440, '5m': 288, '15m': 96, '1h': 24, '4h': 6, '1D': 1 };
      const bars = Math.min(1000, Math.max(100, req.tradingDurationDays * (BARS_PER_DAY[req.timeframe] || 24)));

      // Fetch real TradingView/Binance historical bars
      const histData = await fetchRealHistoricalCandles(req.symbol, req.timeframe, bars);

      setDataMeta({
        isReal: histData.isReal,
        source: histData.source,
        startDate: histData.startDate,
        endDate: histData.endDate,
        totalBars: histData.totalBars,
      });

      // Run simulation with strict requirements
      const res = runBacktestWithRequirements(histData.candles, { ...req, candleCount: bars });
      setResult(res);
    } catch (err: any) {
      setResult(null);
      setBacktestError(err?.message || 'Backtest failed');
    } finally {
      setIsSimulating(false);
    }
  };

  // Launch Auto-Trade with this exact plan
  const handleLaunchAutoTrade = () => {
    autoCycleDaemon.updateConfig({
      dailyBudget: req.dailyBudget,
      dailySpent: 0,
      tradingDurationDays: req.tradingDurationDays,
      campaignStartDate: Date.now(),
      targetSymbol: req.symbol,
      selectedExchange: req.exchange,
      strategyName: activePreset.name,
      profitToLossRatio: req.profitToLossRatio,
      minConviction: 55,
      tradeSizePercent: req.positionSizePercent,
      enableUTBotFilter: true,
      enablePercentBFilter: req.enablePercentBFilter,
      enableMultiTimeframeConfirm: req.enableMultiTimeframeConfirm,
      autoStopLossPercent: req.stopLossPercent,
      autoTakeProfitPercent: req.takeProfitPercent,
    });

    autoCycleDaemon.start();
    setAutoTradeActive(true);
  };

  const chartWidth = 720;
  const chartHeight = 140;
  const minEq = result
    ? Math.min(...result.equityCurve.map((p) => p.equity), result.initialCapital * 0.95)
    : 100000;
  const maxEq = result
    ? Math.max(...result.equityCurve.map((p) => p.equity), result.initialCapital * 1.05)
    : 100000;
  const eqRange = maxEq - minEq || 1;

  const eqStep =
    result && result.equityCurve.length > 1
      ? chartWidth / (result.equityCurve.length - 1)
      : chartWidth;

  const eqPath =
    result &&
    result.equityCurve
      .map(
        (p, i) =>
          `${i === 0 ? 'M' : 'L'} ${i * eqStep} ${
            chartHeight - ((p.equity - minEq) / eqRange) * (chartHeight - 20) - 10
          }`
      )
      .join(' ');

  return (
    <div className="rounded-lg border border-slate-800 bg-[#0b0e14] p-4 shadow-xl space-y-5">
      {/* Top Title Banner */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 pb-3 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-400">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <span>Auto-Trade Planning &amp; Real Backtest Engine</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-700/50 text-cyan-300">
                TradingView Data Feeds
              </span>
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">
              Plan your daily budget, trading days, exchange, coin, strategy &amp; Profit/Loss ratio — test on TradingView and auto-trade
            </p>
          </div>
        </div>

        {/* Start Backtest Action Button */}
        <button
          onClick={handleStartBacktest}
          disabled={isSimulating}
          className="flex items-center gap-2 rounded bg-cyan-600 hover:bg-cyan-500 px-5 py-2 font-mono text-xs font-black uppercase tracking-wider text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all disabled:opacity-50"
        >
          <Play className="h-4 w-4 fill-current" />
          <span>{isSimulating ? 'TESTING ON TRADINGVIEW...' : 'RUN BACKTEST SIMULATION'}</span>
        </button>
      </div>

      {/* Backtest Architecture Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between bg-[#080c14] border border-slate-800 rounded-lg p-1.5 text-xs font-mono">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setBacktestMode('HF_1M')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded transition-all font-bold ${
              backtestMode === 'HF_1M'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="h-3.5 w-3.5 fill-current" />
            <span>Automated 1-Hour &amp; Scalper Backtest (Fixed Sizing &amp; Real Taker Fees)</span>
          </button>
          <button
            onClick={() => setBacktestMode('CAMPAIGN')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded transition-all font-bold ${
              backtestMode === 'CAMPAIGN'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Macro / Swing Campaign Backtest (Multi-Day Horizons)</span>
          </button>
        </div>
        <span className="hidden md:inline-block text-[11px] text-slate-400">
          {backtestMode === 'HF_1M'
            ? 'Automated 1h backtest • 24 trades/day • 720/month • Rishi Narang Friction Law'
            : 'Multi-Timeframe • Auto-Cycle Campaign Planner'}
        </span>
      </div>

      {backtestMode === 'HF_1M' ? (
        <HighFrequencyPanel />
      ) : (
        <>
          {/* 5 CORE USER REQUIREMENTS BAR */}
          <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-r from-slate-950 via-[#070b12] to-slate-950 p-4 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
          <div className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
            <Sliders className="h-4 w-4" />
            <span>Target Campaign Specifications (Auto-Trade &amp; Backtest Plan)</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            All parameters directly feed the Auto-Trading Engine
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* 1. Daily Budget */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
            <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider mb-1">
              <span className="flex items-center gap-1 font-bold text-slate-300">
                <DollarSign className="h-3 w-3 text-cyan-400" /> Daily Budget ($)
              </span>
              <span className="text-cyan-400 font-mono font-bold">${req.dailyBudget}</span>
            </div>
            <input
              type="number"
              value={req.dailyBudget}
              onChange={(e) => setReq({ ...req, dailyBudget: parseFloat(e.target.value) || 500 })}
              className="w-full rounded border border-slate-800 bg-slate-950 px-2 py-1 font-mono text-xs text-slate-100 focus:outline-none"
            />
            <div className="grid grid-cols-4 gap-1 mt-1 font-mono text-[9px]">
              {[500, 1000, 2500, 5000].map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setReq({ ...req, dailyBudget: b })}
                  className="rounded bg-slate-800/70 hover:bg-slate-700 py-0.5 text-center text-slate-300"
                >
                  ${b}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Trading Duration in Days */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
            <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider mb-1">
              <span className="flex items-center gap-1 font-bold text-slate-300">
                <Calendar className="h-3 w-3 text-cyan-400" /> Duration (Days)
              </span>
              <span className="text-cyan-400 font-mono font-bold">{req.tradingDurationDays} Days</span>
            </div>
            <select
              value={req.tradingDurationDays}
              onChange={(e) => setReq({ ...req, tradingDurationDays: parseInt(e.target.value) })}
              className="w-full rounded border border-slate-800 bg-slate-950 px-2 py-1.5 font-mono text-xs text-slate-100 focus:outline-none"
            >
              <option value={7}>7 Days (1 Week)</option>
              <option value={14}>14 Days (2 Weeks)</option>
              <option value={30}>30 Days (1 Month)</option>
              <option value={60}>60 Days (2 Months)</option>
              <option value={90}>90 Days (Quarter)</option>
              <option value={180}>180 Days (Half-Year)</option>
              <option value={365}>365 Days (1 Full Year)</option>
            </select>
            <div className="text-[9px] font-mono text-slate-400 mt-1">
              Planned Campaign Length
            </div>
          </div>

          {/* 3. Exchange Selection */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
            <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider mb-1">
              <span className="flex items-center gap-1 font-bold text-slate-300">
                <Building className="h-3 w-3 text-cyan-400" /> Exchange
              </span>
              <span className="text-emerald-400 font-mono font-bold">{req.exchange}</span>
            </div>
            <select
              value={req.exchange}
              onChange={(e) => setReq({ ...req, exchange: e.target.value as any })}
              className="w-full rounded border border-slate-800 bg-slate-950 px-2 py-1.5 font-mono text-xs text-slate-100 focus:outline-none"
            >
              <option value="BINANCE">Binance Global</option>
              <option value="BYBIT">Bybit Exchange</option>
              <option value="COINBASE">Coinbase Advanced</option>
              <option value="OKX">OKX Exchange</option>
              <option value="KRAKEN">Kraken Pro</option>
              <option value="ALPACA">Alpaca Markets (US)</option>
              <option value="INTERACTIVE_BROKERS">Interactive Brokers</option>
            </select>
            <div className="text-[9px] font-mono text-slate-400 mt-1">
              Direct TradingView Protocol
            </div>
          </div>

          {/* 4. Coin / Asset Selection */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
            <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider mb-1">
              <span className="flex items-center gap-1 font-bold text-slate-300">
                <Layers className="h-3 w-3 text-cyan-400" /> Target Coin
              </span>
              <span className="text-cyan-400 font-mono font-bold">{req.symbol}</span>
            </div>
            <select
              value={req.symbol}
              onChange={(e) => setReq({ ...req, symbol: e.target.value })}
              className="w-full rounded border border-slate-800 bg-slate-950 px-2 py-1.5 font-mono text-xs text-slate-100 focus:outline-none"
            >
              {ALL_TRADINGVIEW_SYMBOLS.map((s) => (
                <option key={s.tvSymbol} value={s.symbol}>
                  {s.symbol} ({s.name})
                </option>
              ))}
            </select>
            <div className="text-[9px] font-mono text-slate-400 mt-1 truncate">
              Ticker: {resolveTradingViewSymbol(req.symbol)}
            </div>
          </div>

          {/* 5. Profit / Loss Ratio (Risk-to-Reward) */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
            <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider mb-1">
              <span className="flex items-center gap-1 font-bold text-slate-300">
                <Scale className="h-3 w-3 text-cyan-400" /> Profit/Loss Ratio
              </span>
              <span className="text-emerald-400 font-mono font-bold">1 : {req.profitToLossRatio}</span>
            </div>
            <select
              value={req.profitToLossRatio}
              onChange={(e) => handleRatioChange(parseFloat(e.target.value))}
              className="w-full rounded border border-slate-800 bg-slate-950 px-2 py-1.5 font-mono text-xs text-slate-100 focus:outline-none"
            >
              <option value={1.5}>1 : 1.5 (Quick Scalp)</option>
              <option value={2.0}>1 : 2.0 (Institutional Standard)</option>
              <option value={2.5}>1 : 2.5 (Strong Asymmetry)</option>
              <option value={3.0}>1 : 3.0 (High Reward Trend)</option>
              <option value={4.0}>1 : 4.0 (Extreme Runner)</option>
            </select>
            <div className="text-[9px] font-mono text-slate-400 mt-1 flex justify-between">
              <span>SL: <strong className="text-rose-400">{req.stopLossPercent}%</strong></span>
              <span>TP: <strong className="text-emerald-400">{req.takeProfitPercent}%</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* STRATEGY SELECTION CAROUSEL (Selecting changes rules automatically) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
            <Compass className="h-4 w-4" />
            <span>Select Strategy (Options &amp; Rules Automatically Adapt)</span>
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            Selected: <strong className="text-white">{activePreset.name}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {STRATEGY_PRESETS.map((preset) => {
            const isSelected = selectedStrategyId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectStrategy(preset)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'border-cyan-500 bg-cyan-950/40 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                    : 'border-slate-800 bg-slate-950/50 hover:bg-slate-900/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`font-mono text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                      isSelected
                        ? 'border-cyan-500 bg-cyan-900 text-cyan-200'
                        : 'border-slate-800 bg-slate-900 text-slate-400'
                    }`}
                  >
                    {preset.badge}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    UT: {preset.requirements.utSensitivity} • ATR: {preset.requirements.atrPeriod}
                  </span>
                </div>

                <div className="font-bold text-xs text-slate-100">{preset.name}</div>
                <div className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-snug">
                  {preset.tagline}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* DUAL DISPLAY: LIVE TRADINGVIEW EMBED & BACKTEST SIMULATION HUD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Real TradingView Chart Embedded in Backtest (7 cols) */}
        <div className="lg:col-span-7 flex flex-col">
          <TradingViewEmbed
            symbol={req.symbol}
            exchange={req.exchange}
            timeframe={req.timeframe}
          />
        </div>

        {/* Backtest & Auto-Trade Control Column (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-3">
          {/* Verified Exchange Data Meta */}
          {backtestError && (
            <div className="p-3 rounded-lg border border-rose-700/60 bg-rose-950/30 text-xs font-mono text-rose-300">
              Backtest could not run: {backtestError}
            </div>
          )}
          {dataMeta && (
            <div
              className={`p-3 rounded-lg border text-xs font-mono space-y-1 ${
                dataMeta.isReal ? 'border-emerald-700/60 bg-emerald-950/30' : 'border-amber-600/70 bg-amber-950/40'
              }`}
            >
              <div className={`flex items-center gap-2 font-bold ${dataMeta.isReal ? 'text-emerald-400' : 'text-amber-400'}`}>
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  {dataMeta.isReal
                    ? 'Simulated on real exchange candles'
                    : 'SYNTHETIC DATA: random walk, NOT real prices. These results are meaningless for real trading.'}
                </span>
              </div>
              <div className="text-slate-300 text-[11px]">
                Source: <strong className="text-cyan-300">{dataMeta.source}</strong>
              </div>
              <div className="text-slate-300 text-[11px]">
                Horizon: <strong className="text-cyan-300">{dataMeta.startDate}</strong> → <strong className="text-cyan-300">{dataMeta.endDate}</strong> ({dataMeta.totalBars} Bars)
              </div>
            </div>
          )}

          {/* Results Analytics Grid if backtested */}
          {result ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center justify-between">
                <span>Simulation Performance</span>
                <span className="font-mono text-cyan-400">{req.tradingDurationDays} Days Tested</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded border border-slate-800 bg-slate-900/60 p-2">
                  <div className="text-[10px] text-slate-400 uppercase">Total Return</div>
                  <div className={`font-mono font-bold text-sm ${result.totalReturnPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {result.totalReturnPercent >= 0 ? '+' : ''}{result.totalReturnPercent}%
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">${result.finalCapital.toLocaleString()}</div>
                </div>

                <div className="rounded border border-slate-800 bg-slate-900/60 p-2">
                  <div className="text-[10px] text-slate-400 uppercase">Win Rate</div>
                  <div className="font-mono font-bold text-sm text-slate-100">{result.winRate}%</div>
                  <div className="text-[10px] text-slate-400 font-mono">{result.winningTrades} W / {result.losingTrades} L</div>
                </div>

                <div className="rounded border border-slate-800 bg-slate-900/60 p-2">
                  <div className="text-[10px] text-slate-400 uppercase">Profit Factor</div>
                  <div className="font-mono font-bold text-sm text-cyan-300">{result.profitFactor}</div>
                  <div className="text-[10px] text-slate-400 font-mono">Gross Gain / Loss</div>
                </div>

                <div className="rounded border border-slate-800 bg-slate-900/60 p-2">
                  <div className="text-[10px] text-slate-400 uppercase">Max Drawdown</div>
                  <div className="font-mono font-bold text-sm text-rose-400">{result.maxDrawdownPercent}%</div>
                  <div className="text-[10px] text-slate-400 font-mono">Risk Profile</div>
                </div>
              </div>

              {/* Capital Growth Curve */}
              <div className="rounded border border-slate-800/80 bg-slate-900/40 p-2">
                <div className="flex justify-between text-[10px] text-slate-400 uppercase font-mono mb-1">
                  <span>Simulated Equity Curve</span>
                  <span className="text-emerald-400">${result.finalCapital.toFixed(0)}</span>
                </div>
                <div className="w-full overflow-hidden">
                  <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-16">
                    <line
                      x1="0"
                      y1={chartHeight - ((result.initialCapital - minEq) / eqRange) * (chartHeight - 20) - 10}
                      x2={chartWidth}
                      y2={chartHeight - ((result.initialCapital - minEq) / eqRange) * (chartHeight - 20) - 10}
                      stroke="#334155"
                      strokeDasharray="3 3"
                    />
                    <path d={eqPath || ''} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400 font-mono border border-dashed border-slate-800 rounded-xl p-4">
              Click <strong className="text-cyan-400">"RUN BACKTEST SIMULATION"</strong> to test this {req.tradingDurationDays}-day plan on real {req.exchange} data.
            </div>
          )}

          {/* LAUNCH AUTO-TRADE BUTTON WITH THIS PLAN */}
          <div className="rounded-xl border border-cyan-500 bg-gradient-to-r from-cyan-950/80 via-slate-900 to-cyan-950/80 p-3.5 shadow-[0_0_20px_rgba(6,182,212,0.3)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-cyan-400" />
                <span>Auto-Trade Execution Trigger</span>
              </span>
              <span className="font-mono text-[10px] text-emerald-400 font-bold">
                {autoTradeActive ? 'RUNNING LIVE' : 'READY TO DEPLOY'}
              </span>
            </div>

            <p className="text-[11px] text-slate-300 font-mono leading-snug">
              Enforce ${req.dailyBudget}/day budget, trade {req.symbol} on {req.exchange} with {activePreset.name} for {req.tradingDurationDays} days at 1:{req.profitToLossRatio} R:R.
            </p>

            <button
              onClick={handleLaunchAutoTrade}
              className={`w-full py-2.5 rounded-lg font-mono text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 ${
                autoTradeActive
                  ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
              }`}
            >
              {autoTradeActive ? <CheckCircle2 className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
              <span>
                {autoTradeActive ? 'CAMPAIGN RUNNING IN AUTO-CYCLE!' : 'START AUTO-TRADE WITH THIS PLAN'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Trade Execution Ledger Table if tested */}
      {result && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="font-bold uppercase tracking-wider text-[11px] font-mono">
              Simulated Trade Ledger ({result.trades.length} Closed Positions)
            </span>
            <span className="text-slate-400 font-mono text-[10px]">
              Commission: {req.feeBps} bps • Slippage: {req.slippageBps} bps
            </span>
          </div>

          <div className="overflow-x-auto max-h-56 rounded border border-slate-800 bg-slate-950/80 p-2">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="pb-1.5 pl-1">Side</th>
                  <th className="pb-1.5">Entry Price</th>
                  <th className="pb-1.5">Exit Price</th>
                  <th className="pb-1.5">Size</th>
                  <th className="pb-1.5">Net PnL ($)</th>
                  <th className="pb-1.5">Return (%)</th>
                  <th className="pb-1.5 pr-1 text-right">Exit Trigger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {result.trades.map((t, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/40 font-mono text-[11px]">
                    <td className="py-1.5 pl-1 font-bold">
                      <span className={t.side === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}>
                        {t.side}
                      </span>
                    </td>
                    <td className="py-1.5 text-slate-300">${t.entryPrice.toFixed(2)}</td>
                    <td className="py-1.5 text-slate-300">${t.exitPrice.toFixed(2)}</td>
                    <td className="py-1.5 text-slate-300">{t.size}</td>
                    <td className="py-1.5 font-bold">
                      <span className={t.netPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {t.netPnL >= 0 ? '+' : ''}${t.netPnL.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-1.5">
                      <span className={t.returnPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {t.returnPercent >= 0 ? '+' : ''}{t.returnPercent.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-1.5 pr-1 text-right text-[10px] text-slate-400">
                      {t.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
};
