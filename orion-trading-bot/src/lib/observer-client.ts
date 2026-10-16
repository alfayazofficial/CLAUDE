/** Browser-side controller for the SERVER observer (it keeps running when the tab is closed). */
import type { ObserverLog, ObserverStatus } from '../types/paper';
import { adminHeaders } from './broker-client';

export type { ObserverLog };

class ObserverClient {
  public isRunning = false;
  public symbol = 'BINANCE:BTCUSDT';
  public timeframe = '1';
  public tradeCapital = 2.0;
  public ratio = '1:2';
  public lastPrice = 0;
  private logs: ObserverLog[] = [];
  private logL = new Set<(l: ObserverLog[]) => void>();
  private statL = new Set<(s: ObserverStatus) => void>();
  private timer: ReturnType<typeof setInterval> | null = null;
  public lastError: string | null = null;
  public plan: any = null;

  private async poll() {
    try {
      const r = await fetch('/api/run/status');
      if (!r.ok) return;
      const d = await r.json();
      this.isRunning = d.isRunning; this.symbol = d.symbol; this.timeframe = d.timeframe;
      this.tradeCapital = d.tradeCapital; this.ratio = d.ratio; this.lastPrice = d.lastPrice || 0;
      this.logs = d.logs || [];
      this.plan = d.plan || null;
      this.logL.forEach((f) => f(this.getLogs()));
      this.statL.forEach((f) => f(this.status()));
    } catch { /* offline */ }
  }

  private ensurePolling() {
    if (this.timer) return;
    void this.poll();
    this.timer = setInterval(() => void this.poll(), 2000);
  }
  private maybeStopPolling() {
    if (this.timer && this.logL.size === 0 && this.statL.size === 0) { clearInterval(this.timer); this.timer = null; }
  }
  private status(): ObserverStatus { return { isRunning: this.isRunning, symbol: this.symbol, lastPrice: this.lastPrice }; }

  public getLogs() { return [...this.logs]; }
  public subscribeLogs(fn: (l: ObserverLog[]) => void) { this.logL.add(fn); fn(this.getLogs()); this.ensurePolling(); return () => { this.logL.delete(fn); this.maybeStopPolling(); }; }
  public subscribeStatus(fn: (s: ObserverStatus) => void) { this.statL.add(fn); fn(this.status()); this.ensurePolling(); return () => { this.statL.delete(fn); this.maybeStopPolling(); }; }

  /** Local form values only; they are sent to the server on start(). */
  public updateConfig(c: { symbol?: string; ratio?: string; tradeCapital?: number; timeframe?: string; telegramChatId?: string; telegramBotToken?: string }) {
    if (c.symbol) this.symbol = c.symbol;
    if (c.ratio) this.ratio = c.ratio;
    if (c.tradeCapital) this.tradeCapital = c.tradeCapital;
    if (c.timeframe) this.timeframe = c.timeframe;
  }

  public async start(): Promise<string | null> {
    const res = await fetch('/api/run', {
      method: 'POST', headers: adminHeaders(),
      body: JSON.stringify({ action: 'START', symbol: this.symbol, ratio: this.ratio, tradeCapital: this.tradeCapital, timeframe: this.timeframe }),
    });
    const d = await res.json().catch(() => ({}));
    this.lastError = res.ok ? null : d.message || d.error || `HTTP ${res.status}`;
    await this.poll();
    return this.lastError;
  }

  public async stop(): Promise<void> {
    await fetch('/api/run', { method: 'POST', headers: adminHeaders(), body: JSON.stringify({ action: 'STOP' }) });
    await this.poll();
  }
}

export const globalTradingViewObserver = new ObserverClient();
