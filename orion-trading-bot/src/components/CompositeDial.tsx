import React from 'react';
import { CompositeForecast } from '../types/trading';
import { Compass, TrendingUp, TrendingDown, Shield, Gauge } from 'lucide-react';

interface CompositeDialProps {
  forecast: CompositeForecast;
}

export const CompositeDial: React.FC<CompositeDialProps> = ({ forecast }) => {
  const { score, conviction, direction, utBotSignal, percentB, rsi, multiTimeframe } = forecast;

  // Map score (-100 to 100) to gauge angle (-90deg to +90deg)
  const angle = (score / 100) * 90;

  // Direction color
  const getDirectionColor = () => {
    switch (direction) {
      case 'STRONG_BUY':
        return 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40';
      case 'BUY':
        return 'text-teal-400 border-teal-500/40 bg-teal-950/40';
      case 'STRONG_SELL':
        return 'text-rose-500 border-rose-500/40 bg-rose-950/40';
      case 'SELL':
        return 'text-amber-500 border-amber-500/40 bg-amber-950/40';
      default:
        return 'text-slate-300 border-slate-700 bg-slate-900/60';
    }
  };

  const needleColor =
    score > 25 ? '#10b981' : score < -25 ? '#f43f5e' : '#94a3b8';

  return (
    <div className="rounded-lg border border-slate-800 bg-[#0b0e14] p-4 flex flex-col justify-between shadow-lg">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-cyan-400" />
          <h3 className="font-semibold text-xs tracking-wider text-slate-200 uppercase">
            Composite Forecast Dial
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
          <span>{forecast.symbol}</span>
          <span>•</span>
          <span className="text-cyan-400">{conviction}% Conviction</span>
        </div>
      </div>

      {/* Semi-circular dial SVG */}
      <div className="relative flex flex-col items-center justify-center my-2">
        <svg viewBox="0 0 200 115" className="w-56 max-w-full drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="25%" stopColor="#fb923c" />
              <stop offset="50%" stopColor="#64748b" />
              <stop offset="75%" stopColor="#2dd4bf" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>

          {/* Background track */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#1e293b"
            strokeWidth="16"
            strokeLinecap="round"
          />

          {/* Gradient arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="12"
            strokeLinecap="round"
            opacity="0.85"
          />

          {/* Tick markers */}
          {[-90, -45, 0, 45, 90].map((deg, i) => {
            const rad = (deg - 90) * (Math.PI / 180);
            const x1 = 100 + 70 * Math.cos(rad);
            const y1 = 100 + 70 * Math.sin(rad);
            const x2 = 100 + 78 * Math.cos(rad);
            const y2 = 100 + 78 * Math.sin(rad);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#475569"
                strokeWidth="1.5"
              />
            );
          })}

          {/* Gauge Center & Needle */}
          <g transform={`rotate(${angle} 100 100)`}>
            <polygon
              points="98,100 102,100 100,24"
              fill={needleColor}
              className="transition-transform duration-500"
            />
            <circle cx="100" cy="100" r="7" fill="#0f172a" stroke={needleColor} strokeWidth="2.5" />
          </g>

          {/* Tick labels */}
          <text x="24" y="112" fill="#f43f5e" fontSize="8" fontWeight="bold">-100</text>
          <text x="96" y="88" fill="#64748b" fontSize="8" fontWeight="bold">0</text>
          <text x="160" y="112" fill="#10b981" fontSize="8" fontWeight="bold">+100</text>
        </svg>

        {/* Digital Output Value */}
        <div className="mt-1 flex flex-col items-center">
          <div className="font-mono text-2xl font-black tracking-tight" style={{ color: needleColor }}>
            {score > 0 ? `+${score}` : score}
          </div>
          <div className={`mt-0.5 rounded-full border px-3 py-0.5 text-[11px] font-bold tracking-wider uppercase ${getDirectionColor()}`}>
            {direction.replace('_', ' ')}
          </div>
        </div>
      </div>

      {/* Indicator Breakdown Pillars */}
      <div className="grid grid-cols-3 gap-2 border-t border-slate-800/80 pt-3 text-xs">
        {/* UT Bot */}
        <div className="rounded border border-slate-800/80 bg-slate-900/40 p-2 text-center">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">UT Bot Study</div>
          <div
            className={`font-mono font-bold mt-1 ${
              utBotSignal === 'BUY'
                ? 'text-emerald-400'
                : utBotSignal === 'SELL'
                ? 'text-rose-400'
                : 'text-slate-400'
            }`}
          >
            {utBotSignal}
          </div>
          <div className="text-[9px] text-slate-400 mt-0.5">ATR Trailing Stop</div>
        </div>

        {/* Bollinger %B */}
        <div className="rounded border border-slate-800/80 bg-slate-900/40 p-2 text-center">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Bollinger %B</div>
          <div
            className={`font-mono font-bold mt-1 ${
              percentB > 0.8
                ? 'text-amber-400'
                : percentB < 0.2
                ? 'text-teal-400'
                : 'text-slate-200'
            }`}
          >
            {percentB.toFixed(2)}
          </div>
          <div className="text-[9px] text-slate-400 mt-0.5">
            {percentB > 1.0 ? 'Overbought' : percentB < 0.0 ? 'Oversold' : 'Inside Band'}
          </div>
        </div>

        {/* RSI 14 */}
        <div className="rounded border border-slate-800/80 bg-slate-900/40 p-2 text-center">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">RSI Momentum</div>
          <div
            className={`font-mono font-bold mt-1 ${
              rsi > 70 ? 'text-rose-400' : rsi < 30 ? 'text-emerald-400' : 'text-slate-200'
            }`}
          >
            {rsi.toFixed(1)}
          </div>
          <div className="text-[9px] text-slate-400 mt-0.5">14-Period</div>
        </div>
      </div>

      {/* Multi-Timeframe Confirmation Matrix */}
      <div className="border-t border-slate-800/80 pt-2.5 mt-2">
        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5 uppercase tracking-wider">
          <span>Multi-Timeframe Confirmation</span>
          <span className="text-slate-400">Trend Alignment</span>
        </div>
        <div className="grid grid-cols-6 gap-1">
          {(Object.entries(multiTimeframe) as [string, 'BULL' | 'BEAR' | 'NEUTRAL'][]).map(
            ([tf, status]) => (
              <div
                key={tf}
                className={`rounded py-1 text-center font-mono text-[10px] font-bold border ${
                  status === 'BULL'
                    ? 'border-emerald-500/30 bg-emerald-950/40 text-emerald-400'
                    : status === 'BEAR'
                    ? 'border-rose-500/30 bg-rose-950/40 text-rose-400'
                    : 'border-slate-800 bg-slate-900/40 text-slate-400'
                }`}
              >
                <div>{tf}</div>
                <div className="text-[8px] font-normal opacity-80">{status}</div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
