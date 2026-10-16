import { MarketSymbol } from '../types/trading';

export interface TVSymbolInfo {
  symbol: MarketSymbol;
  tvSymbol: string;
  name: string;
  category: 'CRYPTO' | 'STOCKS' | 'COMMODITIES' | 'FOREX';
  exchange: string;
}

export const ALL_TRADINGVIEW_SYMBOLS: TVSymbolInfo[] = [
  // Top Cryptocurrencies
  { symbol: 'BTC/USDT', tvSymbol: 'BINANCE:BTCUSDT', name: 'Bitcoin', category: 'CRYPTO', exchange: 'BINANCE' },
  { symbol: 'ETH/USDT', tvSymbol: 'BINANCE:ETHUSDT', name: 'Ethereum', category: 'CRYPTO', exchange: 'BINANCE' },
  { symbol: 'SOL/USDT', tvSymbol: 'BINANCE:SOLUSDT', name: 'Solana', category: 'CRYPTO', exchange: 'BINANCE' },
  { symbol: 'XRP/USDT', tvSymbol: 'BINANCE:XRPUSDT', name: 'Ripple', category: 'CRYPTO', exchange: 'BINANCE' },
  { symbol: 'DOGE/USDT', tvSymbol: 'BINANCE:DOGEUSDT', name: 'Dogecoin', category: 'CRYPTO', exchange: 'BINANCE' },
  { symbol: 'BNB/USDT', tvSymbol: 'BINANCE:BNBUSDT', name: 'BNB', category: 'CRYPTO', exchange: 'BINANCE' },
  { symbol: 'ADA/USDT', tvSymbol: 'BINANCE:ADAUSDT', name: 'Cardano', category: 'CRYPTO', exchange: 'BINANCE' },
  { symbol: 'AVAX/USDT', tvSymbol: 'BINANCE:AVAXUSDT', name: 'Avalanche', category: 'CRYPTO', exchange: 'BINANCE' },
  { symbol: 'LINK/USDT', tvSymbol: 'BINANCE:LINKUSDT', name: 'Chainlink', category: 'CRYPTO', exchange: 'BINANCE' },
  { symbol: 'SUI/USDT', tvSymbol: 'BINANCE:SUIUSDT', name: 'Sui', category: 'CRYPTO', exchange: 'BINANCE' },
  { symbol: 'NEAR/USDT', tvSymbol: 'BINANCE:NEARUSDT', name: 'Near Protocol', category: 'CRYPTO', exchange: 'BINANCE' },
  { symbol: 'PEPE/USDT', tvSymbol: 'BINANCE:PEPEUSDT', name: 'Pepe', category: 'CRYPTO', exchange: 'BINANCE' },
  
  // US Equities & Tech
  { symbol: 'NVDA', tvSymbol: 'NASDAQ:NVDA', name: 'Nvidia Corp', category: 'STOCKS', exchange: 'NASDAQ' },
  { symbol: 'AAPL', tvSymbol: 'NASDAQ:AAPL', name: 'Apple Inc', category: 'STOCKS', exchange: 'NASDAQ' },
  { symbol: 'TSLA', tvSymbol: 'NASDAQ:TSLA', name: 'Tesla Inc', category: 'STOCKS', exchange: 'NASDAQ' },
  { symbol: 'SPY', tvSymbol: 'AMEX:SPY', name: 'SPDR S&P 500 ETF', category: 'STOCKS', exchange: 'AMEX' },
  { symbol: 'QQQ', tvSymbol: 'NASDAQ:QQQ', name: 'Invesco QQQ Trust', category: 'STOCKS', exchange: 'NASDAQ' },
  { symbol: 'MSFT', tvSymbol: 'NASDAQ:MSFT', name: 'Microsoft Corp', category: 'STOCKS', exchange: 'NASDAQ' },
  { symbol: 'AMZN', tvSymbol: 'NASDAQ:AMZN', name: 'Amazon.com Inc', category: 'STOCKS', exchange: 'NASDAQ' },

  // Commodities & Forex
  { symbol: 'GOLD', tvSymbol: 'OANDA:XAUUSD', name: 'Gold / US Dollar', category: 'COMMODITIES', exchange: 'OANDA' },
  { symbol: 'EUR/USD', tvSymbol: 'FX:EURUSD', name: 'Euro / US Dollar', category: 'FOREX', exchange: 'FX' },
];

/**
 * Maps standard timeframes to TradingView widget intervals
 * Critical: In TradingView widget, '1h' is invalid! It MUST be '60', '4h' MUST be '240'.
 */
export function mapTimeframeToTradingViewInterval(tf: string): string {
  switch (tf) {
    case '1m':
      return '1';
    case '3m':
      return '3';
    case '5m':
      return '5';
    case '15m':
      return '15';
    case '30m':
      return '30';
    case '1h':
      return '60';
    case '2h':
      return '120';
    case '4h':
      return '240';
    case '1D':
    case '1d':
    case 'D':
      return 'D';
    case '1W':
    case '1w':
    case 'W':
      return 'W';
    default:
      return '60';
  }
}

/**
 * Resolves an exchange + symbol into a verified TradingView ticker format
 */
export function resolveTradingViewExchangeTicker(exchange: string, symbol: string): string {
  // If already prefixed with exchange
  if (symbol.includes(':')) {
    return symbol.toUpperCase();
  }

  const clean = symbol.replace('/', '').toUpperCase();
  const ex = exchange.toUpperCase();

  // Equities & Commodities mappings
  if (clean === 'NVDA' || clean === 'AAPL' || clean === 'TSLA' || clean === 'MSFT' || clean === 'AMZN' || clean === 'QQQ') {
    return `NASDAQ:${clean}`;
  }
  if (clean === 'SPY') {
    return 'AMEX:SPY';
  }
  if (clean === 'GOLD' || clean === 'XAUUSD') {
    return 'OANDA:XAUUSD';
  }
  if (clean === 'EURUSD' || clean === 'EUR/USD') {
    return 'FX:EURUSD';
  }

  // Crypto exchange mappings
  if (ex === 'COINBASE') {
    const pair = clean.replace('USDT', 'USD');
    return `COINBASE:${pair}`;
  }
  if (ex === 'BYBIT') {
    return `BYBIT:${clean}`;
  }
  if (ex === 'OKX') {
    return `OKX:${clean}`;
  }
  if (ex === 'KRAKEN') {
    return `KRAKEN:${clean.replace('USDT', 'USD')}`;
  }

  // Default to Binance or the selected exchange
  return `${ex}:${clean}`;
}

/**
 * Resolves any Orion MarketSymbol or custom user input into a TradingView ticker format.
 */
export function resolveTradingViewSymbol(symbol: string): string {
  // If user passed a full TradingView formatted string (e.g. BINANCE:BTCUSDT or NASDAQ:AAPL)
  if (symbol.includes(':')) {
    return symbol.toUpperCase();
  }

  const match = ALL_TRADINGVIEW_SYMBOLS.find(
    (s) => s.symbol.toUpperCase() === symbol.toUpperCase() || s.name.toUpperCase() === symbol.toUpperCase()
  );
  if (match) return match.tvSymbol;

  // Clean crypto pair
  if (symbol.includes('/')) {
    const clean = symbol.replace('/', '').toUpperCase();
    return `BINANCE:${clean}`;
  }

  // Stock fallback
  return `NASDAQ:${symbol.toUpperCase()}`;
}

export interface TradingViewQuote {
  symbol: string;
  name: string;
  close: number;
  change: number;
  changePercent: number;
  volume: number;
  recommendation?: string;
}

/**
 * Fetches real crypto scanner quotes from TradingView Scanner API via proxy or direct
 */
export async function fetchTradingViewQuotes(): Promise<Record<string, TradingViewQuote>> {
  const result: Record<string, TradingViewQuote> = {};

  try {
    const payload = {
      symbols: {
        tickers: [
          'BINANCE:BTCUSDT',
          'BINANCE:ETHUSDT',
          'BINANCE:SOLUSDT',
          'BINANCE:XRPUSDT',
          'BINANCE:DOGEUSDT',
          'BINANCE:BNBUSDT',
          'BINANCE:ADAUSDT',
          'BINANCE:AVAXUSDT',
          'BINANCE:LINKUSDT',
          'BINANCE:SUIUSDT',
          'BINANCE:NEARUSDT',
        ],
      },
      columns: ['name', 'close', 'change', 'change_abs', 'volume', 'Recommend.All'],
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch('/api/tv-scanner/crypto/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.data)) {
        data.data.forEach((row: any) => {
          const ticker = row.s; // e.g. "BINANCE:BTCUSDT"
          const vals = row.d;
          if (vals && vals.length >= 5) {
            result[ticker] = {
              symbol: ticker,
              name: vals[0],
              close: vals[1],
              changePercent: vals[2],
              change: vals[3],
              volume: vals[4],
              recommendation: vals[5] > 0.5 ? 'STRONG_BUY' : vals[5] > 0.1 ? 'BUY' : vals[5] < -0.5 ? 'STRONG_SELL' : vals[5] < -0.1 ? 'SELL' : 'NEUTRAL',
            };
          }
        });
      }
    }
  } catch {
    // If proxy has network partition, graceful continuation
  }

  return result;
}
