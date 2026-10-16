/**
 * SERVER-ONLY minimal Binance Spot REST client (signed endpoints).
 * API keys are read from the server environment and never reach the browser.
 */
import crypto from 'crypto';

export type BinanceEnv = 'testnet' | 'live';

export interface SymbolRules {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  stepSize: number;
  minQty: number;
  tickSize: number;
  minNotional: number;
}

export class BinanceError extends Error {
  constructor(public status: number, public code: number | undefined, message: string) {
    super(message);
  }
}

const decimalsOf = (step: number) => {
  const s = step.toString();
  if (s.includes('e-')) return parseInt(s.split('e-')[1], 10);
  const i = s.indexOf('.');
  return i === -1 ? 0 : s.length - i - 1;
};

export const floorToStep = (v: number, step: number): number => {
  if (!(step > 0)) return v;
  const d = decimalsOf(step);
  return Number((Math.floor(v / step + 1e-9) * step).toFixed(d));
};
export const ceilToStep = (v: number, step: number): number => {
  if (!(step > 0)) return v;
  return Number((Math.ceil(v / step - 1e-9) * step).toFixed(decimalsOf(step)));
};
export const fmt = (v: number, step: number): string => v.toFixed(decimalsOf(step));

export class BinanceSpot {
  readonly baseUrl: string;
  private timeOffset = 0;
  private rules = new Map<string, SymbolRules>();

  constructor(
    readonly env: BinanceEnv,
    private apiKey: string,
    private apiSecret: string,
    baseUrl?: string
  ) {
    this.baseUrl = (baseUrl || (env === 'testnet' ? 'https://testnet.binance.vision' : 'https://api.binance.com')).replace(/\/$/, '');
  }

  get hasKeys() {
    return !!(this.apiKey && this.apiSecret);
  }

  private async raw(method: string, path: string, params: Record<string, string | number> = {}, signed = false): Promise<any> {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) q.set(k, String(v));
    if (signed) {
      q.set('timestamp', String(Date.now() + this.timeOffset));
      q.set('recvWindow', '5000');
      q.set('signature', crypto.createHmac('sha256', this.apiSecret).update(q.toString()).digest('hex'));
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      // Params go in the query string for every verb: this is what Binance signs and accepts.
      const res = await fetch(`${this.baseUrl}${path}?${q.toString()}`, {
        method,
        headers: signed || this.apiKey ? { 'X-MBX-APIKEY': this.apiKey } : {},
        signal: controller.signal,
      });
      const text = await res.text();
      let body: any;
      try { body = JSON.parse(text); } catch { body = { msg: text }; }
      if (!res.ok) throw new BinanceError(res.status, body?.code, `Binance ${res.status}${body?.code ? ` (${body.code})` : ''}: ${body?.msg ?? text}`);
      return body;
    } catch (e: any) {
      if (e?.name === 'AbortError') throw new BinanceError(0, undefined, 'Binance request timed out');
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }

  async syncTime() {
    const t = await this.raw('GET', '/api/v3/time');
    this.timeOffset = Number(t.serverTime) - Date.now();
  }

  async getAccount(): Promise<{ canTrade: boolean; balances: { asset: string; free: number; locked: number }[] }> {
    const a = await this.raw('GET', '/api/v3/account', {}, true);
    return {
      canTrade: !!a.canTrade,
      balances: (a.balances || []).map((b: any) => ({ asset: b.asset, free: parseFloat(b.free), locked: parseFloat(b.locked) })),
    };
  }

  async free(asset: string): Promise<number> {
    const a = await this.getAccount();
    return a.balances.find((b) => b.asset === asset)?.free ?? 0;
  }

  async getRules(symbol: string): Promise<SymbolRules> {
    const hit = this.rules.get(symbol);
    if (hit) return hit;
    const info = await this.raw('GET', '/api/v3/exchangeInfo', { symbol });
    const s = info.symbols?.[0];
    if (!s || s.status !== 'TRADING') throw new Error(`${symbol} is not tradable on this Binance environment`);
    const f = (t: string) => s.filters.find((x: any) => x.filterType === t) || {};
    const lot = f('LOT_SIZE');
    const price = f('PRICE_FILTER');
    const notional = f('NOTIONAL').minNotional ?? f('MIN_NOTIONAL').minNotional ?? '0';
    const r: SymbolRules = {
      symbol, baseAsset: s.baseAsset, quoteAsset: s.quoteAsset,
      stepSize: parseFloat(lot.stepSize ?? '0'), minQty: parseFloat(lot.minQty ?? '0'),
      tickSize: parseFloat(price.tickSize ?? '0'), minNotional: parseFloat(notional),
    };
    this.rules.set(symbol, r);
    return r;
  }

  async price(symbol: string): Promise<number> {
    const p = await this.raw('GET', '/api/v3/ticker/price', { symbol });
    return parseFloat(p.price);
  }

  /** Market BUY of an exact base quantity. Idempotent through newClientOrderId. */
  marketBuyQty(symbol: string, qtyStr: string, clientOrderId: string) {
    return this.raw('POST', '/api/v3/order', {
      symbol, side: 'BUY', type: 'MARKET', quantity: qtyStr,
      newClientOrderId: clientOrderId, newOrderRespType: 'FULL',
    }, true);
  }

  marketSellQty(symbol: string, qtyStr: string, clientOrderId: string) {
    return this.raw('POST', '/api/v3/order', {
      symbol, side: 'SELL', type: 'MARKET', quantity: qtyStr,
      newClientOrderId: clientOrderId, newOrderRespType: 'FULL',
    }, true);
  }

  /** Exchange-side exit: take-profit limit + stop-loss stop-limit, one cancels the other. */
  placeOco(p: { symbol: string; qty: string; tp: string; stopTrigger: string; stopLimit: string; listClientOrderId: string }) {
    return this.raw('POST', '/api/v3/orderList/oco', {
      symbol: p.symbol, side: 'SELL', quantity: p.qty,
      aboveType: 'LIMIT_MAKER', abovePrice: p.tp,
      belowType: 'STOP_LOSS_LIMIT', belowStopPrice: p.stopTrigger, belowPrice: p.stopLimit, belowTimeInForce: 'GTC',
      listClientOrderId: p.listClientOrderId, newOrderRespType: 'FULL',
    }, true);
  }

  getOrderList(listClientOrderId: string) {
    return this.raw('GET', '/api/v3/orderList', { origClientOrderId: listClientOrderId }, true);
  }
  cancelOrderList(symbol: string, listClientOrderId: string) {
    return this.raw('DELETE', '/api/v3/orderList', { symbol, listClientOrderId }, true);
  }
  getOrder(symbol: string, orderId: number | string) {
    return this.raw('GET', '/api/v3/order', { symbol, orderId }, true);
  }
  getOrderByClientId(symbol: string, clientOrderId: string) {
    return this.raw('GET', '/api/v3/order', { symbol, origClientOrderId: clientOrderId }, true);
  }
}
