import React, { useState } from 'react';
import {
  MarketSymbol,
  OrderSide,
  OrderType,
  CompositeForecast,
} from '../types/trading';
import { idempotentBroker } from '../lib/idempotent-broker';
import { riskManager } from '../lib/risk-manager';
import { Send, AlertCircle, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface BrokerPanelProps {
  symbol: MarketSymbol;
  currentPrice: number;
  forecast?: CompositeForecast;
}

export const BrokerPanel: React.FC<BrokerPanelProps> = ({
  symbol,
  currentPrice,
  forecast,
}) => {
  const [side, setSide] = useState<OrderSide>('BUY');
  const [type, setType] = useState<OrderType>('MARKET');
  const [amount, setAmount] = useState<string>('0.1');
  const [limitPrice, setLimitPrice] = useState<string>(currentPrice.toFixed(2));
  const [maxSlippage, setMaxSlippage] = useState<number>(0.15); // 0.15% default
  const [stopLoss, setStopLoss] = useState<string>(
    forecast ? forecast.suggestedStopLoss.toString() : (currentPrice * 0.98).toFixed(2)
  );
  const [takeProfit, setTakeProfit] = useState<string>(
    forecast ? forecast.suggestedTakeProfit.toString() : (currentPrice * 1.04).toFixed(2)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const account = idempotentBroker.getAccount();
  const risk = riskManager.getState();
  const positions = idempotentBroker.getPositions();

  const numAmount = parseFloat(amount) || 0;
  const targetPrice = type === 'LIMIT' ? parseFloat(limitPrice) || currentPrice : currentPrice;
  const orderNotional = numAmount * targetPrice;
  const maxAllowedNotional = (account.equity * risk.maxPositionSizePercent) / 100;
  const equityShare = account.equity > 0 ? (orderNotional / account.equity) * 100 : 0;

  // Pre-flight validation
  const isSizingBreached = orderNotional > maxAllowedNotional;
  const isDrawdownTripped = risk.isTripped;
  const isSlippageBreached = maxSlippage > risk.slippageLimitPercent;
  const canSubmit =
    numAmount > 0 &&
    !isSizingBreached &&
    !isDrawdownTripped &&
    !isSlippageBreached &&
    !isSubmitting;

  const handleQuickPercent = (pct: number) => {
    const notionalTarget = (maxAllowedNotional * pct) / 100;
    const computedAmt = notionalTarget / currentPrice;
    setAmount(computedAmt.toFixed(symbol.includes('BTC') ? 4 : 2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setStatusMessage(null);

    const res = await idempotentBroker.submitOrder({
      symbol,
      side,
      type,
      amount: numAmount,
      limitPrice: type === 'LIMIT' ? targetPrice : undefined,
      maxSlippagePercent: maxSlippage,
      stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
      takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
      source: 'MANUAL',
    });

    setIsSubmitting(false);

    if (res.success) {
      setStatusMessage({
        text: `Order Filled: ${side} ${numAmount} ${symbol} @ $${res.order.fillPrice} (Client ID: ${res.order.clientOrderId.slice(-8)})`,
      });
    } else {
      setStatusMessage({
        text: res.error || 'Order submission failed',
        error: true,
      });
    }
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-[#0b0e14] p-4 shadow-lg flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3">
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-cyan-400" />
            <h3 className="font-semibold text-xs tracking-wider text-slate-200 uppercase">
              Idempotent Order Ticket
            </h3>
          </div>
          <span className="font-mono text-[10px] text-cyan-400">
            {idempotentBroker.getConfig().provider}
          </span>
        </div>

        {/* Side Selector (BUY vs SELL) */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            type="button"
            onClick={() => setSide('BUY')}
            className={`py-2 rounded font-bold font-mono text-xs transition-colors ${
              side === 'BUY'
                ? 'bg-emerald-600 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            BUY / LONG
          </button>
          <button
            type="button"
            onClick={() => setSide('SELL')}
            className={`py-2 rounded font-bold font-mono text-xs transition-colors ${
              side === 'SELL'
                ? 'bg-rose-600 text-white shadow-[0_0_10px_rgba(244,63,94,0.4)]'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            SELL / SHORT
          </button>
        </div>

        {/* Order Type Toggle */}
        <div className="flex items-center justify-between text-xs mb-3">
          <span className="text-slate-400 text-[11px]">Execution Type</span>
          <div className="flex rounded border border-slate-800 bg-slate-900/60 p-0.5 font-mono text-[10px]">
            <button
              type="button"
              onClick={() => setType('MARKET')}
              className={`px-3 py-0.5 rounded font-semibold ${
                type === 'MARKET' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400'
              }`}
            >
              MARKET
            </button>
            <button
              type="button"
              onClick={() => setType('LIMIT')}
              className={`px-3 py-0.5 rounded font-semibold ${
                type === 'LIMIT' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400'
              }`}
            >
              LIMIT
            </button>
          </div>
        </div>

        {/* Limit Price Input if selected */}
        {type === 'LIMIT' && (
          <div className="mb-2.5">
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
              Limit Price ($)
            </label>
            <input
              type="number"
              step="any"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              className="w-full rounded border border-slate-800 bg-slate-900 px-3 py-1.5 font-mono text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
            />
          </div>
        )}

        {/* Size / Amount Input */}
        <div className="mb-2.5">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-slate-400 uppercase tracking-wider">
              Quantity ({symbol.split('/')[0]})
            </label>
            <span className="font-mono text-[10px] text-slate-400">
              Notional: ${orderNotional.toFixed(2)} ({equityShare.toFixed(1)}% Eq)
            </span>
          </div>
          <input
            type="number"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded border border-slate-800 bg-slate-900 px-3 py-1.5 font-mono text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
          />

          {/* Sizing Quick Presets */}
          <div className="grid grid-cols-4 gap-1.5 mt-1.5">
            {[25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => handleQuickPercent(pct)}
                className="rounded border border-slate-800 bg-slate-900/60 py-1 text-[10px] font-mono text-slate-400 hover:text-cyan-400 hover:border-slate-700 transition-colors"
              >
                {pct}% Cap
              </button>
            ))}
          </div>
        </div>

        {/* Slippage & Protection Controls */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
              Max Slippage (%)
            </label>
            <input
              type="number"
              step="0.01"
              value={maxSlippage}
              onChange={(e) => setMaxSlippage(parseFloat(e.target.value) || 0)}
              className="w-full rounded border border-slate-800 bg-slate-900 px-2.5 py-1 font-mono text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
              Stop Loss ($)
            </label>
            <input
              type="number"
              step="any"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              className="w-full rounded border border-slate-800 bg-slate-900 px-2.5 py-1 font-mono text-xs text-rose-300 focus:border-rose-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Pre-Trade Risk Verification Banner */}
        <div className="rounded border border-slate-800/80 bg-slate-900/50 p-2.5 mb-3 text-[11px]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-400 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-cyan-400" /> Pre-Flight Risk Check
            </span>
            <span
              className={`font-mono font-bold text-[10px] ${
                isSizingBreached || isDrawdownTripped ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {isDrawdownTripped
                ? 'CIRCUIT HALTED'
                : isSizingBreached
                ? 'OVERSIZE REJECT'
                : 'VALIDATED'}
            </span>
          </div>

          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>Max Position Sizing:</span>
            <span>${maxAllowedNotional.toFixed(2)} ({risk.maxPositionSizePercent}%)</span>
          </div>

          {isSizingBreached && (
            <div className="mt-1 text-rose-400 text-[10px] flex items-center gap-1">
              <AlertCircle className="h-3 w-3 shrink-0" />
              <span>Order exceeds maximum allowed risk threshold of {risk.maxPositionSizePercent}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Status Notice */}
      {statusMessage && (
        <div
          className={`rounded p-2 mb-3 text-[11px] font-mono flex items-center gap-1.5 ${
            statusMessage.error
              ? 'border border-rose-500/40 bg-rose-950/40 text-rose-300'
              : 'border border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
          }`}
        >
          {statusMessage.error ? (
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Transmit Order Button */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className={`w-full py-2.5 rounded font-bold font-mono text-xs uppercase tracking-wider transition-all shadow-md ${
          !canSubmit
            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            : side === 'BUY'
            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)]'
            : 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.3)]'
        }`}
      >
        {isSubmitting
          ? 'ROUTING ORDER...'
          : `TRANSMIT ${side} ${numAmount} ${symbol}`}
      </button>
    </div>
  );
};
