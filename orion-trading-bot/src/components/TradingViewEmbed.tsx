import React, { useState } from 'react';
import {
  mapTimeframeToTradingViewInterval,
  resolveTradingViewExchangeTicker,
} from '../lib/tradingview-service';
import { RefreshCw, ExternalLink, ShieldCheck } from 'lucide-react';

interface TradingViewEmbedProps {
  symbol: string;
  exchange?: string;
  timeframe?: string;
  height?: number | string;
}

export const TradingViewEmbed: React.FC<TradingViewEmbedProps> = ({
  symbol,
  exchange = 'BINANCE',
  timeframe = '1h',
  height = '100%',
}) => {
  const [reloadKey, setReloadKey] = useState(0);
  const [hasError, setHasError] = useState(false);

  // Normalize ticker and interval
  const tvTicker = resolveTradingViewExchangeTicker(exchange, symbol);
  const tvInterval = mapTimeframeToTradingViewInterval(timeframe);

  // Build the high-availability official TradingView embed URL
  const iframeSrc = `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_widget&symbol=${encodeURIComponent(
    tvTicker
  )}&interval=${encodeURIComponent(
    tvInterval
  )}&theme=dark&style=1&timezone=Etc%2FUTC&locale=en&studies=%5B%5D&hideideas=1&widgetType=chart`;

  return (
    <div className="relative w-full h-full min-h-[380px] bg-[#070a0f] flex flex-col rounded-lg overflow-hidden border border-slate-800/80">
      {/* Chart Top Status Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#090c12] border-b border-slate-800 text-[11px] font-mono text-slate-300">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
          <span className="font-bold text-slate-100">{tvTicker}</span>
          <span className="text-[10px] text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-1.5 py-0.2 rounded">
            {timeframe}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-cyan-300 transition-colors"
            title="Reload Chart Feed"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Reconnect</span>
          </button>
          <a
            href={`https://www.tradingview.com/symbols/${tvTicker.replace(':', '-')}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white"
          >
            <span>tradingview.com</span>
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </div>
      </div>

      {/* Main Iframe Canvas */}
      <div className="relative flex-1 w-full h-full min-h-[350px]">
        {hasError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-slate-950 text-slate-300 text-xs font-mono space-y-3">
            <p>TradingView feed interrupted for {tvTicker}.</p>
            <button
              onClick={() => {
                setHasError(false);
                setReloadKey((k) => k + 1);
              }}
              className="px-4 py-2 rounded bg-cyan-600 text-slate-950 font-bold hover:bg-cyan-500"
            >
              Reconnect TradingView Feed
            </button>
          </div>
        ) : (
          <iframe
            key={`${tvTicker}_${tvInterval}_${reloadKey}`}
            src={iframeSrc}
            title={`TradingView Chart - ${tvTicker}`}
            className="w-full h-full border-0 absolute inset-0"
            style={{ minHeight: '350px', height: '100%' }}
            allow="fullscreen"
            loading="lazy"
            onError={() => setHasError(true)}
          />
        )}
      </div>
    </div>
  );
};
