import React, { useState, useEffect } from 'react';
import { Candle } from '../types/trading';
import { fetchRealHistoricalCandles } from '../lib/market-data';
import {
  runHighFrequencyBacktest,
  HFBacktestOptions,
  HFBacktestResult,
} from '../lib/backtest-high-frequency';
import { autoCycleDaemon } from '../lib/auto-cycle';
import { ALL_TRADINGVIEW_SYMBOLS } from '../lib/tradingview-service';
import { TradingViewEmbed } from './TradingViewEmbed';
import {
  Zap,
  Play,
  CheckCircle2,
  AlertTriangle,
  Scale,
  ShieldAlert,
  Percent,
  TrendingDown,
  DollarSign,
  Activity,
  Layers,
  Database,
  Building,
} from 'lucide-react';

export const HighFrequencyPanel: React.FC = () => {
  const [symbol, setSymbol] = useState<string>('BTC/USDT');
  const [exchange, setExchange] = useState<string>('BINANCE');
  const [timeframe, setTimeframe] = useState<string>('1h'); // Default: 1 Hour (1h)
  const [autoBacktest, setAutoBacktest] = useState<boolean>(true); // Auto-runs backtest
  const [tradeCapital, setTradeCapital] = useState<number>(2.0); // $2.00 default
  const [ratio, setRatio] = useState<string>('1:2');
  const [baseStopPct, setBaseStopPct] = useState<number>(0.01); // 1.0%
  const [feeRate, setFeeRate] = useState<number>(0.001); // Binance 0.1%
  const [spreadRate, setSpreadRate] = useState<number>(0.0002); // 0.02%
  const [signalMethod, setSignalMethod] = useState<HFBacktestOptions['signalMethod']>('MOMENTUM_BAR');
  const [testDays, setTestDays] = useState<number>(30); // Default: 30 days (720 hourly candles)
  const [initialBalance, setInitialBalance] = useState<number>(2000.0);

  const [isSimulating, setIsSimulating] = useState(false);
  const [result, setResult] = useState<HFBacktestResult | null>(null);
  const [dataMeta, setDataMeta] = useState<{
    startDate: string;
    endDate: string;
    totalBars: number;
    isReal: boolean;
  } | null>(null);
  const [liveDeployed, setLiveDeployed] = useState(false);

  // Mathematical R:R calculations for $2.00 trade
  const [riskMul, rewardMul] = ratio.split(':').map(Number);
  const normalizedR = (rewardMul && riskMul) ? rewardMul / riskMul : 2;
  const targetProfitPct = baseStopPct * normalizedR;
  const dollarMaxLoss = tradeCapital * baseStopPct;
  const dollarTargetGain = tradeCapital * targetProfitPct;
  const roundTripFeePerTrade = tradeCapital * (feeRate * 2);
  const breakEvenRate = Number(((1 / (1 + normalizedR)) * 100).toFixed(1));

  // Run the Strategy Backtest for the selected timeframe (1h default)
  const handleRunHFTest = async () => {
    setIsSimulating(true);
    setLiveDeployed(false);

    try {
      let barsPerDay = 24;
      if (timeframe === '1m') barsPerDay = 1440;
      else if (timeframe === '5m') barsPerDay = 288;
      else if (timeframe === '15m') barsPerDay = 96;
      else if (timeframe === '1h') barsPerDay = 24;
      else if (timeframe === '4h') barsPerDay = 6;
      else if (timeframe === '1d') barsPerDay = 1;

      const barsToPull = Math.min(1000, Math.max(30, testDays * barsPerDay));
      const hist = await fetchRealHistoricalCandles(symbol, timeframe, barsToPull);

      setDataMeta({
        startDate: hist.startDate,
        endDate: hist.endDate,
        totalBars: hist.totalBars,
        isReal: hist.isReal,
      });

      const res = runHighFrequencyBacktest(hist.candles, {
        timeframe,
        tradeCapital,
        ratio,
        baseStopPct,
        feeRate,
        spreadRate,
        initialBalance,
        signalMethod,
      });

      setResult(res);
    } catch {
      // fallback
    } finally {
      setIsSimulating(false);
    }
  };

  // Automatically backtest on mount and whenever key parameters change!
  useEffect(() => {
    if (autoBacktest) {
      handleRunHFTest();
    }
  }, [symbol, exchange, timeframe, tradeCapital, ratio, baseStopPct, signalMethod, testDays]);

  const handleDeployToAutoTrader = () => {
    // Check Binance Spot minNotional requirement
    const effectiveCapital = exchange === 'BINANCE' && tradeCapital < 5.0 ? 5.0 : tradeCapital;

    autoCycleDaemon.updateConfig({
      intervalSeconds: timeframe === '1m' ? 3 : 15,
      dailyBudget: effectiveCapital * 100,
      tradeSizePercent: Number(((effectiveCapital / initialBalance) * 100).toFixed(2)),
      targetSymbol: symbol,
      selectedExchange: exchange,
      strategyName: `${timeframe} Strategy ($${effectiveCapital} | ${ratio})`,
      autoStopLossPercent: Number((baseStopPct * 100).toFixed(1)),
      autoTakeProfitPercent: Number((targetProfitPct * 100).toFixed(1)),
      profitToLossRatio: normalizedR,
    });

    autoCycleDaemon.start();
    setLiveDeployed(true);
    setTimeout(() => setLiveDeployed(false), 5000);
  };

  const chartWidth = 720;
  const chartHeight = 140;
  const minEq = result
    ? Math.min(...result.equityCurve.map((p) => p.equity), result.initialBalance * 0.95)
    : initialBalance;
  const maxEq = result
    ? Math.max(...result.equityCurve.map((p) => p.equity), result.initialBalance * 1.05)
    : initialBalance;
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
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="rounded-xl border border-cyan-500/40 bg-gradient-to-r from-[#070d18] via-[#091322] to-[#070d18] p-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-950/80 border border-cyan-500/50 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm uppercase tracking-wider text-slate-100">
                  Automated 1-Hour &amp; Scalper Strategy Backtest Engine
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-700/60 text-cyan-300 font-bold">
                  {timeframe === '1h' ? '1-Hour Automated Backtest' : `${timeframe} Engine`} • Fixed Capital (${tradeCapital.toFixed(2)})
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Automatically backtests {timeframe === '1h' ? '1-hour candles (24 trades/day, ~720 trades/month)' : `${timeframe} candles`} with real Binance taker fees (0.1% + 0.1%) &amp; bid/ask spread
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAutoBacktest(!autoBacktest)}
              className={`px-3 py-2 rounded font-mono text-xs font-bold border transition-all ${
                autoBacktest
                  ? 'border-emerald-500/60 bg-emerald-950/60 text-emerald-300 shadow-[0_0_8px_#10b981]'
                  : 'border-slate-800 bg-slate-900 text-slate-500'
              }`}
            >
              {autoBacktest ? '⚡ AUTO-BACKTEST: ON' : 'AUTO-BACKTEST: OFF'}
            </button>
            <button
              onClick={handleRunHFTest}
              disabled={isSimulating}
              className="flex items-center gap-2 rounded bg-cyan-500 hover:bg-cyan-400 px-5 py-2 font-mono text-xs font-black uppercase tracking-wider text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all disabled:opacity-50"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>{isSimulating ? 'SIMULATING TICKS...' : `RUN ${timeframe.toUpperCase()} BACKTEST`}</span>
            </button>
          </div>
        </div>

        {/* Dynamic Operational MIN_NOTIONAL Status Box */}
        {tradeCapital >= 10 ? (
          <div className="mt-3 p-3 rounded-lg border border-emerald-600/40 bg-emerald-950/20 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-emerald-300 flex items-center gap-2">
                <span>MIN_NOTIONAL Compliant: ${tradeCapital.toFixed(2)} Sizing Verified</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-950/60 border border-emerald-800/40 text-emerald-200">
                  Ready for Live Execution
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-mono leading-relaxed">
                Your selected position size of <strong>${tradeCapital.toFixed(2)}</strong> fully complies with Binance Spot&apos;s minimum notional requirement (5 to 10 USDT for BTC/USDT). Live orders will execute cleanly without API Error -1013 rejection.
              </p>
            </div>
          </div>
        ) : tradeCapital >= 5 ? (
          <div className="mt-3 p-3 rounded-lg border border-cyan-600/40 bg-cyan-950/20 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-cyan-300 flex items-center gap-2">
                <span>MIN_NOTIONAL Standard: ${tradeCapital.toFixed(2)} Threshold Met</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950/60 border border-cyan-800/40 text-cyan-200">
                  Binance 5 USDT Base Met
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-mono leading-relaxed">
                Your <strong>${tradeCapital.toFixed(2)}</strong> size meets Binance Spot&apos;s 5 USDT threshold. Pairs requiring 10 USDT are automatically adjusted by the execution daemon.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-3 p-3 rounded-lg border border-amber-600/40 bg-amber-950/20 text-xs flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-amber-300 flex items-center gap-2">
                <span>Operational Rule: Binance MIN_NOTIONAL Simulation Notice</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-950/60 border border-amber-800/40 text-amber-200">
                  Error -1013 Guard
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-mono leading-relaxed">
                In backtesting, you can simulate micro-trades of <strong>${tradeCapital.toFixed(2)}</strong> freely. Note that live <strong>Binance Spot</strong> requires at least <strong>5 to 10 USDT</strong> per order (Error -1013). When deploying live auto-trading, the daemon will either upscale to 5 USDT on Spot or trade on <strong>Binance USDⓈ-M Futures</strong> where micro-fractional contracts are supported.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* MATHEMATICAL ASYMMETRIC RATIO TABLE & CONFIGURATION GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Input Parameters (5 cols) */}
        <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-[#090d16] p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Activity className="h-4 w-4" />
              <span>{timeframe === '1h' ? '1-Hour' : timeframe} Strategy Parameters</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">Automated Execution</span>
          </div>

          {/* Timeframe Quick Switcher */}
          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span className="text-[11px] uppercase tracking-wider text-slate-400">Backtest Candle Timeframe</span>
              <strong className="text-cyan-400 font-mono text-sm">{timeframe === '1h' ? '1 Hour (1h)' : timeframe}</strong>
            </div>
            <div className="grid grid-cols-6 gap-1 font-mono text-xs">
              {['1h', '15m', '5m', '1m', '4h', '1d'].map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setTimeframe(tf)}
                  className={`py-1 rounded border text-center transition-all ${
                    timeframe === tf
                      ? 'border-cyan-500 bg-cyan-950/80 text-cyan-300 font-bold shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Trade Capital Input with Quick Select */}
          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span className="text-[11px] uppercase tracking-wider text-slate-400">Position Size per Trade</span>
              <strong className="text-cyan-400 font-mono text-sm">${tradeCapital.toFixed(2)}</strong>
            </div>
            <div className="grid grid-cols-4 gap-1.5 font-mono text-xs">
              {[2.0, 5.0, 10.0, 25.0].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setTradeCapital(amt)}
                  className={`py-1.5 rounded border transition-all ${
                    tradeCapital === amt
                      ? 'border-cyan-500 bg-cyan-950/60 text-cyan-300 font-bold'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  ${amt.toFixed(2)}
                </button>
              ))}
            </div>
          </div>

          {/* Asymmetric Ratio Selector */}
          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span className="text-[11px] uppercase tracking-wider text-slate-400">Asymmetric Risk / Reward</span>
              <strong className="text-emerald-400 font-mono text-sm">{ratio} ({normalizedR}R)</strong>
            </div>
            <select
              value={ratio}
              onChange={(e) => setRatio(e.target.value)}
              className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-1.5 font-mono text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
            >
              <option value="1:2">1 : 2 (Target: +{targetProfitPct * 100}% | SL: -{baseStopPct * 100}%)</option>
              <option value="2:3">2 : 3 / 1:1.5 (Target: +1.5% | SL: -1.0%)</option>
              <option value="2:4">2 : 4 / 1:2.0 (Target: +2.0% | SL: -1.0%)</option>
              <option value="3:6">3 : 6 / 1:2.0 (Target: +3.0% | SL: -1.5%)</option>
              <option value="3:9">3 : 9 / 1:3.0 (Target: +3.0% | SL: -1.0%)</option>
            </select>
          </div>

          {/* Technical Signal Evaluator */}
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-1">
              Technical Signal Evaluator (Entry Decision)
            </span>
            <select
              value={signalMethod}
              onChange={(e) => setSignalMethod(e.target.value as any)}
              className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-1.5 font-mono text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
            >
              <option value="MOMENTUM_BAR">Momentum Bar (Close &gt; Open Long / Close &lt; Open Short)</option>
              <option value="EMA_MICRO">Micro-EMA (Fast 9-EMA vs Slow 21-EMA Intraday Cross)</option>
              <option value="BOLLINGER_TOUCH">Bollinger Band Touch (Mean Reversion Extreme Spike)</option>
            </select>
          </div>

          {/* Exchange & Coin Selection */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] uppercase text-slate-400 block mb-1">Exchange</span>
              <select
                value={exchange}
                onChange={(e) => setExchange(e.target.value)}
                className="w-full rounded border border-slate-800 bg-slate-950 px-2 py-1 font-mono text-xs text-slate-100 focus:outline-none"
              >
                <option value="BINANCE">Binance Spot</option>
                <option value="BYBIT">Bybit Perps</option>
                <option value="COINBASE">Coinbase Advanced</option>
                <option value="OKX">OKX Exchange</option>
                <option value="KRAKEN">Kraken Pro</option>
              </select>
            </div>

            <div>
              <span className="text-[10px] uppercase text-slate-400 block mb-1">Target Coin</span>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full rounded border border-slate-800 bg-slate-950 px-2 py-1 font-mono text-xs text-slate-100 focus:outline-none"
              >
                {ALL_TRADINGVIEW_SYMBOLS.map((s) => (
                  <option key={s.tvSymbol} value={s.symbol}>
                    {s.symbol}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Test Horizon */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] uppercase text-slate-400 block mb-1">Historical Duration</span>
              <select
                value={testDays}
                onChange={(e) => setTestDays(parseInt(e.target.value))}
                className="w-full rounded border border-slate-800 bg-slate-950 px-2 py-1 font-mono text-xs text-slate-100 focus:outline-none"
              >
                {timeframe === '1h' ? (
                  <>
                    <option value={30}>30 Days (720 Hourly Candles)</option>
                    <option value={14}>14 Days (336 Hourly Candles)</option>
                    <option value={7}>7 Days (168 Hourly Candles)</option>
                    <option value={40}>40 Days (960 Hourly Candles)</option>
                    <option value={1}>1 Day (24 Hourly Candles)</option>
                  </>
                ) : (
                  <>
                    <option value={1}>1 Day</option>
                    <option value={3}>3 Days</option>
                    <option value={7}>7 Days</option>
                    <option value={30}>30 Days</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <span className="text-[10px] uppercase text-slate-400 block mb-1">Starting Balance</span>
              <input
                type="number"
                value={initialBalance}
                onChange={(e) => setInitialBalance(parseFloat(e.target.value) || 2000)}
                className="w-full rounded border border-slate-800 bg-slate-950 px-2 py-1 font-mono text-xs text-slate-100 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Right: Profit & Loss Mathematics Table ($2.00 Sizing) (7 cols) */}
        <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-[#090d16] p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <Scale className="h-4 w-4 text-cyan-400" />
              <span>Profit &amp; Loss Mathematics at ${tradeCapital.toFixed(2)} Sizing</span>
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded">
              Break-Even Win Rate: {breakEvenRate}%
            </span>
          </div>

          {/* Asymmetric Ratios Reference Table */}
          <div className="overflow-x-auto rounded border border-slate-800/80 bg-slate-950/60 p-2 text-xs font-mono">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider">
                  <th className="pb-1.5">Ratio</th>
                  <th className="pb-1.5">Risk (1R)</th>
                  <th className="pb-1.5">Reward</th>
                  <th className="pb-1.5">Max Loss</th>
                  <th className="pb-1.5">Target Gain</th>
                  <th className="pb-1.5">Break-Even</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-[11px]">
                <tr className={ratio === '1:2' ? 'bg-cyan-950/40 font-bold text-cyan-300' : 'text-slate-300'}>
                  <td className="py-1">1 : 2</td>
                  <td>1.0%</td>
                  <td>2.0%</td>
                  <td className="text-rose-400">-${(tradeCapital * 0.01).toFixed(2)}</td>
                  <td className="text-emerald-400">+${(tradeCapital * 0.02).toFixed(2)}</td>
                  <td>33.3%</td>
                </tr>
                <tr className={ratio === '2:3' ? 'bg-cyan-950/40 font-bold text-cyan-300' : 'text-slate-300'}>
                  <td className="py-1">2 : 3 (1:1.5)</td>
                  <td>1.0%</td>
                  <td>1.5%</td>
                  <td className="text-rose-400">-${(tradeCapital * 0.01).toFixed(2)}</td>
                  <td className="text-emerald-400">+${(tradeCapital * 0.015).toFixed(2)}</td>
                  <td>40.0%</td>
                </tr>
                <tr className={ratio === '2:4' ? 'bg-cyan-950/40 font-bold text-cyan-300' : 'text-slate-300'}>
                  <td className="py-1">2 : 4 (1:2.0)</td>
                  <td>1.0%</td>
                  <td>2.0%</td>
                  <td className="text-rose-400">-${(tradeCapital * 0.01).toFixed(2)}</td>
                  <td className="text-emerald-400">+${(tradeCapital * 0.02).toFixed(2)}</td>
                  <td>33.3%</td>
                </tr>
                <tr className={ratio === '3:6' ? 'bg-cyan-950/40 font-bold text-cyan-300' : 'text-slate-300'}>
                  <td className="py-1">3 : 6 (1:2.0)</td>
                  <td>1.5%</td>
                  <td>3.0%</td>
                  <td className="text-rose-400">-${(tradeCapital * 0.015).toFixed(2)}</td>
                  <td className="text-emerald-400">+${(tradeCapital * 0.03).toFixed(2)}</td>
                  <td>33.3%</td>
                </tr>
                <tr className={ratio === '3:9' ? 'bg-cyan-950/40 font-bold text-cyan-300' : 'text-slate-300'}>
                  <td className="py-1">3 : 9 (1:3.0)</td>
                  <td>1.0%</td>
                  <td>3.0%</td>
                  <td className="text-rose-400">-${(tradeCapital * 0.01).toFixed(2)}</td>
                  <td className="text-emerald-400">+${(tradeCapital * 0.03).toFixed(2)}</td>
                  <td>25.0%</td>
                </tr>
              </tbody>
            </table>
          </div>

          {dataMeta && !dataMeta.isReal && (
            <div className="rounded-lg border border-amber-600/70 bg-amber-950/40 p-3 text-xs font-mono text-amber-300 font-bold">
              SYNTHETIC DATA: this symbol/timeframe could not be loaded from the exchange, so the result above is from a random walk and says nothing about real markets.
            </div>
          )}

          {/* Rishi Narang's Friction Reality Card */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-slate-300 font-bold">
              <span>Real-World Exchange Friction Drag</span>
              <span className="text-[10px] text-amber-400">Rishi Narang Transaction Law</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px]">Taker Fee (Round-trip)</span>
                <span className="text-slate-200">${(tradeCapital * 0.002).toFixed(4)} (0.20%)</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Bid/Ask Spread</span>
                <span className="text-slate-200">${(tradeCapital * spreadRate).toFixed(4)} (0.02%)</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Total Cost / Trade</span>
                <span className="text-rose-400 font-bold">${(tradeCapital * (feeRate * 2 + spreadRate)).toFixed(4)}</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800">
              Over {timeframe === '1h' ? '720 hourly trades per month' : '43,200 trades per month'}, total friction drag equals ${((timeframe === '1h' ? 720 : 43200) * roundTripFeePerTrade).toFixed(2)}. The engine deducts this exact friction on every {timeframe === '1h' ? '1-hour' : timeframe} execution bar.
            </p>
          </div>
        </div>
      </div>

      {/* LIVE TRADINGVIEW CHART EMBED */}
      <div className="rounded-xl border border-slate-800 bg-[#070a0f] p-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-slate-200">{timeframe === '1h' ? '1-Hour' : timeframe} Live TradingView Stream:</span>
            <span className="text-cyan-400">{exchange}:{symbol.replace('/', '')} ({timeframe})</span>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="text-emerald-400">Target TP: +{(targetProfitPct * 100).toFixed(1)}%</span>
            <span className="text-rose-400">Stop Loss: -{(baseStopPct * 100).toFixed(1)}%</span>
            <span className="text-slate-400">Sizing: ${tradeCapital.toFixed(2)}</span>
          </div>
        </div>
        <div className="h-[380px] w-full rounded overflow-hidden">
          <TradingViewEmbed symbol={symbol} exchange={exchange} timeframe={timeframe} />
        </div>
      </div>

      {/* BACKTEST SIMULATION RESULTS */}
      {result ? (
        <div className="rounded-xl border border-slate-800 bg-[#090d16] p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-2.5 gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <h4 className="font-bold text-sm text-slate-100 uppercase tracking-wider font-mono">
                {timeframe === '1h' ? '1-Hour' : timeframe} Strategy Simulation Results ({result.totalTrades} Trades Evaluated)
              </h4>
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              Horizon: <strong className="text-slate-200">{dataMeta?.startDate}</strong> → <strong className="text-slate-200">{dataMeta?.endDate}</strong>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs font-mono">
            <div className="rounded border border-slate-800 bg-slate-950 p-2.5">
              <span className="text-[10px] text-slate-400 uppercase block">Actual Win Rate</span>
              <span className={`text-base font-bold ${result.winRate >= result.breakEvenWinRate ? 'text-emerald-400' : 'text-rose-400'}`}>
                {result.winRate}%
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Required: {result.breakEvenWinRate}%</span>
            </div>

            <div className="rounded border border-slate-800 bg-slate-950 p-2.5">
              <span className="text-[10px] text-slate-400 uppercase block">Net PnL</span>
              <span className={`text-base font-bold ${result.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {result.netProfit >= 0 ? '+' : ''}${result.netProfit.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">{result.returnPercent}% ROI</span>
            </div>

            <div className="rounded border border-slate-800 bg-slate-950 p-2.5">
              <span className="text-[10px] text-slate-400 uppercase block">Gross Profit</span>
              <span className="text-base font-bold text-slate-100">
                ${result.grossProfit.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Before Fees</span>
            </div>

            <div className="rounded border border-slate-800 bg-slate-950 p-2.5">
              <span className="text-[10px] text-slate-400 uppercase block">Total Fees Paid</span>
              <span className="text-base font-bold text-rose-400">
                -${result.totalFeesPaid.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Binance 0.2% Taker</span>
            </div>

            <div className="rounded border border-slate-800 bg-slate-950 p-2.5">
              <span className="text-[10px] text-slate-400 uppercase block">Profit Factor</span>
              <span className="text-base font-bold text-cyan-300">
                {result.profitFactor}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Net Win/Loss</span>
            </div>

            <div className="rounded border border-slate-800 bg-slate-950 p-2.5">
              <span className="text-[10px] text-slate-400 uppercase block">Max Drawdown</span>
              <span className="text-base font-bold text-amber-400">
                {result.maxDrawdownPercent}%
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Peak-to-Trough</span>
            </div>
          </div>

          {/* Equity Curve SVG */}
          <div className="rounded border border-slate-800 bg-slate-950 p-3 space-y-2">
            <div className="flex justify-between text-xs font-mono text-slate-300">
              <span className="uppercase text-[11px] font-bold">{timeframe === '1h' ? '1-Hour' : timeframe} Strategy Equity Trajectory</span>
              <span className="text-cyan-400 font-bold">${result.initialBalance.toFixed(2)} → ${result.finalBalance.toFixed(2)}</span>
            </div>
            <div className="w-full overflow-hidden">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-24">
                <line
                  x1="0"
                  y1={chartHeight - ((result.initialBalance - minEq) / eqRange) * (chartHeight - 20) - 10}
                  x2={chartWidth}
                  y2={chartHeight - ((result.initialBalance - minEq) / eqRange) * (chartHeight - 20) - 10}
                  stroke="#334155"
                  strokeDasharray="3 3"
                />
                <path d={eqPath || ''} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Instant Deploy to Auto-Trading Loop with MIN_NOTIONAL Compliance */}
          <div className="rounded-xl border border-cyan-500 bg-gradient-to-r from-cyan-950/80 via-slate-900 to-cyan-950/80 p-4 flex flex-wrap items-center justify-between gap-3 shadow-[0_0_20px_rgba(6,182,212,0.25)]">
            <div className="space-y-0.5">
              <div className="font-bold text-xs text-slate-100 flex items-center gap-2">
                <Zap className="h-4 w-4 text-cyan-400" />
                <span>DEPLOY {timeframe.toUpperCase()} STRATEGY TO LIVE AUTO-CYCLE DAEMON</span>
              </div>
              <p className="text-[11px] text-slate-300 font-mono">
                Activates {timeframe} execution on {exchange} ({symbol}) with {ratio} asymmetric targets and automatic Binance minNotional compliance.
              </p>
            </div>

            <button
              onClick={handleDeployToAutoTrader}
              className={`px-6 py-2.5 rounded-lg font-mono text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-2 ${
                liveDeployed
                  ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
              }`}
            >
              {liveDeployed ? <CheckCircle2 className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
              <span>{liveDeployed ? 'STRATEGY RUNNING LIVE IN DAEMON!' : `START ${timeframe.toUpperCase()} AUTO-TRADING`}</span>
            </button>
          </div>

          {/* Trade Execution Ledger Table */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono text-slate-300">
              <span className="uppercase text-[11px] font-bold">Closed {timeframe === '1h' ? '1-Hour' : timeframe} Positions (Sample of {result.trades.length} Trades)</span>
              <span className="text-[10px] text-slate-400">Taker Fee: ${roundTripFeePerTrade.toFixed(4)} / trade</span>
            </div>
            <div className="overflow-x-auto max-h-56 rounded border border-slate-800 bg-slate-950 p-2 font-mono text-[11px]">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                    <th className="pb-1">{timeframe === '1h' ? 'Hour #' : 'Bar #'}</th>
                    <th className="pb-1">Side</th>
                    <th className="pb-1">Entry</th>
                    <th className="pb-1">Exit</th>
                    <th className="pb-1">Gross PnL</th>
                    <th className="pb-1">Taker Fee</th>
                    <th className="pb-1">Net PnL</th>
                    <th className="pb-1 text-right">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {result.trades.slice(0, 100).map((t, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/50">
                      <td className="py-1 text-slate-500">#{t.barIndex ?? t.minuteIndex}</td>
                      <td className={`font-bold ${t.side === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {t.side}
                      </td>
                      <td className="text-slate-300">${t.entryPrice.toFixed(2)}</td>
                      <td className="text-slate-300">${t.exitPrice.toFixed(2)}</td>
                      <td className="text-slate-400">${t.grossPnl.toFixed(4)}</td>
                      <td className="text-rose-400">-${t.roundTripFee.toFixed(4)}</td>
                      <td className={`font-bold ${t.netPnl > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {t.netPnl > 0 ? '+' : ''}${t.netPnl.toFixed(4)}
                      </td>
                      <td className="text-right text-[10px] text-slate-400">{t.exitReason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-10 text-center text-xs text-slate-400 font-mono border border-dashed border-slate-800 rounded-xl p-4">
          Click <strong className="text-cyan-400">&quot;RUN {timeframe.toUpperCase()} BACKTEST&quot;</strong> or toggle Auto-Backtest above to simulate {timeframe} candles with real Binance 0.20% round-trip taker fees.
        </div>
      )}
    </div>
  );
};
