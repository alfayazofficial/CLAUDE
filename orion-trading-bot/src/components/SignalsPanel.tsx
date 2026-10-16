import React from 'react';
import { MarketSymbol, CompositeForecast } from '../types/trading';
import { TrendingUp, TrendingDown, Crosshair, ArrowRight } from 'lucide-react';

interface SignalsPanelProps {
  forecasts: Record<MarketSymbol, CompositeForecast>;
  prices: Record<MarketSymbol, number>;
  selectedSymbol: MarketSymbol;
  onSelectSymbol: (symbol: MarketSymbol) => void;
  onQuickTrade: (symbol: MarketSymbol, side: 'BUY' | 'SELL') => void;
}

export const SignalsPanel: React.FC<SignalsPanelProps> = ({
  forecasts,
  prices,
  selectedSymbol,
  onSelectSymbol,
  onQuickTrade,
}) => {
  const symbols: MarketSymbol[] = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'NVDA', 'AAPL', 'TSLA', 'SPY'];

  return (
    <div className="rounded-lg border border-slate-800 bg-[#0b0e14] p-3 shadow-lg">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2.5">
        <div className="flex items-center gap-2">
          <Crosshair className="h-4 w-4 text-cyan-400" />
          <h3 className="font-semibold text-xs tracking-wider text-slate-200 uppercase">
            Forecast &amp; Signal Matrix
          </h3>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">UT Bot + %B Multi-Scan</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider">
              <th className="pb-2 pl-1 font-semibold">Asset</th>
              <th className="pb-2 font-semibold">Price</th>
              <th className="pb-2 font-semibold">Score / Conviction</th>
              <th className="pb-2 font-semibold">UT Signal</th>
              <th className="pb-2 font-semibold">%B Study</th>
              <th className="pb-2 font-semibold">Target / SL</th>
              <th className="pb-2 pr-1 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {symbols.map((sym) => {
              const f = forecasts[sym];
              const p = prices[sym] || 100;
              const isSelected = selectedSymbol === sym;

              if (!f) return null;

              const isBull = f.score > 20;
              const isBear = f.score < -20;

              return (
                <tr
                  key={sym}
                  className={`group cursor-pointer transition-colors ${
                    isSelected ? 'bg-cyan-950/20' : 'hover:bg-slate-900/40'
                  }`}
                  onClick={() => onSelectSymbol(sym)}
                >
                  <td className="py-2.5 pl-1 font-mono font-bold text-slate-200">
                    <div className="flex items-center gap-1.5">
                      {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]" />}
                      <span>{sym}</span>
                      <span
                        className={`text-[8px] font-mono px-1 py-0.2 rounded ${
                          sym.includes('USDT')
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                            : 'bg-slate-900 text-slate-400 border border-slate-800'
                        }`}
                      >
                        {sym.includes('USDT') ? 'LIVE' : 'SIM'}
                      </span>
                    </div>
                  </td>

                  <td className="py-2.5 font-mono text-slate-100 font-medium">
                    ${p.toFixed(sym.includes('BTC') ? 1 : 2)}
                  </td>

                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono font-bold text-[11px] ${
                          isBull ? 'text-emerald-400' : isBear ? 'text-rose-400' : 'text-slate-400'
                        }`}
                      >
                        {f.score > 0 ? `+${f.score}` : f.score}
                      </span>
                      <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isBull ? 'bg-emerald-500' : isBear ? 'bg-rose-500' : 'bg-slate-600'
                          }`}
                          style={{ width: `${Math.min(100, f.conviction)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{f.conviction}%</span>
                    </div>
                  </td>

                  <td className="py-2.5">
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono border ${
                        f.utBotSignal === 'BUY'
                          ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-400'
                          : f.utBotSignal === 'SELL'
                          ? 'border-rose-500/40 bg-rose-950/40 text-rose-400'
                          : 'border-slate-800 bg-slate-900/40 text-slate-400'
                      }`}
                    >
                      {f.utBotSignal === 'BUY' && <TrendingUp className="h-3 w-3" />}
                      {f.utBotSignal === 'SELL' && <TrendingDown className="h-3 w-3" />}
                      {f.utBotSignal}
                    </span>
                  </td>

                  <td className="py-2.5 font-mono text-[11px]">
                    <span
                      className={
                        f.percentB > 0.8
                          ? 'text-amber-400'
                          : f.percentB < 0.2
                          ? 'text-teal-400'
                          : 'text-slate-300'
                      }
                    >
                      {f.percentB.toFixed(2)}
                    </span>
                  </td>

                  <td className="py-2.5 font-mono text-[10px] text-slate-400">
                    <div>TP: <span className="text-emerald-400">${f.suggestedTakeProfit}</span></div>
                    <div>SL: <span className="text-rose-400">${f.suggestedStopLoss}</span></div>
                  </td>

                  <td className="py-2.5 pr-1 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickTrade(sym, 'BUY');
                        }}
                        className="rounded border border-emerald-600/40 bg-emerald-950/40 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-400 hover:bg-emerald-900/60 transition-colors"
                      >
                        BUY
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickTrade(sym, 'SELL');
                        }}
                        className="rounded border border-rose-600/40 bg-rose-950/40 px-2 py-0.5 font-mono text-[10px] font-bold text-rose-400 hover:bg-rose-900/60 transition-colors"
                      >
                        SELL
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
