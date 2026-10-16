import React, { useState, useEffect } from 'react';
import { PaperBroker, PaperBrokerState, ClosedPaperTrade, adminHeaders } from '../lib/broker-client';
import { globalTradingViewObserver, ObserverLog } from '../lib/observer-client';
import {
  Zap,
  Play,
  Pause,
  RefreshCw,
  Send,
  Bell,
  CheckCircle2,
  Copy,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
  Activity,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  AlertCircle,
} from 'lucide-react';

export const TradingViewObserverPanel: React.FC = () => {
  const [brokerState, setBrokerState] = useState<PaperBrokerState>(PaperBroker.getState());
  const [observerStatus, setObserverStatus] = useState({
    isRunning: globalTradingViewObserver.isRunning,
    symbol: globalTradingViewObserver.symbol,
    lastPrice: 0,
  });
  const [logs, setLogs] = useState<ObserverLog[]>(globalTradingViewObserver.getLogs());

  // Configuration options
  const [symbol, setSymbol] = useState(globalTradingViewObserver.symbol);
  const [ratio, setRatio] = useState(globalTradingViewObserver.ratio);
  const [tradeCapital, setTradeCapital] = useState(globalTradingViewObserver.tradeCapital);
  const [timeframe, setTimeframe] = useState(globalTradingViewObserver.timeframe);

  // Telegram credentials
  const [telegramToken, setTelegramToken] = useState(() => {
    return localStorage.getItem('orion_tg_token') || '';
  });
  const [telegramChatId, setTelegramChatId] = useState(() => {
    return localStorage.getItem('orion_tg_chat_id') || '';
  });
  const [telegramTestStatus, setTelegramTestStatus] = useState<string | null>(null);

  // Webhook secret
  // Never ship a real secret in client code: paste the value from your server .env here (only needed for the simulator / Pine alert JSON).
  const [webhookSecret, setWebhookSecret] = useState('');
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [webhookSimStatus, setWebhookSimStatus] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to PaperBroker state changes
    const unsubBroker = PaperBroker.subscribe(setBrokerState);

    // Subscribe to 24/7 Observer status and logs
    const unsubStatus = globalTradingViewObserver.subscribeStatus((st) => {
      setObserverStatus(st);
    });
    const unsubLogs = globalTradingViewObserver.subscribeLogs(setLogs);

    return () => {
      unsubBroker();
      unsubStatus();
      unsubLogs();
    };
  }, []);

  const handleToggleObserver = async () => {
    if (observerStatus.isRunning) {
      await globalTradingViewObserver.stop();
      return;
    }
    globalTradingViewObserver.updateConfig({ symbol, ratio, tradeCapital, timeframe });
    const err = await globalTradingViewObserver.start();
    if (err) {
      setTelegramTestStatus(`❌ Could not start observer: ${err}`);
      setTimeout(() => setTelegramTestStatus(null), 6000);
    }
  };

  const handleSaveTelegram = () => {
    localStorage.setItem('orion_tg_token', telegramToken);
    localStorage.setItem('orion_tg_chat_id', telegramChatId);
    setTelegramTestStatus('Saved in this browser for test pings. Live alerts use TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID from the server .env.');
    setTimeout(() => setTelegramTestStatus(null), 3500);
  };

  const handleTestTelegram = async () => {
    setTelegramTestStatus('Sending test ping to Telegram...');
    try {
      const res = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({
          chatId: telegramChatId,
          botToken: telegramToken,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTelegramTestStatus('✅ Telegram test alert delivered successfully!');
      } else {
        setTelegramTestStatus(`❌ Delivery failed: ${data.error || 'Check Bot Token & Chat ID'}`);
      }
    } catch (err: any) {
      setTelegramTestStatus(`❌ Request error: ${err.message}`);
    }
    setTimeout(() => setTelegramTestStatus(null), 5000);
  };

  const handleSimulateWebhook = async (action: 'BUY' | 'SELL' | 'CLOSE') => {
    setWebhookSimStatus(`Triggering Webhook ${action}...`);
    try {
      const livePrice = observerStatus.lastPrice || 68500.0;
      const res = await fetch('/webhook/tradingview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: webhookSecret,
          ticker: symbol,
          action,
          price: livePrice,
          ratio,
          tradeCapital,
        }),
      });
      const data = await res.json();
      if (data.ok || data.success) {
        setWebhookSimStatus(`✅ Webhook verified (200 OK): ${action} at $${livePrice.toFixed(2)}`);
      } else {
        setWebhookSimStatus(`⚠️ Webhook rejected: ${data.error || data.reason || 'Unauthorized'}`);
      }
    } catch (err: any) {
      setWebhookSimStatus(`❌ Webhook error: ${err.message}`);
    }
    setTimeout(() => setWebhookSimStatus(null), 4000);
  };

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/webhook/tradingview`
    : 'http://localhost:3000/webhook/tradingview';

  const pineScriptAlertJson = JSON.stringify(
    {
      secret: webhookSecret || 'PASTE_TRADINGVIEW_WEBHOOK_SECRET_HERE',
      ticker: "{{ticker}}",
      action: "{{strategy.order.action}}",
      price: "{{close}}",
    },
    null,
    2
  );

  // Calculate live unrealized PnL if active position exists
  const activePos = brokerState.activePosition;
  let unrealizedPnL = 0;
  let unrealizedPct = 0;
  if (activePos && observerStatus.lastPrice > 0) {
    const isBuy = activePos.side === 'BUY';
    const ret = isBuy
      ? (observerStatus.lastPrice - activePos.entryPrice) / activePos.entryPrice
      : (activePos.entryPrice - observerStatus.lastPrice) / activePos.entryPrice;
    unrealizedPnL = activePos.tradeCapital * ret;
    unrealizedPct = ret * 100;
  }

  return (
    <div className="space-y-5">
      {/* 24/7 Observer Top Header Card */}
      <div className="rounded-xl border border-cyan-500/40 bg-gradient-to-r from-[#070d18] via-[#091322] to-[#070d18] p-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-950/80 border border-cyan-500/50 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm uppercase tracking-wider text-slate-100">
                  24/7 TradingView Continuous Observer &amp; Paper Broker
                </h3>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                    observerStatus.isRunning
                      ? 'border-emerald-500/50 bg-emerald-950/60 text-emerald-300 shadow-[0_0_8px_#10b981]'
                      : 'border-slate-700 bg-slate-900 text-slate-400'
                  }`}
                >
                  {observerStatus.isRunning ? 'RUNNING 24/7' : 'STANDBY PAUSED'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Watches TradingView 24/7 without Binance API keys • Simulates real fills with 0.1% taker fees • Telegram channel alerts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleObserver}
              className={`flex items-center gap-2 rounded px-5 py-2.5 font-mono text-xs font-black uppercase tracking-wider transition-all shadow-md ${
                observerStatus.isRunning
                  ? 'bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]'
              }`}
            >
              {observerStatus.isRunning ? (
                <>
                  <Pause className="h-4 w-4" />
                  <span>PAUSE 24/7 OBSERVER</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  <span>START 24/7 OBSERVER</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Stream Status Bar */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className={`h-2 w-2 rounded-full ${observerStatus.isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
              <span>Target: <strong className="text-cyan-300">{symbol}</strong> ({timeframe}m)</span>
            </div>
            <span className="text-slate-600">•</span>
            <div className="text-slate-300">
              Live Stream Price: <strong className="text-emerald-400">${observerStatus.lastPrice > 0 ? observerStatus.lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'Streaming...'}</strong>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            {observerStatus.isRunning && (globalTradingViewObserver as any).plan?.enabled ? (
              <span>
                Daily plan: <strong className="text-white">{(globalTradingViewObserver as any).plan.counts.total}/{(globalTradingViewObserver as any).plan.maxPerDay}</strong>{' '}
                (S {(globalTradingViewObserver as any).plan.counts.SMALL}/{(globalTradingViewObserver as any).plan.quotas.SMALL} · M {(globalTradingViewObserver as any).plan.counts.MEDIUM}/{(globalTradingViewObserver as any).plan.quotas.MEDIUM} · B {(globalTradingViewObserver as any).plan.counts.BIG}/{(globalTradingViewObserver as any).plan.quotas.BIG})
              </span>
            ) : (
              <span>Sizing: <strong className="text-white">${tradeCapital.toFixed(2)}</strong></span>
            )}
            <span>•</span>
            <span>Target R:R: <strong className="text-cyan-300">{ratio}</strong></span>
            <span>•</span>
            <span>Friction: <strong className="text-rose-400">0.20% Taker</strong></span>
          </div>
        </div>
      </div>

      {/* PAPER BROKER STATE HUD ($2,000.00 Balance & Active Position) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Balance Card */}
        <div className="rounded-xl border border-slate-800 bg-[#090d16] p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span className="uppercase text-[10px] tracking-wider flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-cyan-400" /> Paper Trading Capital
            </span>
            <button
              onClick={() => { if (window.confirm('Reset the paper account to $2,000 and erase all trade history?')) void PaperBroker.reset(); }}
              className="text-[10px] text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-0.5"
              title="Reset Paper Balance to $2,000"
            >
              <RotateCcw className="h-2.5 w-2.5" />
              <span>Reset</span>
            </button>
          </div>
          <div className="font-mono text-2xl font-black text-slate-100 flex items-baseline gap-2">
            <span>${brokerState.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="text-[11px] font-bold text-slate-400 font-sans">USD</span>
          </div>
          <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span>Starting: $2,000.00</span>
            <span className={brokerState.balance >= 2000 ? 'text-emerald-400' : 'text-rose-400'}>
              {brokerState.balance >= 2000 ? '+' : ''}${(brokerState.balance - 2000).toFixed(2)} Net PnL
            </span>
          </div>
        </div>

        {/* Active Trade Position Card */}
        <div className="rounded-xl border border-slate-800 bg-[#090d16] p-3.5 space-y-2 md:col-span-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="uppercase text-[10px] tracking-wider text-slate-400 flex items-center gap-1">
              <Activity className="h-3 w-3 text-cyan-400" /> Active 1-Trade Execution State
            </span>
            {activePos && (
              <button
                onClick={() => PaperBroker.manualClose(observerStatus.lastPrice || activePos.entryPrice)}
                className="px-2 py-0.5 rounded bg-rose-600/80 hover:bg-rose-500 text-[10px] font-bold text-white uppercase tracking-wider transition-all"
              >
                Close Trade Now
              </button>
            )}
          </div>

          {activePos ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono text-xs font-black px-2 py-0.5 rounded ${
                      activePos.side === 'BUY'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50'
                        : 'bg-rose-950 text-rose-300 border border-rose-700/50'
                    }`}
                  >
                    {activePos.side} {activePos.symbol}
                  </span>
                  <span className="text-xs font-mono text-slate-300">
                    Entry: <strong>${activePos.entryPrice.toFixed(2)}</strong>
                  </span>
                </div>

                <div className="font-mono text-xs">
                  <span>Live Unrealized: </span>
                  <strong className={`font-bold ${unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {unrealizedPnL >= 0 ? '+' : ''}${unrealizedPnL.toFixed(4)} ({unrealizedPct >= 0 ? '+' : ''}{unrealizedPct.toFixed(2)}%)
                  </strong>
                </div>
              </div>

              {/* TP & SL Target Tracker */}
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono p-2 rounded bg-slate-950 border border-slate-800/80">
                <div className="flex justify-between items-center text-emerald-400">
                  <span>Take Profit (TP):</span>
                  <strong>${activePos.takeProfit.toFixed(2)} (+${(activePos.tradeCapital * 0.02).toFixed(2)})</strong>
                </div>
                <div className="flex justify-between items-center text-rose-400">
                  <span>Stop Loss (SL):</span>
                  <strong>${activePos.stopLoss.toFixed(2)} (-${(activePos.tradeCapital * 0.01).toFixed(2)})</strong>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-2 text-center text-xs font-mono text-slate-500 border border-dashed border-slate-800 rounded p-2">
              Awaiting Next Signal • Zero Exposure • 24/7 Scanner Ready
            </div>
          )}
        </div>
      </div>

      {/* DUAL CONFIGURATION & MONITORING GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Observer Ticker & Webhook Console (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Webhook Receiver Guide Card */}
          <div className="rounded-xl border border-slate-800 bg-[#090d16] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <ExternalLink className="h-4 w-4" />
                <span>TradingView Webhook Alert Receiver</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded">
                Live HTTP POST
              </span>
            </div>

            <p className="text-[11px] text-slate-300 font-mono">
              In TradingView, create an Alert on any Indicator / Pine Script, select <strong>Webhook URL</strong>, and paste this endpoint:
            </p>

            {/* Webhook Endpoint Box */}
            <div className="flex items-center gap-2 p-2 rounded bg-slate-950 border border-slate-800 font-mono text-xs">
              <span className="text-slate-400 text-[10px] uppercase font-bold shrink-0">URL:</span>
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className="flex-1 bg-transparent text-cyan-300 text-[11px] focus:outline-none"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(webhookUrl);
                  setCopiedWebhook(true);
                  setTimeout(() => setCopiedWebhook(false), 2000);
                }}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold flex items-center gap-1"
              >
                {copiedWebhook ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copiedWebhook ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Pine Script Alert JSON Template */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>Pine Script Alert Message Payload:</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(pineScriptAlertJson);
                    setCopiedPayload(true);
                    setTimeout(() => setCopiedPayload(false), 2000);
                  }}
                  className="text-cyan-400 hover:text-white flex items-center gap-1"
                >
                  <Copy className="h-3 w-3" />
                  <span>{copiedPayload ? 'Copied Payload' : 'Copy JSON'}</span>
                </button>
              </div>
              <pre className="p-2.5 rounded bg-slate-950 border border-slate-800 font-mono text-[10px] text-slate-300 overflow-x-auto leading-relaxed">
                {pineScriptAlertJson}
              </pre>

              <div className="p-2 rounded bg-amber-950/20 border border-amber-800/40 text-[10px] font-mono text-amber-300/90 leading-relaxed">
                <strong>Note:</strong> Webhooks require a paid TradingView plan (Essential, Plus, or Premium), and 2FA must be enabled on your TradingView account.
              </div>
            </div>

            {/* Interactive Webhook Simulator */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[10px] uppercase text-slate-400 font-bold">Simulate Webhook Trigger:</span>
                {webhookSimStatus && <span className="text-[10px] text-cyan-300 font-bold">{webhookSimStatus}</span>}
              </div>
              <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                <button
                  onClick={() => handleSimulateWebhook('BUY')}
                  className="py-1.5 rounded bg-emerald-600/80 hover:bg-emerald-500 font-bold text-white text-[11px] flex items-center justify-center gap-1"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  <span>Test BUY ($2.00)</span>
                </button>
                <button
                  onClick={() => handleSimulateWebhook('SELL')}
                  className="py-1.5 rounded bg-rose-600/80 hover:bg-rose-500 font-bold text-white text-[11px] flex items-center justify-center gap-1"
                >
                  <ArrowDownRight className="h-3.5 w-3.5" />
                  <span>Test SELL ($2.00)</span>
                </button>
                <button
                  onClick={() => handleSimulateWebhook('CLOSE')}
                  className="py-1.5 rounded bg-slate-800 hover:bg-slate-700 font-bold text-slate-300 text-[11px]"
                >
                  Test CLOSE
                </button>
              </div>
            </div>
          </div>

          {/* 24/7 Live Stream Logs Feed */}
          <div className="rounded-xl border border-slate-800 bg-[#090d16] p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono border-b border-slate-800 pb-2">
              <span className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-cyan-400" />
                <span>24/7 Observer Real-Time Ticker Stream</span>
              </span>
              <span className="text-[10px] text-slate-500">{logs.length} events logged</span>
            </div>

            <div className="overflow-y-auto max-h-56 space-y-1 font-mono text-[11px] pr-1">
              {logs.length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-xs">
                  Observer ready. Click "START 24/7 OBSERVER" to start the live tick stream.
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-1.5 rounded bg-slate-950/70 border border-slate-800/60 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-slate-500">
                        {new Date(log.time).toLocaleTimeString()}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1 py-0.2 rounded ${
                          log.type === 'ENTRY'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : log.type === 'EXIT'
                            ? 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                            : log.type === 'ERROR'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {log.type}
                      </span>
                      <span className="text-slate-300 text-[10px]">{log.message}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Observer Setup & Telegram Alert Configuration (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Target Symbol & Sizing Setup */}
          <div className="rounded-xl border border-slate-800 bg-[#090d16] p-4 space-y-3 text-xs font-mono">
            <span className="font-bold uppercase tracking-wider text-slate-200 block border-b border-slate-800 pb-2">
              Observer Parameters
            </span>

            <div>
              <span className="text-[10px] uppercase text-slate-400 block mb-1">Target Market Symbol</span>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                className="w-full rounded border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-slate-100 focus:outline-none"
                placeholder="e.g. BINANCE:BTCUSDT"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] uppercase text-slate-400 block mb-1">Trade Size ($)</span>
                <input
                  type="number"
                  value={tradeCapital}
                  onChange={(e) => setTradeCapital(parseFloat(e.target.value) || 2.0)}
                  className="w-full rounded border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <span className="text-[10px] uppercase text-slate-400 block mb-1">Ratio (TP/SL)</span>
                <select
                  value={ratio}
                  onChange={(e) => setRatio(e.target.value)}
                  className="w-full rounded border border-slate-800 bg-slate-950 px-2 py-1.5 text-slate-100 focus:outline-none"
                >
                  <option value="1:2">1 : 2 (+2% TP / -1% SL)</option>
                  <option value="1:3">1 : 3 (+3% TP / -1% SL)</option>
                  <option value="1:1.5">1 : 1.5 (+1.5% TP / -1% SL)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Telegram Channel Alert Dispatcher */}
          <div className="rounded-xl border border-slate-800 bg-[#090d16] p-4 space-y-3 text-xs font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                <Bell className="h-4 w-4 text-cyan-400" />
                <span>Telegram Execution Channel</span>
              </span>
              <span className="text-[10px] text-cyan-400">Instant Push</span>
            </div>

            <p className="text-[10px] text-slate-400 leading-snug">
              Every position opened or closed by the 24/7 observer or TradingView webhook sends an instant formatted execution notification to your channel.
            </p>

            <div className="space-y-2">
              <div>
                <span className="text-[10px] uppercase text-slate-400 block mb-1">Telegram Bot Token</span>
                <input
                  type="password"
                  value={telegramToken}
                  onChange={(e) => setTelegramToken(e.target.value)}
                  placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRstuVWXyz"
                  className="w-full rounded border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-slate-100 focus:outline-none text-[11px]"
                />
              </div>

              <div>
                <span className="text-[10px] uppercase text-slate-400 block mb-1">Telegram Chat ID / Channel ID</span>
                <input
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="e.g. @YourChannel or -100123456789"
                  className="w-full rounded border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-slate-100 focus:outline-none text-[11px]"
                />
              </div>

              {telegramTestStatus && (
                <div className="p-2 rounded bg-slate-950 border border-slate-800 text-[10px] text-cyan-300">
                  {telegramTestStatus}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSaveTelegram}
                  className="py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px]"
                >
                  Save Config
                </button>
                <button
                  type="button"
                  onClick={handleTestTelegram}
                  className="py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-[11px] flex items-center justify-center gap-1"
                >
                  <Send className="h-3 w-3" />
                  <span>Test Ping</span>
                </button>
              </div>
            </div>
          </div>

          {/* Closed Paper Ledger Summary */}
          <div className="rounded-xl border border-slate-800 bg-[#090d16] p-4 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-slate-200 uppercase tracking-wider">Closed Paper Ledger</span>
              <span className="text-[10px] text-slate-400">{brokerState.trades.length} Trades</span>
            </div>

            <div className="overflow-y-auto max-h-48 divide-y divide-slate-800/60 text-[11px]">
              {brokerState.trades.length === 0 ? (
                <div className="py-4 text-center text-slate-500 text-xs">No closed paper trades yet.</div>
              ) : (
                brokerState.trades.map((t, idx) => (
                  <div key={idx} className="py-1.5 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold ${t.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {t.side}
                        </span>
                        <span className="text-slate-300">{t.symbol}</span>
                        <span className="text-[9px] text-slate-500 font-sans">({t.exitReason})</span>
                      </div>
                      <div className="text-[9px] text-slate-500">
                        ${t.entryPrice.toFixed(2)} &rarr; ${t.exitPrice.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${t.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {t.netPnl >= 0 ? '+' : ''}${t.netPnl.toFixed(4)}
                      </div>
                      <div className="text-[9px] text-slate-500">${t.newBalance.toFixed(2)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
