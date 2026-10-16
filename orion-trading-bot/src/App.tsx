import React, { useState, useEffect } from 'react';
import { MarketSymbol, CompositeForecast, Candle } from './types/trading';
import { marketDataManager, INITIAL_PRICES } from './lib/market-data';
import { computeCompositeForecast } from './lib/scoring-engine';
import { idempotentBroker } from './lib/idempotent-broker';
import { HeaderBar } from './components/HeaderBar';
import { CompositeDial } from './components/CompositeDial';
import { InteractiveChart } from './components/InteractiveChart';
import { TradingViewChart } from './components/TradingViewChart';
import { ALL_TRADINGVIEW_SYMBOLS } from './lib/tradingview-service';
import { SignalsPanel } from './components/SignalsPanel';
import { BrokerPanel } from './components/BrokerPanel';
import { PositionsTable } from './components/PositionsTable';
import { AutoCyclePanel } from './components/AutoCyclePanel';
import { RiskCircuitBreakerPanel } from './components/RiskCircuitBreakerPanel';
import { TrackRecordLedger } from './components/TrackRecordLedger';
import { BacktestPanel } from './components/BacktestPanel';
import { TradingViewObserverPanel } from './components/TradingViewObserverPanel';
import { ProfitAndInvestmentAdvisor } from './components/ProfitAndInvestmentAdvisor';
import { ProcessSupervisorModal } from './components/ProcessSupervisorModal';
import { LiveTradingPanel } from './components/LiveTradingPanel';
import { BrokerConfigModal } from './components/BrokerConfigModal';
import {
  LayoutDashboard,
  Cpu,
  ShieldAlert,
  FileSpreadsheet,
  Sliders,
  TrendingUp,
  Globe,
  Compass,
  Zap,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<
    'TERMINAL' | 'AUTOCYCLE' | 'OBSERVER' | 'LIVE' | 'RISK' | 'LEDGER' | 'BACKTEST'
  >('TERMINAL');

  const [chartViewMode, setChartViewMode] = useState<'TRADINGVIEW' | 'ORION_STUDY'>('TRADINGVIEW');
  const [selectedSymbol, setSelectedSymbol] = useState<MarketSymbol>('BTC/USDT');
  const [candles, setCandles] = useState<Candle[]>(marketDataManager.getCandles('BTC/USDT'));
  const [currentPrices, setCurrentPrices] = useState<Record<MarketSymbol, number>>(INITIAL_PRICES);
  const [forecasts, setForecasts] = useState<Record<MarketSymbol, CompositeForecast>>({} as any);

  const [positions, setPositions] = useState(idempotentBroker.getPositions());
  const [orders, setOrders] = useState(idempotentBroker.getOrders());

  const [showSupervisor, setShowSupervisor] = useState(false);
  const [showBrokerConfig, setShowBrokerConfig] = useState(false);

  // Compute forecasts & subscribe to market data
  useEffect(() => {
    const symbols = ALL_TRADINGVIEW_SYMBOLS.map((s) => s.symbol);

    // Initial computation
    const initialForecasts: Record<MarketSymbol, CompositeForecast> = {} as any;
    symbols.forEach((sym) => {
      const c = marketDataManager.getCandles(sym);
      initialForecasts[sym] = computeCompositeForecast(sym, c);
    });
    setForecasts(initialForecasts);

    // Subscribe to live tick updates
    const unsubMarket = marketDataManager.subscribe((sym, updatedCandles, price) => {
      setCurrentPrices((prev) => ({ ...prev, [sym]: price }));
      if (sym === selectedSymbol) {
        setCandles([...updatedCandles]);
      }
      setForecasts((prev) => ({
        ...prev,
        [sym]: computeCompositeForecast(sym, updatedCandles),
      }));
    });

    const unsubPositions = idempotentBroker.subscribePositions(setPositions);
    const unsubOrders = idempotentBroker.subscribeOrders(setOrders);

    return () => {
      unsubMarket();
      unsubPositions();
      unsubOrders();
    };
  }, [selectedSymbol]);

  const handleSelectSymbol = (sym: string) => {
    setSelectedSymbol(sym);
    setCandles(marketDataManager.getCandles(sym));
  };

  const handleQuickTrade = (sym: MarketSymbol, _side: 'BUY' | 'SELL') => {
    setSelectedSymbol(sym);
    setCandles(marketDataManager.getCandles(sym));
    setActiveTab('TERMINAL');
  };

  const currentForecast =
    forecasts[selectedSymbol] || computeCompositeForecast(selectedSymbol, candles);
  const currentPrice = currentPrices[selectedSymbol] || marketDataManager.getCurrentPrice(selectedSymbol);

  return (
    <div className="min-h-screen bg-[#06080c] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Header Status Bar */}
      <HeaderBar
        onOpenSupervisor={() => setShowSupervisor(true)}
        onOpenBrokerConfig={() => setShowBrokerConfig(true)}
      />

      {/* Main Navigation Tabs */}
      <nav className="border-b border-slate-800 bg-[#080b11] px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1 font-mono">
          <button
            onClick={() => setActiveTab('TERMINAL')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
              activeTab === 'TERMINAL'
                ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-700/50 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span>TERMINAL &amp; EXECUTION</span>
          </button>

          <button
            onClick={() => setActiveTab('AUTOCYCLE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
              activeTab === 'AUTOCYCLE'
                ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-700/50 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="h-3.5 w-3.5" />
            <span>AUTO-CYCLE DAEMON</span>
          </button>

          <button
            onClick={() => setActiveTab('OBSERVER')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
              activeTab === 'OBSERVER'
                ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-700/50 font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="h-3.5 w-3.5 text-cyan-400" />
            <span>24/7 TV OBSERVER &amp; WEBHOOK</span>
          </button>

          <button
            onClick={() => setActiveTab('LIVE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
              activeTab === 'LIVE'
                ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-700/50 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>LIVE TRADING</span>
          </button>

          <button
            onClick={() => setActiveTab('RISK')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
              activeTab === 'RISK'
                ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-700/50 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>RISK &amp; CIRCUIT BREAKERS</span>
          </button>

          <button
            onClick={() => setActiveTab('LEDGER')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
              activeTab === 'LEDGER'
                ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-700/50 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>TRACK RECORD LEDGER</span>
          </button>

          <button
            onClick={() => setActiveTab('BACKTEST')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
              activeTab === 'BACKTEST'
                ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-700/50 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>BACKTESTING LAB</span>
          </button>
        </div>

        {/* Selected Symbol Quick Switcher */}
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="text-slate-400 hidden sm:inline">Active Symbol:</span>
          <select
            value={selectedSymbol}
            onChange={(e) => handleSelectSymbol(e.target.value)}
            className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100 font-bold focus:border-cyan-500 focus:outline-none"
          >
            {ALL_TRADINGVIEW_SYMBOLS.map((s) => (
              <option key={s.tvSymbol} value={s.symbol}>
                {s.symbol} ({s.name})
              </option>
            ))}
          </select>
        </div>
      </nav>

      {/* Main View Area */}
      <main className="flex-1 p-3 lg:p-4 overflow-y-auto">
        {activeTab === 'TERMINAL' && (
          <div className="space-y-3">
            {/* Live Profit Percentage & Investment Decision Meter */}
            <ProfitAndInvestmentAdvisor
              symbol={selectedSymbol}
              candles={candles}
              currentPrice={currentPrice}
            />

            {/* Chart Engine Mode Selector */}
            <div className="flex items-center justify-between bg-[#080b10] border border-slate-800 rounded-lg p-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                  Chart Engine:
                </span>
                <div className="flex rounded border border-slate-800 bg-slate-900/60 p-0.5 font-mono text-[11px]">
                  <button
                    onClick={() => setChartViewMode('TRADINGVIEW')}
                    className={`flex items-center gap-1 px-3 py-1 rounded font-bold transition-colors ${
                      chartViewMode === 'TRADINGVIEW'
                        ? 'bg-cyan-600 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Globe className="h-3 w-3" />
                    <span>TradingView Live Pro Engine (Real All Coins Data)</span>
                  </button>
                  <button
                    onClick={() => setChartViewMode('ORION_STUDY')}
                    className={`flex items-center gap-1 px-3 py-1 rounded font-bold transition-colors ${
                      chartViewMode === 'ORION_STUDY'
                        ? 'bg-cyan-600 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Compass className="h-3 w-3" />
                    <span>Orion UT Bot + %B Study Canvas</span>
                  </button>
                </div>
              </div>

              <div className="hidden md:flex items-center gap-2 font-mono text-[10px] text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
                <span>Connected to tradingview.com feeds</span>
              </div>
            </div>

            {/* Top Grid: Chart & Composite Dial & Order Ticket */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              {/* Chart (7 cols) */}
              <div className="lg:col-span-7">
                {chartViewMode === 'TRADINGVIEW' ? (
                  <TradingViewChart
                    symbol={selectedSymbol}
                    onSymbolChange={handleSelectSymbol}
                  />
                ) : (
                  <InteractiveChart
                    symbol={selectedSymbol}
                    candles={candles}
                    currentPrice={currentPrice}
                  />
                )}
              </div>

              {/* Composite Dial Gauge & Order Panel (5 cols) */}
              <div className="lg:col-span-5 flex flex-col gap-3">
                <CompositeDial forecast={currentForecast} />
                <BrokerPanel
                  symbol={selectedSymbol}
                  currentPrice={currentPrice}
                  forecast={currentForecast}
                />
              </div>
            </div>

            {/* Signals Matrix */}
            <SignalsPanel
              forecasts={forecasts}
              prices={currentPrices}
              selectedSymbol={selectedSymbol}
              onSelectSymbol={handleSelectSymbol}
              onQuickTrade={handleQuickTrade}
            />

            {/* Active Positions & Orders Table */}
            <PositionsTable positions={positions} orders={orders} />
          </div>
        )}

        {activeTab === 'AUTOCYCLE' && <AutoCyclePanel />}

        {activeTab === 'OBSERVER' && <TradingViewObserverPanel />}

        {activeTab === 'LIVE' && <LiveTradingPanel />}

        {activeTab === 'RISK' && <RiskCircuitBreakerPanel />}

        {activeTab === 'LEDGER' && <TrackRecordLedger />}

        {activeTab === 'BACKTEST' && <BacktestPanel />}
      </main>

      {/* Process Supervisor Modal */}
      <ProcessSupervisorModal
        isOpen={showSupervisor}
        onClose={() => setShowSupervisor(false)}
      />

      {/* Broker Config Modal */}
      <BrokerConfigModal
        isOpen={showBrokerConfig}
        onClose={() => setShowBrokerConfig(false)}
      />
    </div>
  );
}
