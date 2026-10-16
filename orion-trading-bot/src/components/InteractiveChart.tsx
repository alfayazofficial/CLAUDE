import React, { useState, useRef, useMemo } from 'react';
import { Candle, MarketSymbol } from '../types/trading';
import { calculateBollingerBands, calculateUTBot } from '../lib/indicators';
import { Layers, Eye, EyeOff, Maximize2, Crosshair } from 'lucide-react';

interface InteractiveChartProps {
  symbol: MarketSymbol;
  candles: Candle[];
  currentPrice: number;
}

export const InteractiveChart: React.FC<InteractiveChartProps> = ({
  symbol,
  candles,
  currentPrice,
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1m' | '5m' | '15m' | '1h' | '1D'>('15m');
  const [showBB, setShowBB] = useState(true);
  const [showUTBot, setShowUTBot] = useState(true);
  const [showVolume, setShowVolume] = useState(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Indicators calculation
  const { trailingStops, states: utStates } = useMemo(
    () => calculateUTBot(candles, 1.5, 10),
    [candles]
  );

  // Compute Bollinger bands across all bars
  const bbData = useMemo(() => {
    return candles.map((_, i) => {
      const window = candles.slice(Math.max(0, i - 19), i + 1);
      return calculateBollingerBands(window, 20, 2.0);
    });
  }, [candles]);

  // View bounds
  const prices = candles.flatMap((c) => [c.high, c.low]);
  const minPrice = Math.min(...prices, currentPrice * 0.98);
  const maxPrice = Math.max(...prices, currentPrice * 1.02);
  const priceRange = maxPrice - minPrice || 1;

  const maxVolume = Math.max(...candles.map((c) => c.volume), 100);

  // SVG dimensions
  const width = 800;
  const height = 400;
  const paddingBottom = 45;
  const paddingRight = 65;
  const chartHeight = height - paddingBottom;
  const chartWidth = width - paddingRight;

  const candleCount = candles.length;
  const candleStep = candleCount > 0 ? chartWidth / candleCount : 10;
  const candleBodyWidth = Math.max(2, candleStep * 0.7);

  const getY = (val: number) => {
    return chartHeight - ((val - minPrice) / priceRange) * (chartHeight - 40) - 20;
  };

  const getVolY = (vol: number) => {
    const volHeight = 70;
    return height - paddingBottom - (vol / maxVolume) * volHeight;
  };

  // Build SVG path strings for Bollinger Bands
  const upperPath = bbData
    .map((b, i) => `${i === 0 ? 'M' : 'L'} ${i * candleStep + candleStep / 2} ${getY(b.upper)}`)
    .join(' ');

  const basisPath = bbData
    .map((b, i) => `${i === 0 ? 'M' : 'L'} ${i * candleStep + candleStep / 2} ${getY(b.basis)}`)
    .join(' ');

  const lowerPath = bbData
    .map((b, i) => `${i === 0 ? 'M' : 'L'} ${i * candleStep + candleStep / 2} ${getY(b.lower)}`)
    .join(' ');

  const bbAreaPath =
    upperPath +
    ' ' +
    bbData
      .slice()
      .reverse()
      .map((b, revI) => {
        const i = bbData.length - 1 - revI;
        return `L ${i * candleStep + candleStep / 2} ${getY(b.lower)}`;
      })
      .join(' ') +
    ' Z';

  // Build UT Bot Trailing Stop path
  const utPath = trailingStops
    .map((stop, i) => `${i === 0 ? 'M' : 'L'} ${i * candleStep + candleStep / 2} ${getY(stop)}`)
    .join(' ');

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    const index = Math.floor(x / candleStep);
    if (index >= 0 && index < candles.length) {
      setHoverIndex(index);
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const activeCandle = hoverIndex !== null ? candles[hoverIndex] : candles[candles.length - 1];
  const activeUT = hoverIndex !== null ? utStates[hoverIndex] : utStates[utStates.length - 1];
  const activeBB = hoverIndex !== null ? bbData[hoverIndex] : bbData[bbData.length - 1];

  return (
    <div
      ref={containerRef}
      className="flex flex-col rounded-lg border border-slate-800 bg-[#090c12] p-3 shadow-lg select-none"
    >
      {/* Chart Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2 mb-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-slate-100">
            <span>{symbol}</span>
            <span className="text-cyan-400">${currentPrice.toFixed(2)}</span>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold border ${
                symbol.includes('USDT')
                  ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-400'
                  : 'border-slate-700 bg-slate-900 text-slate-400'
              }`}
            >
              {symbol.includes('USDT') ? '● LIVE EXCHANGE' : 'SYNTHETIC MODEL'}
            </span>
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center rounded border border-slate-800 bg-slate-900/60 p-0.5">
            {(['1m', '5m', '15m', '1h', '1D'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setSelectedTimeframe(tf)}
                className={`rounded px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                  selectedTimeframe === tf
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Indicators Overlay Toggles */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setShowBB(!showBB)}
            className={`flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-mono transition-colors ${
              showBB
                ? 'border-indigo-500/40 bg-indigo-950/40 text-indigo-300'
                : 'border-slate-800 bg-slate-900/40 text-slate-400'
            }`}
          >
            <span>BB(20,2)</span>
            <span className="text-[9px] font-semibold">{showBB ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => setShowUTBot(!showUTBot)}
            className={`flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-mono transition-colors ${
              showUTBot
                ? 'border-cyan-500/40 bg-cyan-950/40 text-cyan-300'
                : 'border-slate-800 bg-slate-900/40 text-slate-400'
            }`}
          >
            <span>UT Bot (1.5,10)</span>
            <span className="text-[9px] font-semibold">{showUTBot ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => setShowVolume(!showVolume)}
            className={`flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-mono transition-colors ${
              showVolume
                ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                : 'border-slate-800 bg-slate-900/40 text-slate-400'
            }`}
          >
            <span>Vol</span>
            <span className="text-[9px] font-semibold">{showVolume ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Floating HUD Bar on Hover / Active */}
      {activeCandle && (
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-400 mb-1 px-1">
          <div>
            <span className="text-slate-400">O:</span> <span className="text-slate-200">${activeCandle.open.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-slate-400">H:</span> <span className="text-emerald-400">${activeCandle.high.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-slate-400">L:</span> <span className="text-rose-400">${activeCandle.low.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-slate-400">C:</span> <span className="text-slate-200">${activeCandle.close.toFixed(2)}</span>
          </div>
          {activeBB && showBB && (
            <div className="text-indigo-400">
              <span>%B: </span>
              <strong>{activeBB.percentB.toFixed(2)}</strong>
            </div>
          )}
          {activeUT && showUTBot && (
            <div className={activeUT.signal === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}>
              <span>UT Stop: </span>
              <strong>${activeUT.trailingStop.toFixed(2)}</strong> ({activeUT.signal})
            </div>
          )}
        </div>
      )}

      {/* Main SVG Chart Canvas */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const price = minPrice + pct * priceRange;
            const y = getY(price);
            return (
              <g key={i}>
                <line
                  x1="0"
                  y1={y}
                  x2={chartWidth}
                  y2={y}
                  stroke="#1e293b"
                  strokeDasharray="3 3"
                  strokeWidth="0.8"
                />
                <text
                  x={chartWidth + 6}
                  y={y + 3}
                  fill="#64748b"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  ${price.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Volume bars */}
          {showVolume &&
            candles.map((c, i) => {
              const x = i * candleStep + (candleStep - candleBodyWidth) / 2;
              const y = getVolY(c.volume);
              const barHeight = height - paddingBottom - y;
              const isUp = c.close >= c.open;
              return (
                <rect
                  key={`vol-${i}`}
                  x={x}
                  y={y}
                  width={candleBodyWidth}
                  height={barHeight}
                  fill={isUp ? '#10b981' : '#f43f5e'}
                  opacity={hoverIndex === i ? 0.6 : 0.22}
                />
              );
            })}

          {/* Bollinger Bands Shaded Area & Lines */}
          {showBB && (
            <>
              <path d={bbAreaPath} fill="#6366f1" opacity="0.07" />
              <path d={upperPath} fill="none" stroke="#818cf8" strokeWidth="1" strokeDasharray="2 2" opacity="0.75" />
              <path d={basisPath} fill="none" stroke="#6366f1" strokeWidth="1" opacity="0.5" />
              <path d={lowerPath} fill="none" stroke="#818cf8" strokeWidth="1" strokeDasharray="2 2" opacity="0.75" />
            </>
          )}

          {/* UT Bot Trailing Stop Line */}
          {showUTBot && (
            <path
              d={utPath}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeDasharray="4 2"
              opacity="0.9"
            />
          )}

          {/* Candlesticks */}
          {candles.map((c, i) => {
            const x = i * candleStep + (candleStep - candleBodyWidth) / 2;
            const centerX = i * candleStep + candleStep / 2;
            const isUp = c.close >= c.open;
            const topY = getY(Math.max(c.open, c.close));
            const botY = getY(Math.min(c.open, c.close));
            const bodyHeight = Math.max(1.5, botY - topY);

            const highY = getY(c.high);
            const lowY = getY(c.low);

            const color = isUp ? '#10b981' : '#f43f5e';

            const ut = utStates[i];

            return (
              <g key={`candle-${i}`}>
                {/* High/Low Wick */}
                <line
                  x1={centerX}
                  y1={highY}
                  x2={centerX}
                  y2={lowY}
                  stroke={color}
                  strokeWidth="1.2"
                />

                {/* Body */}
                <rect
                  x={x}
                  y={topY}
                  width={candleBodyWidth}
                  height={bodyHeight}
                  fill={color}
                  rx="0.5"
                />

                {/* UT Bot Buy Trigger Marker */}
                {showUTBot && ut && ut.isBuyTrigger && (
                  <g transform={`translate(${centerX}, ${lowY + 14})`}>
                    <polygon points="0,-8 5,2 -5,2" fill="#10b981" />
                    <text
                      x="0"
                      y="11"
                      fill="#10b981"
                      fontSize="7"
                      fontWeight="bold"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      BUY
                    </text>
                  </g>
                )}

                {/* UT Bot Sell Trigger Marker */}
                {showUTBot && ut && ut.isSellTrigger && (
                  <g transform={`translate(${centerX}, ${highY - 14})`}>
                    <polygon points="0,8 5,-2 -5,-2" fill="#f43f5e" />
                    <text
                      x="0"
                      y="-5"
                      fill="#f43f5e"
                      fontSize="7"
                      fontWeight="bold"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      SELL
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Current Live Price Horizon Line */}
          <line
            x1="0"
            y1={getY(currentPrice)}
            x2={chartWidth}
            y2={getY(currentPrice)}
            stroke="#06b6d4"
            strokeWidth="1"
            strokeDasharray="4 3"
          />
          <g transform={`translate(${chartWidth}, ${getY(currentPrice) - 8})`}>
            <rect x="0" y="0" width="58" height="16" fill="#06b6d4" rx="2" />
            <text
              x="29"
              y="11"
              fill="#080b10"
              fontSize="9"
              fontWeight="bold"
              textAnchor="middle"
              fontFamily="monospace"
            >
              ${currentPrice.toFixed(1)}
            </text>
          </g>

          {/* Crosshair on Hover */}
          {hoverIndex !== null && hoverIndex < candles.length && (
            <g>
              <line
                x1={hoverIndex * candleStep + candleStep / 2}
                y1="0"
                x2={hoverIndex * candleStep + candleStep / 2}
                y2={chartHeight}
                stroke="#64748b"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <line
                x1="0"
                y1={getY(activeCandle.close)}
                x2={chartWidth}
                y2={getY(activeCandle.close)}
                stroke="#64748b"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
