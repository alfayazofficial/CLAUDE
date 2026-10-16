import { Candle, MarketSymbol } from '../types/trading';

export type DataSourceType = 'LIVE_BINANCE' | 'SYNTHETIC_MODEL';

export interface SymbolMarketStatus {
  symbol: MarketSymbol;
  isRealLive: boolean;
  source: DataSourceType;
  lastUpdated: number;
  lastPrice: number;
}

// Fallback baseline prices if offline
export const INITIAL_PRICES: Record<MarketSymbol, number> = {
  'BTC/USDT': 68420.5,
  'ETH/USDT': 2645.2,
  'SOL/USDT': 152.8,
  'NVDA': 124.6,
  'AAPL': 228.3,
  'TSLA': 248.9,
  'SPY': 576.4,
};

// Generates high-fidelity historical candles
export function generateSyntheticCandles(
  symbol: MarketSymbol,
  count: number = 80,
  intervalMinutes: number = 15,
  referencePrice?: number
): Candle[] {
  const basePrice = referencePrice || INITIAL_PRICES[symbol] || 100;
  const candles: Candle[] = [];
  const now = Date.now();
  const stepMs = intervalMinutes * 60 * 1000;
  let currentPrice = basePrice * 0.96;

  const volatility = symbol.includes('BTC')
    ? 0.005
    : symbol.includes('SOL')
    ? 0.011
    : symbol.includes('ETH')
    ? 0.007
    : symbol.includes('NVDA') || symbol.includes('TSLA')
    ? 0.006
    : 0.0025;

  for (let i = count; i >= 0; i--) {
    const time = now - i * stepMs;
    const drift = (Math.random() - 0.488) * volatility;
    const open = currentPrice;
    const change = open * drift;
    const close = Math.max(open * 0.5, open + change);
    const wickHigh = Math.max(open, close) + Math.random() * open * volatility * 0.7;
    const wickLow = Math.min(open, close) - Math.random() * open * volatility * 0.7;
    const volume = Math.round((1000 + Math.random() * 5000) * (basePrice > 1000 ? 5 : 50));

    candles.push({
      time,
      open: Number(open.toFixed(2)),
      high: Number(wickHigh.toFixed(2)),
      low: Number(wickLow.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume,
    });

    currentPrice = close;
  }

  // Ensure last candle matches reference price
  if (referencePrice && candles.length > 0) {
    candles[candles.length - 1].close = referencePrice;
    candles[candles.length - 1].high = Math.max(candles[candles.length - 1].high, referencePrice);
    candles[candles.length - 1].low = Math.min(candles[candles.length - 1].low, referencePrice);
  }

  return candles;
}

/**
 * Fetch real historical candles from Binance Vision Public API
 */
/**
 * Fetch real historical candles from Binance Vision Public API with multi-month/multi-year support
 */
export async function fetchRealHistoricalCandles(
  symbol: string,
  timeframe: string = '1h',
  limit: number = 1000
): Promise<{
  candles: Candle[];
  isReal: boolean;
  source: string;
  startDate: string;
  endDate: string;
  totalBars: number;
}> {
  // Normalize timeframe for Binance ('1D' -> '1d')
  const tf = timeframe.toLowerCase() === '1d' ? '1d' : timeframe;
  const clean = symbol.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const binanceSymbol = clean.endsWith('USDT') ? clean : `${clean}USDT`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(
      `https://data-api.binance.vision/api/v3/klines?symbol=${binanceSymbol}&interval=${tf}&limit=${Math.min(
        1000,
        Math.max(100, limit)
      )}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 20) {
        const candles: Candle[] = data.map((d: any) => ({
          time: d[0],
          open: parseFloat(d[1]),
          high: parseFloat(d[2]),
          low: parseFloat(d[3]),
          close: parseFloat(d[4]),
          volume: parseFloat(d[5]),
        }));

        const startDate = new Date(candles[0].time).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        const endDate = new Date(candles[candles.length - 1].time).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });

        return {
          candles,
          isReal: true,
          source: `BINANCE_EXCHANGE_HISTORICAL (${binanceSymbol})`,
          startDate,
          endDate,
          totalBars: candles.length,
        };
      }
    }
  } catch {
    // fallback
  }

  // High precision synthetic fallback if offline or equity
  const synthetic = generateSyntheticCandles(symbol as MarketSymbol, Math.min(1000, limit), 60);
  const startDate = new Date(synthetic[0].time).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const endDate = new Date(synthetic[synthetic.length - 1].time).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return {
    candles: synthetic,
    isReal: false,
    source: 'MODEL_HISTORICAL_SIMULATION',
    startDate,
    endDate,
    totalBars: synthetic.length,
  };
}


/** Crypto pairs with a real public feed. Everything else is a SYNTHETIC random walk and is flagged as such. */
export const REAL_FEED_SYMBOLS: Record<string, string> = {
  'BTC/USDT': 'BTCUSDT', 'ETH/USDT': 'ETHUSDT', 'SOL/USDT': 'SOLUSDT', 'XRP/USDT': 'XRPUSDT',
  'DOGE/USDT': 'DOGEUSDT', 'BNB/USDT': 'BNBUSDT', 'ADA/USDT': 'ADAUSDT', 'AVAX/USDT': 'AVAXUSDT',
  'LINK/USDT': 'LINKUSDT', 'SUI/USDT': 'SUIUSDT', 'NEAR/USDT': 'NEARUSDT', 'PEPE/USDT': 'PEPEUSDT',
};
const SYNTHETIC_SYMBOLS: MarketSymbol[] = []; // fake stock symbols removed: only real Binance pairs are listed
const FEED_STALE_MS = 15000;

async function fetchRealKlines(binanceSymbol: string, interval = '15m', limit = 100): Promise<Candle[] | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(
      `https://data-api.binance.vision/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`,
      { signal: controller.signal }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length < 20) return null;
    return data.map((d: any) => ({
      time: d[0], open: parseFloat(d[1]), high: parseFloat(d[2]), low: parseFloat(d[3]),
      close: parseFloat(d[4]), volume: parseFloat(d[5]),
    }));
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export class MarketDataManager {
  private candles: Map<MarketSymbol, Candle[]> = new Map();
  private statusMap: Map<MarketSymbol, SymbolMarketStatus> = new Map();
  private subscribers: Set<(symbol: MarketSymbol, candles: Candle[], currentPrice: number) => void> = new Set();
  private heartbeatListeners: Set<(latencyMs: number, timestamp: number) => void> = new Set();
  private statusListeners: Set<(statuses: Record<MarketSymbol, SymbolMarketStatus>) => void> = new Set();
  private timer: ReturnType<typeof setInterval> | null = null;
  private realDataTimer: ReturnType<typeof setInterval> | null = null;
  private syncing = false;
  private lastRealSuccess = 0;
  public lastHeartbeat: number = Date.now();
  public currentLatency: number = 42;

  constructor() {
    this.initCandles();
    this.startLiveStream();
    this.startRealDataPoll();
  }

  private initCandles() {
    const symbols: MarketSymbol[] = [...Object.keys(REAL_FEED_SYMBOLS), ...SYNTHETIC_SYMBOLS];
    symbols.forEach((sym) => {
      this.candles.set(sym, generateSyntheticCandles(sym, 100));
      this.statusMap.set(sym, {
        symbol: sym, isRealLive: false, source: 'SYNTHETIC_MODEL',
        lastUpdated: Date.now(), lastPrice: INITIAL_PRICES[sym] || 100,
      });
    });
    void this.syncRealCryptoPrices();
  }

  /** True only for symbols whose candles are currently coming from a live exchange feed. */
  public isLive(symbol: MarketSymbol): boolean {
    const st = this.statusMap.get(symbol);
    return !!st && st.isRealLive && Date.now() - st.lastUpdated < FEED_STALE_MS;
  }

  public getCandles(symbol: MarketSymbol): Candle[] {
    if (!this.candles.has(symbol)) this.candles.set(symbol, generateSyntheticCandles(symbol, 100));
    return this.candles.get(symbol)!;
  }

  public getCurrentPrice(symbol: MarketSymbol): number {
    const list = this.getCandles(symbol);
    return list[list.length - 1]?.close || INITIAL_PRICES[symbol] || 100;
  }

  public getMarketStatus(symbol: MarketSymbol): SymbolMarketStatus {
    return (
      this.statusMap.get(symbol) || {
        symbol, isRealLive: false, source: 'SYNTHETIC_MODEL', lastUpdated: Date.now(), lastPrice: this.getCurrentPrice(symbol),
      }
    );
  }

  public getAllStatuses(): Record<MarketSymbol, SymbolMarketStatus> {
    const res: any = {};
    this.statusMap.forEach((v, k) => { res[k] = { ...v, isRealLive: v.isRealLive && Date.now() - v.lastUpdated < FEED_STALE_MS }; });
    return res;
  }

  public subscribe(cb: (symbol: MarketSymbol, candles: Candle[], currentPrice: number) => void): () => void {
    this.subscribers.add(cb);
    return () => { this.subscribers.delete(cb); };
  }
  public subscribeHeartbeat(cb: (latencyMs: number, timestamp: number) => void): () => void {
    this.heartbeatListeners.add(cb);
    return () => { this.heartbeatListeners.delete(cb); };
  }
  public subscribeStatus(cb: (statuses: Record<MarketSymbol, SymbolMarketStatus>) => void): () => void {
    this.statusListeners.add(cb);
    return () => { this.statusListeners.delete(cb); };
  }

  private notify(symbol: MarketSymbol) {
    const c = this.getCandles(symbol);
    const p = c[c.length - 1]?.close || 100;
    this.subscribers.forEach((fn) => fn(symbol, c, p));
  }
  private notifyStatuses() {
    const st = this.getAllStatuses();
    this.statusListeners.forEach((fn) => fn(st));
  }

  /**
   * Pulls REAL 15m candles from Binance's public market-data mirror and replaces the series.
   * Fresh klines also make the candles roll forward naturally (the old code never opened a new candle).
   */
  public async syncRealCryptoPrices() {
    if (this.syncing) return;
    this.syncing = true;
    const started = performance.now();
    try {
      const entries = Object.entries(REAL_FEED_SYMBOLS);
      const results = await Promise.all(entries.map(([, b]) => fetchRealKlines(b, '15m', 100)));
      let anyOk = false;
      results.forEach((klines, i) => {
        const symbol = entries[i][0] as MarketSymbol;
        if (!klines) return;
        anyOk = true;
        this.candles.set(symbol, klines);
        this.statusMap.set(symbol, {
          symbol, isRealLive: true, source: 'LIVE_BINANCE', lastUpdated: Date.now(),
          lastPrice: klines[klines.length - 1].close,
        });
        this.notify(symbol);
      });
      if (anyOk) {
        this.lastRealSuccess = Date.now();
        this.currentLatency = Math.round(performance.now() - started);
      }
      this.notifyStatuses();
    } finally {
      this.syncing = false;
    }
  }

  private startRealDataPoll() {
    if (typeof window === 'undefined') return;
    this.realDataTimer = setInterval(() => void this.syncRealCryptoPrices(), 5000);
  }

  private startLiveStream() {
    if (typeof window === 'undefined') return;

    this.timer = setInterval(() => {
      const now = Date.now();

      // Heartbeat reflects the REAL feed. Previously this was a self-ticking timer, so the "feed lost" circuit
      // breaker could never fire even when every exchange request was failing.
      const hasEverBeenLive = this.lastRealSuccess > 0;
      if (!hasEverBeenLive || now - this.lastRealSuccess < FEED_STALE_MS) {
        this.lastHeartbeat = now;
        this.heartbeatListeners.forEach((fn) => fn(this.currentLatency, this.lastHeartbeat));
      }

      // Only the synthetic demo symbols get simulated ticks. Real symbols are never fabricated.
      SYNTHETIC_SYMBOLS.forEach((symbol) => {
        const list = this.candles.get(symbol);
        if (!list || list.length === 0) return;
        const last = list[list.length - 1];
        const tickDelta = (Math.random() - 0.495) * (last.close * 0.0008);
        const newClose = Number(Math.max(last.close * 0.8, last.close + tickDelta).toFixed(2));
        list[list.length - 1] = {
          ...last,
          high: Number(Math.max(last.high, newClose).toFixed(2)),
          low: Number(Math.min(last.low, newClose).toFixed(2)),
          close: newClose,
          volume: last.volume + Math.round(Math.random() * 8),
        };
        this.statusMap.set(symbol, { ...this.getMarketStatus(symbol), lastUpdated: now, lastPrice: newClose });
        this.notify(symbol);
      });
    }, 2000);
  }

  public destroy() {
    if (this.timer) clearInterval(this.timer);
    if (this.realDataTimer) clearInterval(this.realDataTimer);
    this.timer = null;
    this.realDataTimer = null;
    this.subscribers.clear();
    this.heartbeatListeners.clear();
    this.statusListeners.clear();
  }
}

// Singleton market data instance
export const marketDataManager = new MarketDataManager();
