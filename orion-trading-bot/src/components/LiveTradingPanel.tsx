import React, { useCallback, useEffect, useState } from 'react';
import { adminHeaders } from '../lib/broker-client';

interface LiveStatus {
  mode: 'paper' | 'testnet' | 'live';
  ready: boolean;
  configError?: string | null;
  connected?: boolean;
  error?: string;
  env?: string;
  canTrade?: boolean;
  usdtFree?: number;
  usdtLocked?: number;
  todayPnl?: number;
  halted?: { on: boolean; kind?: string; reason?: string };
  limits?: { maxTradeUsd: number; maxDailyLossUsd: number; maxConsecLosses: number };
  activePosition?: { symbol: string; entryPrice: number; stopLoss: number; takeProfit: number; tradeCapital: number } | null;
}

export const LiveTradingPanel: React.FC = () => {
  const [s, setS] = useState<LiveStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/live/status', { headers: adminHeaders() });
      const d = await r.json();
      setS(r.ok ? d : { mode: 'paper', ready: false, error: d.error || `HTTP ${r.status}` });
    } catch { setS({ mode: 'paper', ready: false, error: 'Server offline' }); }
  }, []);

  useEffect(() => { void load(); const t = setInterval(load, 4000); return () => clearInterval(t); }, [load]);

  const act = async (path: string, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    try {
      const r = await fetch(path, { method: 'POST', headers: adminHeaders(), body: '{}' });
      const d = await r.json().catch(() => ({}));
      setMsg(r.ok ? 'Done.' : d.error || `HTTP ${r.status}`);
    } finally { setBusy(false); void load(); }
  };

  const real = s?.mode === 'live';
  const badge = real ? 'bg-red-900/60 text-red-200 border-red-600' : s?.mode === 'testnet' ? 'bg-amber-900/50 text-amber-200 border-amber-600' : 'bg-slate-800 text-slate-200 border-slate-600';

  return (
    <div className="max-w-3xl space-y-4 text-sm text-slate-200">
      <div className="flex items-center gap-3">
        <h2 className="text-base font-bold">Live Trading (Binance Spot)</h2>
        {s && <span className={`px-2 py-0.5 rounded border text-xs font-bold ${badge}`}>{real ? 'LIVE · REAL MONEY' : s.mode === 'testnet' ? 'TESTNET · FAKE MONEY' : 'PAPER · SIMULATED'}</span>}
      </div>

      {s?.mode === 'paper' && (
        <div className="rounded border border-slate-700 p-3 space-y-1">
          <p>Orders are simulated. To trade for real, set these in the server <code>.env</code> and restart:</p>
          <pre className="bg-slate-900 p-2 rounded text-xs overflow-x-auto">{`EXECUTION_MODE=testnet      # start here (free test money): https://testnet.binance.vision
BINANCE_API_KEY=...
BINANCE_API_SECRET=...      # key needs "Enable Spot & Margin Trading", NOT withdrawals`}</pre>
          <p className="text-slate-400">Keys stay on the server and are never sent to the browser.</p>
        </div>
      )}

      {s?.configError && <div className="rounded border border-red-600 bg-red-950/40 p-3">{s.configError}. Trading is disabled until this is fixed.</div>}
      {s?.error && <div className="rounded border border-red-600 bg-red-950/40 p-3">{s.error}</div>}

      {s?.connected && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Exchange" value={s.canTrade ? 'Connected' : 'Read-only key'} />
          <Stat label="USDT free" value={(s.usdtFree ?? 0).toFixed(2)} />
          <Stat label="Today P&L" value={`${(s.todayPnl ?? 0) >= 0 ? '+' : ''}${(s.todayPnl ?? 0).toFixed(2)}`} />
          <Stat label="Entries" value={s.halted?.on ? 'HALTED' : 'Allowed'} warn={!!s.halted?.on} />
        </div>
      )}

      {s?.halted?.on && <div className="rounded border border-amber-600 bg-amber-950/40 p-3">Halted ({s.halted.kind}): {s.halted.reason}</div>}

      {s?.limits && (
        <p className="text-slate-400">Limits: max ${s.limits.maxTradeUsd} per trade · daily loss stop ${s.limits.maxDailyLossUsd} · halt after {s.limits.maxConsecLosses} losses in a row. Change them in <code>.env</code>.</p>
      )}

      {s?.activePosition && (
        <div className="rounded border border-slate-700 p-3">
          Open: {s.activePosition.symbol} ${s.activePosition.tradeCapital.toFixed(2)} @ {s.activePosition.entryPrice} · stop {s.activePosition.stopLoss} · target {s.activePosition.takeProfit} (held on Binance as an OCO order)
        </div>
      )}

      {s?.ready && s.mode !== 'paper' && (
        <div className="flex flex-wrap gap-2">
          <button disabled={busy} onClick={() => act('/api/live/kill', 'KILL SWITCH: stop the observer, halt entries and sell the open position at market. Continue?')} className="px-3 py-1.5 rounded bg-red-700 hover:bg-red-600 font-bold">Kill switch (flatten + halt)</button>
          {s.halted?.on
            ? <button disabled={busy} onClick={() => act('/api/live/resume', 'Resume allowing new entries?')} className="px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600">Resume entries</button>
            : <button disabled={busy} onClick={() => act('/api/live/halt')} className="px-3 py-1.5 rounded bg-amber-700 hover:bg-amber-600">Halt new entries</button>}
        </div>
      )}
      {msg && <p className="text-slate-400">{msg}</p>}
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string; warn?: boolean }> = ({ label, value, warn }) => (
  <div className={`rounded border p-2 ${warn ? 'border-amber-600' : 'border-slate-700'}`}>
    <div className="text-xs text-slate-400">{label}</div>
    <div className="font-bold">{value}</div>
  </div>
);
