import { ClosedTrade, LedgerMetrics } from '../types/trading';
import { idempotentBroker } from './idempotent-broker';

export function computeLedgerMetrics(trades: ClosedTrade[]): LedgerMetrics {
  if (trades.length === 0) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      profitFactor: 0,
      totalGrossProfit: 0,
      totalGrossLoss: 0,
      totalNetPnL: 0,
      averageTradePnL: 0,
      maxDrawdownPercent: 0,
      sharpeRatio: 0,
      expectancyRatio: 0,
    };
  }

  let winningTrades = 0;
  let losingTrades = 0;
  let totalGrossProfit = 0;
  let totalGrossLoss = 0;
  let totalNetPnL = 0;

  const returns: number[] = [];
  let peakEquity = 100000;
  let currentEquity = 100000;
  let maxDrawdown = 0;

  // Evaluate in chronological order
  const chronological = [...trades].sort((a, b) => a.closedAt - b.closedAt);

  chronological.forEach((t) => {
    totalNetPnL += t.netPnL;
    currentEquity += t.netPnL;
    if (currentEquity > peakEquity) peakEquity = currentEquity;
    const dd = ((peakEquity - currentEquity) / peakEquity) * 100;
    if (dd > maxDrawdown) maxDrawdown = dd;

    returns.push(t.returnPercent);

    if (t.netPnL > 0) {
      winningTrades++;
      totalGrossProfit += t.netPnL;
    } else {
      losingTrades++;
      totalGrossLoss += Math.abs(t.netPnL);
    }
  });

  const totalTrades = trades.length;
  const winRate = Number(((winningTrades / totalTrades) * 100).toFixed(1));
  const profitFactor =
    totalGrossLoss === 0
      ? Number(totalGrossProfit.toFixed(2))
      : Number((totalGrossProfit / totalGrossLoss).toFixed(2));
  const averageTradePnL = Number((totalNetPnL / totalTrades).toFixed(2));

  // Sharpe Ratio estimation (assuming risk-free 0)
  const avgReturn = returns.reduce((a, b) => a + b, 0) / (returns.length || 1);
  const variance =
    returns.reduce((acc, r) => acc + Math.pow(r - avgReturn, 2), 0) / (returns.length || 1);
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev === 0 ? 0 : Number(((avgReturn / stdDev) * Math.sqrt(252)).toFixed(2));

  // Expectancy: (Win Rate * Avg Win) - (Loss Rate * Avg Loss)
  const avgWin = winningTrades > 0 ? totalGrossProfit / winningTrades : 0;
  const avgLoss = losingTrades > 0 ? totalGrossLoss / losingTrades : 0;
  const winRateFrac = winningTrades / totalTrades;
  const lossRateFrac = losingTrades / totalTrades;
  const expectancy = winRateFrac * avgWin - lossRateFrac * avgLoss;

  return {
    totalTrades,
    winningTrades,
    losingTrades,
    winRate,
    profitFactor,
    totalGrossProfit: Number(totalGrossProfit.toFixed(2)),
    totalGrossLoss: Number(totalGrossLoss.toFixed(2)),
    totalNetPnL: Number(totalNetPnL.toFixed(2)),
    averageTradePnL,
    maxDrawdownPercent: Number(maxDrawdown.toFixed(2)),
    sharpeRatio,
    expectancyRatio: Number(expectancy.toFixed(2)),
  };
}

export class LedgerStoreManager {
  public static exportJSON(): string {
    const trades = idempotentBroker.getClosedTrades();
    const account = idempotentBroker.getAccount();
    const orders = idempotentBroker.getOrders();
    const data = {
      exportTime: new Date().toISOString(),
      account,
      metrics: computeLedgerMetrics(trades),
      closedTrades: trades,
      orderAuditTrail: orders,
    };
    return JSON.stringify(data, null, 2);
  }

  public static exportCSV(): string {
    const trades = idempotentBroker.getClosedTrades();
    const headers = [
      'Trade ID',
      'Client Order ID',
      'Symbol',
      'Side',
      'Entry Price',
      'Exit Price',
      'Size',
      'Gross PnL ($)',
      'Fee ($)',
      'Net PnL ($)',
      'Return (%)',
      'Exit Reason',
      'Opened At',
      'Closed At',
    ];

    const rows = trades.map((t) => [
      t.id,
      t.clientOrderId,
      t.symbol,
      t.side,
      t.entryPrice,
      t.exitPrice,
      t.size,
      t.grossPnL,
      t.fee,
      t.netPnL,
      t.returnPercent,
      t.exitReason,
      new Date(t.openedAt).toISOString(),
      new Date(t.closedAt).toISOString(),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  public static downloadFile(content: string, filename: string, type: 'json' | 'csv') {
    const blob = new Blob([content], { type: type === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
