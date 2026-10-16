import React, { useState, useEffect } from 'react';
import { CircuitBreakerState, AccountState } from '../types/trading';
import { riskManager } from '../lib/risk-manager';
import { idempotentBroker } from '../lib/idempotent-broker';
import { marketDataManager } from '../lib/market-data';
import {
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Heart,
  Sliders,
  CheckCircle2,
  Lock,
  Unlock,
} from 'lucide-react';

export const RiskCircuitBreakerPanel: React.FC = () => {
  const [risk, setRisk] = useState<CircuitBreakerState>(riskManager.getState());
  const [account, setAccount] = useState<AccountState>(idempotentBroker.getAccount());
  const [latencyHistory, setLatencyHistory] = useState<number[]>([35, 42, 38, 45, 52, 40]);

  useEffect(() => {
    const unsubRisk = riskManager.subscribe(setRisk);
    const unsubAcc = idempotentBroker.subscribeAccount(setAccount);
    const unsubHb = marketDataManager.subscribeHeartbeat((lat) => {
      setLatencyHistory((prev) => [...prev.slice(-15), lat]);
    });

    return () => {
      unsubRisk();
      unsubAcc();
      unsubHb();
    };
  }, []);

  const handleUpdate = (updates: Partial<CircuitBreakerState>) => {
    riskManager.updateConfig(updates);
    setRisk(riskManager.getState());
  };

  const handleResetCircuit = () => {
    riskManager.resetCircuitBreaker();
  };

  // Drawdown gauge percentage
  const ddPct = risk.currentDailyDrawdownPercent;
  const maxDDPct = risk.maxDailyDrawdownPercent;
  const ddRatio = Math.min(100, (ddPct / maxDDPct) * 100);

  return (
    <div className="rounded-lg border border-slate-800 bg-[#0b0e14] p-4 shadow-lg space-y-4">
      {/* Circuit Breaker Master Status Banner */}
      <div
        className={`rounded-lg border p-3.5 flex flex-wrap items-center justify-between gap-3 ${
          risk.isTripped
            ? 'border-rose-500/80 bg-rose-950/60 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
            : 'border-slate-800 bg-slate-900/40'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg border ${
              risk.isTripped
                ? 'border-rose-400 bg-rose-900 text-rose-200 animate-pulse'
                : 'border-emerald-500/40 bg-emerald-950/40 text-emerald-400'
            }`}
          >
            {risk.isTripped ? <Lock className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-xs tracking-wider text-slate-100 uppercase">
                Circuit Breaker Hard-Stop Status
              </h3>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                  risk.isTripped
                    ? 'border-rose-500 bg-rose-900/80 text-rose-200'
                    : 'border-emerald-500/40 bg-emerald-950/40 text-emerald-400'
                }`}
              >
                {risk.isTripped ? 'TRIPPED (EXECUTION BLOCKED)' : 'ARMED & MONITORING'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              {risk.isTripped
                ? risk.trippedReason
                : 'All risk gates nominal. 3% Max Daily Drawdown & Heartbeat protection active.'}
            </div>
          </div>
        </div>

        {risk.isTripped && (
          <button
            onClick={handleResetCircuit}
            className="flex items-center gap-1.5 rounded border border-rose-400 bg-rose-800 px-3 py-1.5 font-mono text-xs font-bold text-white hover:bg-rose-700 shadow-md transition-colors"
          >
            <Unlock className="h-3.5 w-3.5" />
            <span>RESET RISK CIRCUIT</span>
          </button>
        )}
      </div>

      {/* Visual Drawdown Meter vs 3% Tripwire */}
      <div className="rounded border border-slate-800 bg-slate-900/40 p-3.5 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              Daily Drawdown from Peak
            </span>
            <span className="font-mono text-xs font-bold text-slate-200">
              {ddPct.toFixed(2)}% / {maxDDPct.toFixed(1)}% Max
            </span>
          </div>
          <span className="font-mono text-[10px] text-slate-400">
            Peak Equity: ${account.peakDailyEquity.toFixed(2)}
          </span>
        </div>

        {/* Progress meter bar */}
        <div className="relative h-4 w-full bg-slate-950 rounded-full border border-slate-800 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              ddRatio >= 90
                ? 'bg-rose-600 shadow-[0_0_10px_#f43f5e]'
                : ddRatio >= 60
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${ddRatio}%` }}
          />
          {/* Tripwire Line Marker */}
          <div className="absolute top-0 bottom-0 right-0 w-0.5 bg-rose-500 shadow-[0_0_6px_#f43f5e]" />
        </div>

        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
          <span>0.0% (Safe)</span>
          <span>1.5% (Warning)</span>
          <span className="text-rose-400 font-bold">3.0% TRIPWIRE (Hard-Stop)</span>
        </div>
      </div>

      {/* Two Column Grid: Heartbeat Monitor + Strict Risk Rules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {/* Heartbeat Monitor Card */}
        <div className="rounded border border-slate-800 bg-slate-900/40 p-3.5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Heart
                className={`h-4 w-4 ${
                  risk.heartbeatStatus === 'HEALTHY'
                    ? 'text-emerald-400 animate-pulse'
                    : 'text-rose-400 animate-bounce'
                }`}
              />
              <span className="font-semibold text-xs tracking-wider text-slate-200 uppercase">
                Feed Heartbeat Watchdog
              </span>
            </div>
            <span
              className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                risk.heartbeatStatus === 'HEALTHY'
                  ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-400'
                  : 'border-rose-500 bg-rose-950 text-rose-300'
              }`}
            >
              {risk.heartbeatStatus}
            </span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Protects capital against network partitions. If websocket ticks cease for more than{' '}
            <strong className="text-slate-200 font-mono">
              {(risk.heartbeatTimeoutMs / 1000).toFixed(0)} seconds
            </strong>
            , the execution engine halts and automatically flattens active positions.
          </p>

          {/* Sparkline Latency Histogram */}
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">
              Live Ping Latency (ms)
            </div>
            <div className="flex items-end gap-1 h-12 bg-slate-950 p-1.5 rounded border border-slate-800/80">
              {latencyHistory.map((lat, i) => {
                const barHeight = Math.min(100, (lat / 120) * 100);
                return (
                  <div
                    key={i}
                    className="flex-1 bg-cyan-500/70 hover:bg-cyan-400 rounded-t transition-all"
                    style={{ height: `${barHeight}%` }}
                    title={`${lat}ms`}
                  />
                );
              })}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={risk.autoFlattenOnHeartbeatLoss}
              onChange={(e) => handleUpdate({ autoFlattenOnHeartbeatLoss: e.target.checked })}
              className="accent-cyan-500 rounded"
            />
            <span className="text-[11px] text-slate-300">
              Auto-Flatten open positions on Heartbeat Loss (&gt;10s)
            </span>
          </label>
        </div>

        {/* Risk Limits Configuration */}
        <div className="rounded border border-slate-800 bg-slate-900/40 p-3.5 space-y-3">
          <div className="border-b border-slate-800 pb-2">
            <h4 className="font-semibold text-xs tracking-wider text-slate-200 uppercase">
              Code-Enforced Thresholds
            </h4>
          </div>

          {/* Max Daily Drawdown Setting */}
          <div>
            <div className="flex justify-between text-[11px] text-slate-300 mb-1">
              <span>Max Daily Drawdown Halt:</span>
              <strong className="text-cyan-400 font-mono">{risk.maxDailyDrawdownPercent}%</strong>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="0.5"
              value={risk.maxDailyDrawdownPercent}
              onChange={(e) => handleUpdate({ maxDailyDrawdownPercent: parseFloat(e.target.value) })}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          {/* Max Position Size Setting */}
          <div>
            <div className="flex justify-between text-[11px] text-slate-300 mb-1">
              <span>Max Size Per Position:</span>
              <strong className="text-cyan-400 font-mono">{risk.maxPositionSizePercent}% Eq</strong>
            </div>
            <input
              type="range"
              min="2"
              max="20"
              step="1"
              value={risk.maxPositionSizePercent}
              onChange={(e) => handleUpdate({ maxPositionSizePercent: parseFloat(e.target.value) })}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          {/* Slippage Tolerance Ceiling */}
          <div>
            <div className="flex justify-between text-[11px] text-slate-300 mb-1">
              <span>Max Execution Slippage Ceiling:</span>
              <strong className="text-cyan-400 font-mono">{risk.slippageLimitPercent}%</strong>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.50"
              step="0.05"
              value={risk.slippageLimitPercent}
              onChange={(e) => handleUpdate({ slippageLimitPercent: parseFloat(e.target.value) })}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
