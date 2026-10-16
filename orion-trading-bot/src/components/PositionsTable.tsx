import React, { useState } from 'react';
import { Position, IdempotentOrder } from '../types/trading';
import { idempotentBroker } from '../lib/idempotent-broker';
import { Briefcase, XCircle, ShieldAlert, ArrowDownRight, ArrowUpRight, History } from 'lucide-react';

interface PositionsTableProps {
  positions: Position[];
  orders: IdempotentOrder[];
}

export const PositionsTable: React.FC<PositionsTableProps> = ({ positions, orders }) => {
  const [activeTab, setActiveTab] = useState<'POSITIONS' | 'ORDERS'>('POSITIONS');

  const handleClose = (posId: string) => {
    idempotentBroker.closePosition(posId, 'MANUAL_CLOSE');
  };

  const handlePartialClose = (posId: string, currentSize: number, currentPrice: number) => {
    const half = currentSize / 2;
    idempotentBroker.closePartialPosition(posId, half, currentPrice);
  };

  const handleFlattenAll = () => {
    idempotentBroker.flattenAllPositions('MANUAL_FLATTEN');
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-[#0b0e14] p-4 shadow-lg">
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3 gap-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('POSITIONS')}
            className={`flex items-center gap-1.5 font-semibold text-xs tracking-wider uppercase transition-colors ${
              activeTab === 'POSITIONS' ? 'text-cyan-400 border-b-2 border-cyan-400 pb-1 -mb-3' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Briefcase className="h-4 w-4" />
            <span>Active Positions ({positions.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('ORDERS')}
            className={`flex items-center gap-1.5 font-semibold text-xs tracking-wider uppercase transition-colors ${
              activeTab === 'ORDERS' ? 'text-cyan-400 border-b-2 border-cyan-400 pb-1 -mb-3' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="h-4 w-4" />
            <span>Idempotent Order Audit ({orders.length})</span>
          </button>
        </div>

        {activeTab === 'POSITIONS' && positions.length > 0 && (
          <button
            onClick={handleFlattenAll}
            className="rounded border border-rose-800/60 bg-rose-950/40 px-2.5 py-1 text-[11px] font-mono font-bold text-rose-300 hover:bg-rose-900 transition-colors"
          >
            Close / Flatten All ({positions.length})
          </button>
        )}
      </div>

      {activeTab === 'POSITIONS' ? (
        positions.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 font-mono">
            No active open positions. Submit orders or start Auto-Cycle daemon.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="pb-2 pl-1">Symbol</th>
                  <th className="pb-2">Side</th>
                  <th className="pb-2">Size</th>
                  <th className="pb-2">Entry Price</th>
                  <th className="pb-2">Mark Price</th>
                  <th className="pb-2">PnL (Unrealized)</th>
                  <th className="pb-2">Stop Loss</th>
                  <th className="pb-2">Take Profit</th>
                  <th className="pb-2 pr-1 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {positions.map((pos) => {
                  const isProfit = pos.unrealizedPnL >= 0;
                  return (
                    <tr key={pos.id} className="hover:bg-slate-900/30 transition-colors">
                      <td className="py-2.5 pl-1 font-mono font-bold text-slate-100">
                        {pos.symbol}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono border ${
                            pos.side === 'LONG'
                              ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-400'
                              : 'border-rose-500/40 bg-rose-950/40 text-rose-400'
                          }`}
                        >
                          {pos.side}
                        </span>
                      </td>
                      <td className="py-2.5 font-mono text-slate-200">
                        {pos.size}
                      </td>
                      <td className="py-2.5 font-mono text-slate-300">
                        ${pos.entryPrice.toFixed(2)}
                      </td>
                      <td className="py-2.5 font-mono text-cyan-300 font-semibold">
                        ${pos.currentPrice.toFixed(2)}
                      </td>
                      <td className="py-2.5 font-mono font-bold">
                        <div className={`flex items-center gap-1 ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isProfit ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          <span>{isProfit ? '+' : ''}${pos.unrealizedPnL.toFixed(2)}</span>
                          <span className="text-[10px] font-normal">
                            ({isProfit ? '+' : ''}{pos.unrealizedPnLPercent.toFixed(2)}%)
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 font-mono text-[11px] text-rose-400">
                        {pos.stopLoss ? `$${pos.stopLoss.toFixed(2)}` : 'None'}
                      </td>
                      <td className="py-2.5 font-mono text-[11px] text-emerald-400">
                        {pos.takeProfit ? `$${pos.takeProfit.toFixed(2)}` : 'None'}
                      </td>
                      <td className="py-2.5 pr-1 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handlePartialClose(pos.id, pos.size, pos.currentPrice)}
                            className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300 hover:border-slate-500"
                            title="Close 50% of position"
                          >
                            50%
                          </button>
                          <button
                            onClick={() => handleClose(pos.id)}
                            className="rounded border border-rose-800/50 bg-rose-950/40 px-2 py-0.5 text-[10px] font-mono text-rose-400 hover:bg-rose-900 transition-colors"
                          >
                            Close
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        /* Orders Tab */
        orders.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 font-mono">
            No order submissions recorded in this session.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="pb-2 pl-1">Client Order ID</th>
                  <th className="pb-2">Time</th>
                  <th className="pb-2">Symbol</th>
                  <th className="pb-2">Side</th>
                  <th className="pb-2">Qty</th>
                  <th className="pb-2">Fill Price</th>
                  <th className="pb-2">Slippage</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {orders.slice(0, 30).map((ord) => (
                  <tr key={ord.clientOrderId} className="hover:bg-slate-900/30 transition-colors">
                    <td className="py-2 pl-1 font-mono text-[10px] text-slate-300" title={ord.clientOrderId}>
                      {ord.clientOrderId.slice(-14)}
                    </td>
                    <td className="py-2 font-mono text-[10px] text-slate-400">
                      {new Date(ord.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="py-2 font-mono font-bold text-slate-200">{ord.symbol}</td>
                    <td className="py-2">
                      <span
                        className={`text-[10px] font-mono font-bold ${
                          ord.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {ord.side}
                      </span>
                    </td>
                    <td className="py-2 font-mono text-slate-300">{ord.amount}</td>
                    <td className="py-2 font-mono text-cyan-300">
                      {ord.fillPrice ? `$${ord.fillPrice.toFixed(2)}` : '-'}
                    </td>
                    <td className="py-2 font-mono text-[10px] text-slate-400">
                      {ord.actualSlippage !== undefined ? `${ord.actualSlippage}%` : '-'}
                    </td>
                    <td className="py-2 font-mono">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                          ord.status === 'FILLED'
                            ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-400'
                            : ord.status === 'REJECTED'
                            ? 'border-rose-500/40 bg-rose-950/40 text-rose-400'
                            : 'border-amber-500/40 bg-amber-950/40 text-amber-400'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
};
