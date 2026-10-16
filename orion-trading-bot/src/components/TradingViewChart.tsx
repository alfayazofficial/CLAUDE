import React, { useState } from 'react';
import { resolveTradingViewSymbol, ALL_TRADINGVIEW_SYMBOLS } from '../lib/tradingview-service';
import { TradingViewEmbed } from './TradingViewEmbed';
import { ExternalLink, Search, ShieldCheck } from 'lucide-react';

interface TradingViewChartProps {
  symbol: string;
  onSymbolChange: (newSymbol: string) => void;
}

export const TradingViewChart: React.FC<TradingViewChartProps> = ({
  symbol,
  onSymbolChange,
}) => {
  const [customInput, setCustomInput] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'CRYPTO' | 'STOCKS' | 'COMMODITIES'>('ALL');
  const [activeTimeframe, setActiveTimeframe] = useState<'1m' | '5m' | '15m' | '1h' | '4h' | '1D'>('15m');

  const tvSymbol = resolveTradingViewSymbol(symbol);

  const handleSelectSymbol = (newSym: string) => {
    onSymbolChange(newSym);
    setShowSearchModal(false);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;
    onSymbolChange(customInput.trim().toUpperCase());
    setCustomInput('');
    setShowSearchModal(false);
  };

  const filteredSymbols = ALL_TRADINGVIEW_SYMBOLS.filter((s) => {
    if (categoryFilter === 'ALL') return true;
    return s.category === categoryFilter;
  });

  return (
    <div className="flex flex-col rounded-lg border border-slate-800 bg-[#090c12] shadow-xl overflow-hidden">
      {/* TradingView Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 bg-[#07090e] px-3.5 py-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981] animate-pulse" />
            <div className="font-mono text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>{symbol}</span>
              <span className="text-[10px] text-cyan-400 font-semibold px-1.5 py-0.2 rounded bg-cyan-950/60 border border-cyan-800/40">
                {tvSymbol}
              </span>
            </div>
          </div>

          {/* Timeframe Quick Switcher */}
          <div className="flex items-center rounded border border-slate-800 bg-slate-900/60 p-0.5 text-[10px] font-mono">
            {(['1m', '5m', '15m', '1h', '4h', '1D'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setActiveTimeframe(tf)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  activeTimeframe === tf
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Symbol Search and All Coins Picker Button */}
          <button
            onClick={() => setShowSearchModal(true)}
            className="flex items-center gap-1.5 rounded border border-slate-700 bg-slate-900/80 px-2.5 py-1 text-xs text-slate-300 hover:border-cyan-500 hover:text-white transition-colors"
          >
            <Search className="h-3 w-3 text-cyan-400" />
            <span className="font-mono text-[11px]">All Coins &amp; Markets</span>
          </button>
        </div>

        <div className="flex items-center gap-2.5 text-xs">
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded">
            <ShieldCheck className="h-3 w-3" />
            <span>TradingView Real-Time Data</span>
          </span>

          <a
            href={`https://www.tradingview.com/symbols/${tvSymbol.replace(':', '-')}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-cyan-300 transition-colors"
          >
            <span>tradingview.com</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Main TradingView Embed Canvas */}
      <div className="relative w-full h-[520px] bg-[#070a0f]">
        <TradingViewEmbed
          symbol={symbol}
          timeframe={activeTimeframe}
          height={520}
        />
      </div>

      {/* All Coins & Symbols Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-[#090c12] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-100 uppercase tracking-wider">
                  TradingView Symbol &amp; Coin Universe
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  Select any coin or input any TradingView symbol (e.g. BINANCE:DOGEUSDT, NASDAQ:NVDA)
                </p>
              </div>
              <button
                onClick={() => setShowSearchModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Custom Input Form */}
            <form onSubmit={handleCustomSubmit} className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                Custom TradingView Symbol Input
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="e.g. BINANCE:XRPUSDT, BYBIT:BTCUSDT, NASDAQ:AMD"
                  className="flex-1 rounded border border-slate-800 bg-slate-900 px-3 py-1.5 font-mono text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded bg-cyan-600 hover:bg-cyan-500 px-3 py-1.5 font-mono text-xs font-bold text-slate-950 uppercase"
                >
                  Load Ticker
                </button>
              </div>
            </form>

            {/* Category Filters */}
            <div className="flex gap-1.5 font-mono text-[10px]">
              {(['ALL', 'CRYPTO', 'STOCKS', 'COMMODITIES'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded border transition-colors ${
                    categoryFilter === cat
                      ? 'border-cyan-500 bg-cyan-950/60 text-cyan-300 font-bold'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Symbols Grid */}
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
              {filteredSymbols.map((item) => (
                <button
                  key={item.tvSymbol}
                  onClick={() => handleSelectSymbol(item.symbol)}
                  className="flex items-center justify-between p-2 rounded border border-slate-800/80 bg-slate-900/50 hover:bg-slate-900 hover:border-slate-600 transition-colors text-left"
                >
                  <div>
                    <div className="font-mono text-xs font-bold text-slate-100">{item.symbol}</div>
                    <div className="text-[10px] text-slate-400 truncate max-w-[130px]">{item.name}</div>
                  </div>
                  <span className="text-[9px] font-mono text-cyan-400 px-1 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/40">
                    {item.exchange}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setShowSearchModal(false)}
                className="rounded bg-slate-800 px-4 py-1.5 font-mono text-xs text-slate-300 hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
