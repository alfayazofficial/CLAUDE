import React, { useState, useEffect } from 'react';
import { ClosedTrade, LedgerMetrics } from '../types/trading';
import { idempotentBroker } from '../lib/idempotent-broker';
import { computeLedgerMetrics, LedgerStoreManager } from '../lib/ledger-store';
import {
  FileText,
  Download,
  TrendingUp,
  Percent,
  Award,
  Shield,
  BarChart3,
  Calendar,
} from 'lucide-react';

export const TrackRecordLedger: React.FC = () => {
  const [trades, setTrades] = useState<ClosedTrade[]>(idempotentBroker.getClosedTrades());
  const [metrics, setMetrics] = useState<LedgerMetrics>(computeLedgerMetrics(trades));

  useEffect(() => {
    const unsub = idempotentBroker.onTradeClosed((t) => {
      const updated = [t, ...idempotentBroker.getClosedTrades()];
      setTrades(updated);
      setMetrics(computeLedgerMetrics(updated));
    });

    return () => unsub();
  }, []);

  const handleExportJSON = () => {
    const jsonStr = LedgerStoreManager.exportJSON();
    LedgerStoreManager.downloadFile(jsonStr, `orion_track_record_${Date.now()}.json`, 'json');
  };

  const handleExportCSV = () => {
    const csvStr = LedgerStoreManager.exportCSV();
    LedgerStoreManager.downloadFile(csvStr, `orion_trade_ledger_${Date.now()}.csv`, 'csv');
  };

  // Reconstruct equity curve points for chart
  const equityPoints = trades
    .slice()
    .reverse()
    .reduce(
      (acc, t) => {
        const lastEq = acc[acc.length - 1].equity;
        acc.push({ time: t.closedAt, equity: lastEq + t.netPnL });
        return acc;
      },
      [{ time: trades[trades.length - 1]?.openedAt || Date.now(), equity: 100000 }]
    );

  const minEq = Math.min(...equityPoints.map((p) => p.equity), 98000);
  const maxEq = Math.max(...equityPoints.map((p) => p.equity), 102000);
  const eqRange = maxEq - minEq || 1;

  const chartWidth = 600;
  const chartHeight = 120;
  const eqStep = equityPoints.length > 1 ? chartWidth / (equityPoints.length - 1) : chartWidth;

  const eqPath = equityPoints
    .map(
      (p, i) =>
        `${i === 0 ? 'M' : 'L'} ${i * eqStep} ${
          chartHeight - ((p.equity - minEq) / eqRange) * (chartHeight - 20) - 10
        }`
    )
    .join(' ');

  const isNetProfit = metrics.totalNetPnL >= 0;

  return (
    <div className="rounded-lg border border-slate-800 bg-[#0b0e14] p-4 shadow-lg space-y-4">
      {/* Header and Export Actions */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 pb-3 gap-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-cyan-400" />
          <h3 className="font-semibold text-xs tracking-wider text-slate-100 uppercase">
            Audited Track Record &amp; Trade Ledger
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 rounded border border-slate-700 bg-slate-900/60 px-2.5 py-1 font-mono text-[10px] text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
          >
            <Download className="h-3 w-3" />
            <span>Export JSON Audit</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded border border-cyan-700/60 bg-cyan-950/40 px-2.5 py-1 font-mono text-[10px] text-cyan-300 hover:text-white hover:bg-cyan-900 transition-colors"
          >
            <Download className="h-3 w-3" />
            <span>Export CSV Ledger</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
        {/* Net PnL */}
        <div className="rounded border border-slate-800 bg-slate-900/40 p-2.5">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Total Net P&amp;L</div>
          <div
            className={`font-mono font-bold text-sm mt-0.5 ${
              isNetProfit ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isNetProfit ? '+' : ''}${metrics.totalNetPnL.toFixed(2)}
          </div>
        </div>

        {/* Profit Factor */}
        <div className="rounded border border-slate-800 bg-slate-900/40 p-2.5">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Profit Factor</div>
          <div className="font-mono font-bold text-sm text-cyan-300 mt-0.5">
            {metrics.profitFactor > 0 ? metrics.profitFactor.toFixed(2) : '1.00'}
          </div>
        </div>

        {/* Win Rate */}
        <div className="rounded border border-slate-800 bg-slate-900/40 p-2.5">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Win Rate</div>
          <div className="font-mono font-bold text-sm text-slate-100 mt-0.5">
            {metrics.winRate}%{' '}
            <span className="text-[10px] text-slate-400 font-normal">
              ({metrics.winningTrades}/{metrics.totalTrades})
            </span>
          </div>
        </div>

        {/* Sharpe Ratio */}
        <div className="rounded border border-slate-800 bg-slate-900/40 p-2.5">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Sharpe Ratio</div>
          <div className="font-mono font-bold text-sm text-indigo-300 mt-0.5">
            {metrics.sharpeRatio.toFixed(2)}
          </div>
        </div>

        {/* Max Drawdown */}
        <div className="rounded border border-slate-800 bg-slate-900/40 p-2.5">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Max Drawdown</div>
          <div className="font-mono font-bold text-sm text-rose-400 mt-0.5">
            {metrics.maxDrawdownPercent}%
          </div>
        </div>

        {/* Expectancy */}
        <div className="rounded border border-slate-800 bg-slate-900/40 p-2.5">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Expectancy / Trade</div>
          <div
            className={`font-mono font-bold text-sm mt-0.5 ${
              metrics.expectancyRatio >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            ${metrics.expectancyRatio.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Equity Curve SVG */}
      <div className="rounded border border-slate-800 bg-slate-900/40 p-3">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="text-[10px] uppercase tracking-wider font-semibold">
            Cumulative Account Equity Curve
          </span>
          <span className="font-mono text-[10px]">
            Peak: ${maxEq.toFixed(0)} • Low: ${minEq.toFixed(0)}
          </span>
        </div>
        <div className="w-full overflow-hidden">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-24">
            <line
              x1="0"
              y1={chartHeight - ((100000 - minEq) / eqRange) * (chartHeight - 20) - 10}
              x2={chartWidth}
              y2={chartHeight - ((100000 - minEq) / eqRange) * (chartHeight - 20) - 10}
              stroke="#334155"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
            <path
              d={eqPath}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Trade Log Table */}
      <div className="overflow-x-auto max-h-80">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              <th className="pb-2 pl-1">Closed Time</th>
              <th className="pb-2">Client ID</th>
              <th className="pb-2">Symbol</th>
              <th className="pb-2">Side</th>
              <th className="pb-2">Size</th>
              <th className="pb-2">Entry Price</th>
              <th className="pb-2">Exit Price</th>
              <th className="pb-2">Fee</th>
              <th className="pb-2">Net PnL ($)</th>
              <th className="pb-2 pr-1 text-right">Exit Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {trades.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-slate-400 font-mono">
                  No completed trades in ledger yet.
                </td>
              </tr>
            ) : (
              trades.map((t) => {
                const isWin = t.netPnL > 0;
                return (
                  <tr key={t.id} className="hover:bg-slate-900/30 transition-colors">
                    <td className="py-2 pl-1 font-mono text-[10px] text-slate-400">
                      {new Date(t.closedAt).toLocaleTimeString()}
                    </td>
                    <td className="py-2 font-mono text-[10px] text-slate-400" title={t.clientOrderId}>
                      {t.clientOrderId.slice(-8)}
                    </td>
                    <td className="py-2 font-mono font-bold text-slate-200">{t.symbol}</td>
                    <td className="py-2 font-mono">
                      <span
                        className={`text-[10px] font-bold ${
                          t.side === 'LONG' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {t.side}
                      </span>
                    </td>
                    <td className="py-2 font-mono text-slate-300">{t.size}</td>
                    <td className="py-2 font-mono text-slate-300">${t.entryPrice.toFixed(2)}</td>
                    <td className="py-2 font-mono text-slate-300">${t.exitPrice.toFixed(2)}</td>
                    <td className="py-2 font-mono text-[10px] text-slate-400">${t.fee.toFixed(2)}</td>
                    <td className="py-2 font-mono font-bold">
                      <span className={isWin ? 'text-emerald-400' : 'text-rose-400'}>
                        {isWin ? '+' : ''}${t.netPnL.toFixed(2)} ({isWin ? '+' : ''}
                        {t.returnPercent.toFixed(2)}%)
                      </span>
                    </td>
                    <td className="py-2 pr-1 text-right font-mono text-[10px]">
                      <span
                        className={`px-1.5 py-0.5 rounded border ${
                          t.exitReason === 'TAKE_PROFIT'
                            ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-400'
                            : t.exitReason === 'STOP_LOSS'
                            ? 'border-rose-500/40 bg-rose-950/40 text-rose-400'
                            : t.exitReason === 'CIRCUIT_BREAKER_HALT'
                            ? 'border-rose-600 bg-rose-950 text-rose-300 font-bold'
                            : 'border-slate-800 bg-slate-900 text-slate-300'
                        }`}
                      >
                        {t.exitReason}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
