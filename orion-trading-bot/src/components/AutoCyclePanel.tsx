import React, { useState, useEffect } from 'react';
import { autoCycleDaemon } from '../lib/auto-cycle';
import { AutoCycleConfig, AutoCycleLog } from '../types/trading';
import { Play, Pause, Terminal, Settings2, Sliders, ShieldCheck, Trash2 } from 'lucide-react';

export const AutoCyclePanel: React.FC = () => {
  const [config, setConfig] = useState<AutoCycleConfig>(autoCycleDaemon.getConfig());
  const [logs, setLogs] = useState<AutoCycleLog[]>(autoCycleDaemon.getLogs());
  const [status, setStatus] = useState({
    enabled: config.enabled,
    cycleCount: 0,
    lastRunTime: null as number | null,
  });

  useEffect(() => {
    const unsubLogs = autoCycleDaemon.subscribeLogs(setLogs);
    const unsubStatus = autoCycleDaemon.subscribeStatus((s) => {
      setStatus(s);
      setConfig(autoCycleDaemon.getConfig());
    });

    return () => {
      unsubLogs();
      unsubStatus();
    };
  }, []);

  const handleToggleDaemon = () => {
    if (status.enabled) {
      autoCycleDaemon.stop();
    } else {
      autoCycleDaemon.start();
    }
  };

  const handleUpdate = (updates: Partial<AutoCycleConfig>) => {
    autoCycleDaemon.updateConfig(updates);
    setConfig(autoCycleDaemon.getConfig());
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-[#0b0e14] p-4 shadow-lg space-y-4">
      {/* Top Banner & Control */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 pb-3 gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded border ${
              status.enabled
                ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)] animate-pulse'
                : 'border-slate-800 bg-slate-900 text-slate-500'
            }`}
          >
            <Sliders className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-xs tracking-wider text-slate-100 uppercase">
                Auto-Cycle Execution Daemon
              </h3>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                  status.enabled
                    ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-400'
                    : 'border-slate-700 bg-slate-900 text-slate-400'
                }`}
              >
                {status.enabled ? 'ACTIVE RUNNING' : 'STANDBY PAUSED'}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Cycles Executed: <strong className="text-slate-200">{status.cycleCount}</strong>
              {status.lastRunTime && (
                <> • Last: {new Date(status.lastRunTime).toLocaleTimeString()}</>
              )}
            </div>
          </div>
        </div>

        {/* Start / Stop Toggle */}
        <button
          onClick={handleToggleDaemon}
          className={`flex items-center gap-2 rounded px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-md ${
            status.enabled
              ? 'bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)]'
          }`}
        >
          {status.enabled ? (
            <>
              <Pause className="h-4 w-4" />
              <span>PAUSE DAEMON</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              <span>START AUTONOMOUS CYCLE</span>
            </>
          )}
        </button>
      </div>

      {/* Active Campaign Parameters Banner */}
      <div className="rounded-lg border border-cyan-500/40 bg-gradient-to-r from-cyan-950/40 via-slate-900 to-cyan-950/40 p-3 text-xs space-y-2 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981] animate-pulse" />
            <span className="font-bold text-slate-200">Active Auto-Trade Plan:</span>
            <strong className="text-cyan-400 font-mono">{config.strategyName || 'Orion UT Bot Trend Surfer'}</strong>
          </div>
          <div className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded">
            Target: {config.selectedExchange || 'BINANCE'} • {config.targetSymbol || 'BTC/USDT'}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono pt-1 border-t border-slate-800">
          <div>
            <span className="text-slate-400">Daily Budget: </span>
            <strong className="text-slate-100">${config.dailyBudget}</strong>
          </div>
          <div>
            <span className="text-slate-400">Campaign Length: </span>
            <strong className="text-cyan-300">{config.tradingDurationDays} Days</strong>
          </div>
          <div>
            <span className="text-slate-400">Profit/Loss Ratio: </span>
            <strong className="text-emerald-400">1:{config.profitToLossRatio || 2.0}</strong>
          </div>
          <div>
            <span className="text-slate-400">SL / TP: </span>
            <span className="text-rose-400">-{config.autoStopLossPercent}%</span> / <span className="text-emerald-400">+{config.autoTakeProfitPercent}%</span>
          </div>
        </div>
      </div>

      {/* Strategy Tuning Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        {/* Cycle Frequency */}
        <div className="rounded border border-slate-800 bg-slate-900/40 p-3">
          <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1.5">
            Scan Interval: <strong className="text-cyan-400">{config.intervalSeconds}s</strong>
          </label>
          <div className="grid grid-cols-4 gap-1 font-mono text-[10px]">
            {[3, 5, 10, 30].map((sec) => (
              <button
                key={sec}
                onClick={() => handleUpdate({ intervalSeconds: sec })}
                className={`py-1 rounded border transition-colors ${
                  config.intervalSeconds === sec
                    ? 'border-cyan-500/50 bg-cyan-950/40 text-cyan-300 font-bold'
                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>
        </div>

        {/* Min Conviction Filter */}
        <div className="rounded border border-slate-800 bg-slate-900/40 p-3">
          <div className="flex justify-between text-[10px] text-slate-400 uppercase tracking-wider mb-1.5">
            <span>Min Conviction</span>
            <span className="text-cyan-400 font-bold font-mono">{config.minConviction}%</span>
          </div>
          <input
            type="range"
            min="40"
            max="90"
            step="5"
            value={config.minConviction}
            onChange={(e) => handleUpdate({ minConviction: parseInt(e.target.value) })}
            className="w-full accent-cyan-500 cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-1">
            <span>40% (Aggressive)</span>
            <span>90% (Ultra Strict)</span>
          </div>
        </div>

        {/* Size allocation per trade */}
        <div className="rounded border border-slate-800 bg-slate-900/40 p-3">
          <div className="flex justify-between text-[10px] text-slate-400 uppercase tracking-wider mb-1.5">
            <span>Max Trade Size</span>
            <span className="text-cyan-400 font-bold font-mono">{config.tradeSizePercent}% Eq</span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={config.tradeSizePercent}
            onChange={(e) => handleUpdate({ tradeSizePercent: parseFloat(e.target.value) })}
            className="w-full accent-cyan-500 cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-1">
            <span>1% (Conservative)</span>
            <span>10% (Risk Cap)</span>
          </div>
        </div>
      </div>

      {/* Safety Gate Rules */}
      <div className="rounded border border-slate-800 bg-slate-900/40 p-3 text-xs">
        <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
          <span>Algorithmic Safety Rule Gating</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded border border-slate-800/80 bg-slate-900/60 hover:bg-slate-900">
            <input
              type="checkbox"
              checked={config.enableUTBotFilter}
              onChange={(e) => handleUpdate({ enableUTBotFilter: e.target.checked })}
              className="accent-cyan-500 rounded"
            />
            <span className="text-[11px] text-slate-300">Require UT Bot Direction Alignment</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded border border-slate-800/80 bg-slate-900/60 hover:bg-slate-900">
            <input
              type="checkbox"
              checked={config.enablePercentBFilter}
              onChange={(e) => handleUpdate({ enablePercentBFilter: e.target.checked })}
              className="accent-cyan-500 rounded"
            />
            <span className="text-[11px] text-slate-300">Bollinger %B Anti-Exhaustion Guard</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded border border-slate-800/80 bg-slate-900/60 hover:bg-slate-900">
            <input
              type="checkbox"
              checked={config.enableMultiTimeframeConfirm}
              onChange={(e) => handleUpdate({ enableMultiTimeframeConfirm: e.target.checked })}
              className="accent-cyan-500 rounded"
            />
            <span className="text-[11px] text-slate-300">Enforce Multi-Timeframe Alignment</span>
          </label>
        </div>
      </div>

      {/* Live Daemon Stream Logs */}
      <div>
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
          <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold">
            <Terminal className="h-3.5 w-3.5 text-cyan-400" /> Daemon Execution Log
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            Real-Time Audit Trail
          </span>
        </div>

        <div className="h-44 overflow-y-auto rounded border border-slate-800/90 bg-[#06080d] p-2.5 font-mono text-[11px] space-y-1">
          {logs.length === 0 ? (
            <div className="text-slate-400 py-4 text-center">
              Awaiting auto-cycle loop startup. Logs will stream here...
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                <span className="text-slate-400 shrink-0">
                  [{new Date(log.timestamp).toLocaleTimeString()}]
                </span>
                <span
                  className={`font-bold px-1 rounded text-[9px] shrink-0 ${
                    log.level === 'EXEC'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/50'
                      : log.level === 'WARN'
                      ? 'bg-amber-950 text-amber-400 border border-amber-700/50'
                      : log.level === 'ERROR'
                      ? 'bg-rose-950 text-rose-400 border border-rose-700/50'
                      : 'bg-slate-900 text-cyan-400 border border-slate-700'
                  }`}
                >
                  {log.level}
                </span>
                <span
                  className={
                    log.level === 'EXEC'
                      ? 'text-emerald-300 font-semibold'
                      : log.level === 'ERROR'
                      ? 'text-rose-300'
                      : log.level === 'WARN'
                      ? 'text-amber-300'
                      : 'text-slate-300'
                  }
                >
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
