import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Activity,
  Zap,
  PowerOff,
  RefreshCw,
  Cpu,
  Server,
  AlertTriangle,
} from 'lucide-react';
import { AccountState, CircuitBreakerState } from '../types/trading';
import { idempotentBroker } from '../lib/idempotent-broker';
import { riskManager } from '../lib/risk-manager';
import { marketDataManager } from '../lib/market-data';
import { PaperBroker, PaperBrokerState } from '../lib/broker-client';

interface HeaderBarProps {
  onOpenSupervisor: () => void;
  onOpenBrokerConfig: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  onOpenSupervisor,
  onOpenBrokerConfig,
}) => {
  const [account, setAccount] = useState<AccountState>(idempotentBroker.getAccount());
  const [risk, setRisk] = useState<CircuitBreakerState>(riskManager.getState());
  const [latency, setLatency] = useState<number>(42);
  const [confirmFlatten, setConfirmFlatten] = useState(false);
  const [marketStatuses, setMarketStatuses] = useState(marketDataManager.getAllStatuses());
  const [isSyncing, setIsSyncing] = useState(false);
  const [paperState, setPaperState] = useState<PaperBrokerState>(PaperBroker.getState());

  useEffect(() => {
    const unsubBroker = PaperBroker.subscribe(setPaperState);
    const unsubAcc = idempotentBroker.subscribeAccount(setAccount);
    const unsubRisk = riskManager.subscribe(setRisk);
    const unsubStatus = marketDataManager.subscribeStatus(setMarketStatuses);
    const unsubHb = marketDataManager.subscribeHeartbeat((lat) => {
      setLatency(lat);
      riskManager.updateHeartbeat(Date.now());
    });

    const interval = setInterval(() => {
      riskManager.checkHeartbeatLoss();
    }, 2000);

    return () => {
      unsubBroker();
      unsubAcc();
      unsubRisk();
      unsubStatus();
      unsubHb();
      clearInterval(interval);
    };
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    await marketDataManager.syncRealCryptoPrices();
    setTimeout(() => setIsSyncing(false), 600);
  };

  const handleEmergencyFlatten = () => {
    if (!confirmFlatten) {
      setConfirmFlatten(true);
      setTimeout(() => setConfirmFlatten(false), 4000);
      return;
    }
    riskManager.triggerEmergencyFlatten('MANUAL_OPERATOR_OVERRIDE');
    setConfirmFlatten(false);
  };

  const isDailyPnLPositive = account.dailyPnL >= 0;

  return (
    <header className="border-b border-slate-800 bg-[#07090e] px-4 py-2.5 text-xs text-slate-300">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Logo & Platform Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded border border-cyan-500/30 bg-cyan-950/40 text-cyan-400 font-bold shadow-[0_0_12px_rgba(6,182,212,0.25)]">
              Ω
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold tracking-wider text-slate-100 uppercase">
                <span>ORION FORECAST</span>
                <span className="rounded bg-cyan-900/60 px-1 py-0.5 text-[10px] text-cyan-300 border border-cyan-700/50">
                  LIVE ENGINE
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <span>UT BOT + %B STUDY</span>
                <span className="text-slate-600">•</span>
                <span>IDEMPOTENT EXECUTION</span>
              </div>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block" />

          {/* Broker Status Pill */}
          <button
            onClick={onOpenBrokerConfig}
            className="hidden sm:flex items-center gap-2 rounded border border-slate-700 bg-slate-900/80 px-2.5 py-1 hover:border-slate-500 transition-colors"
          >
            <Server className="h-3.5 w-3.5 text-slate-400" />
            <span>
              Broker: <strong className="text-cyan-400">{idempotentBroker.getConfig().provider}</strong>
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
          </button>

          {/* Market Data Feed Pill & Sync Action */}
          <button
            onClick={handleManualSync}
            className="hidden md:flex items-center gap-1.5 rounded border border-slate-700 bg-slate-900/80 px-2 py-1 hover:border-cyan-500 transition-colors"
            title="Click to sync real-time spot prices from Coinbase/Binance public exchanges"
          >
            <RefreshCw className={`h-3 w-3 text-cyan-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="text-[10px] font-mono">
              Feed: <strong className="text-emerald-400">COINBASE/BINANCE</strong>
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]" />
          </button>
        </div>

        {/* Live Metrics: Equity, PnL, Latency, Heartbeat */}
        <div className="flex items-center gap-3 sm:gap-5">
          {/* Heartbeat Status */}
          <div className="flex items-center gap-1.5" title="Data Feed WebSocket Heartbeat">
            <Activity
              className={`h-3.5 w-3.5 ${
                risk.heartbeatStatus === 'HEALTHY'
                  ? 'text-emerald-400 animate-pulse'
                  : risk.heartbeatStatus === 'WARNING'
                  ? 'text-amber-400'
                  : 'text-rose-500 animate-bounce'
              }`}
            />
            <span className="text-slate-400 hidden md:inline">Feed Latency:</span>
            <span
              className={`font-mono font-medium ${
                latency < 60 ? 'text-emerald-400' : latency < 150 ? 'text-amber-400' : 'text-rose-400'
              }`}
            >
              {latency}ms
            </span>
          </div>

          {/* Account Balance & Equity */}
          <div className="flex items-center gap-3 border-l border-r border-slate-800 px-3">
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Account Equity</div>
              <div className="font-mono text-sm font-bold text-slate-100">
                ${account.equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Day P&amp;L</div>
              <div
                className={`font-mono text-sm font-bold flex items-center gap-1 ${
                  isDailyPnLPositive ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                <span>{isDailyPnLPositive ? '+' : ''}${account.dailyPnL.toFixed(2)}</span>
                <span className="text-[10px] font-normal">
                  ({isDailyPnLPositive ? '+' : ''}{account.dailyPnLPercent.toFixed(2)}%)
                </span>
              </div>
            </div>

            {/* Live Paper Profit / Loss Status Pill */}
            <div className="hidden xl:flex flex-col pl-3 border-l border-slate-800 font-mono">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Paper Return</span>
              <div
                className={`text-sm font-bold flex items-center gap-1 ${
                  paperState.balance >= 2000 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                <span>
                  {paperState.balance >= 2000 ? '+' : ''}
                  {(((paperState.balance - 2000) / 2000) * 100).toFixed(2)}%
                </span>
                <span className="text-[9px] font-normal px-1 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-400">
                  {paperState.activePosition ? 'IN TRADE' : 'FLAT'}
                </span>
              </div>
            </div>
          </div>

          {/* Circuit Breaker Status Indicator */}
          <div className="flex items-center gap-2">
            {risk.isTripped ? (
              <div className="flex items-center gap-1.5 rounded border border-rose-500 bg-rose-950/60 px-2 py-1 text-rose-300 font-semibold animate-pulse">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                <span>CIRCUIT TRIPPED (HALTED)</span>
              </div>
            ) : (
              <div className="hidden lg:flex items-center gap-1.5 rounded border border-slate-800 bg-slate-900/60 px-2 py-1 text-slate-300">
                <ShieldAlert className="h-3.5 w-3.5 text-emerald-400" />
                <span>Risk Gate: </span>
                <span className="font-mono text-emerald-400">
                  {risk.currentDailyDrawdownPercent.toFixed(1)}% / {risk.maxDailyDrawdownPercent}% DD Max
                </span>
              </div>
            )}
          </div>

          {/* Process Supervisor Link */}
          <button
            onClick={onOpenSupervisor}
            className="flex items-center gap-1.5 rounded border border-slate-700 bg-slate-900/60 px-2.5 py-1 text-slate-300 hover:border-slate-500 transition-colors"
            title="Process Supervisor & Reliability Status"
          >
            <Cpu className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Supervisor</span>
          </button>

          {/* Emergency Kill Switch */}
          <button
            onClick={handleEmergencyFlatten}
            className={`flex items-center gap-1.5 rounded px-3 py-1 font-bold transition-all shadow-sm ${
              confirmFlatten
                ? 'bg-rose-600 text-white animate-pulse border border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.6)]'
                : 'bg-rose-950/80 text-rose-300 border border-rose-800/80 hover:bg-rose-900 hover:text-white'
            }`}
            title="Immediately market-closes all active positions and rejects any routing orders"
          >
            <PowerOff className="h-3.5 w-3.5" />
            <span>{confirmFlatten ? 'CONFIRM KILL ALL' : 'KILL / FLATTEN'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
