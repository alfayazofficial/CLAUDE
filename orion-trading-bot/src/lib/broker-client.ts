/**
 * Browser-side view of the SERVER paper broker. Same surface the UI always used
 * (getState / subscribe / openPosition / manualClose / reset) but the server is
 * the single source of truth, so there is no second ledger in localStorage.
 */
import type { ClosedPaperTrade, OpenResult, PaperBrokerState, PaperPosition } from '../types/paper';

export type { ClosedPaperTrade, PaperBrokerState, PaperPosition };

export function adminHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const t = localStorage.getItem('orion_admin_token');
    if (t) h['x-admin-token'] = t;
  } catch { /* ignore */ }
  return h;
}

let cache: PaperBrokerState = { balance: 2000, activePosition: null, trades: [] };
const listeners = new Set<(s: PaperBrokerState) => void>();
let timer: ReturnType<typeof setInterval> | null = null;

async function refresh() {
  try {
    const res = await fetch('/api/broker-state');
    if (!res.ok) return;
    cache = await res.json();
    listeners.forEach((fn) => fn(cache));
  } catch { /* server offline: keep last known state */ }
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: 'POST', headers: adminHeaders(), body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  void refresh();
  return data as T;
}

export const PaperBroker = {
  getState(): PaperBrokerState {
    return cache;
  },
  subscribe(fn: (s: PaperBrokerState) => void): () => void {
    listeners.add(fn);
    fn(cache);
    if (!timer) {
      void refresh();
      timer = setInterval(refresh, 2000);
    }
    return () => {
      listeners.delete(fn);
      if (listeners.size === 0 && timer) {
        clearInterval(timer);
        timer = null;
      }
    };
  },
  async openPosition(p: { symbol: string; side: string; price: number; tradeCapital?: number; ratio?: string }): Promise<OpenResult> {
    const r = await post<OpenResult & { error?: string }>('/api/broker/open', p);
    return r.success !== undefined ? r : { success: false, reason: r.error || 'REQUEST_FAILED' };
  },
  async manualClose(price: number): Promise<ClosedPaperTrade | null> {
    const r = await post<{ closed?: ClosedPaperTrade | null }>('/api/broker/close', { price });
    return r.closed ?? null;
  },
  async reset(): Promise<void> {
    await post('/api/broker/reset', {});
  },
};
