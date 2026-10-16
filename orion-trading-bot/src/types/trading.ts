export type StandardMarketSymbol =
  | 'BTC/USDT'
  | 'ETH/USDT'
  | 'SOL/USDT'
  | 'XRP/USDT'
  | 'DOGE/USDT'
  | 'BNB/USDT'
  | 'ADA/USDT'
  | 'AVAX/USDT'
  | 'LINK/USDT'
  | 'SUI/USDT'
  | 'NEAR/USDT'
  | 'PEPE/USDT'
  | 'NVDA'
  | 'AAPL'
  | 'TSLA'
  | 'SPY'
  | 'QQQ'
  | 'MSFT'
  | 'AMZN'
  | 'GOLD'
  | 'EUR/USD';

export type MarketSymbol = StandardMarketSymbol | string;

export interface BacktestRequirements {
  symbol: MarketSymbol;
  exchange: 'BINANCE' | 'BYBIT' | 'COINBASE' | 'OKX' | 'KRAKEN' | 'ALPACA' | 'INTERACTIVE_BROKERS';
  strategyId: string;
  dailyBudget: number; // User daily budget in USD
  tradingDurationDays: number; // e.g. 7, 14, 30, 60, 90, 180, 365 days
  profitToLossRatio: number; // R:R ratio (e.g. 1.5, 2.0, 2.5, 3.0)
  timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1D';
  historicalRange: '7D' | '14D' | '30D' | '90D' | '180D' | '1Y';
  candleCount: number;
  initialCapital: number;
  positionSizePercent: number;
  leverage: number;
  // Strategy trigger parameters
  utSensitivity: number;
  atrPeriod: number;
  enablePercentBFilter: boolean;
  percentBUpperCutoff: number; // e.g. 0.85
  percentBLowerCutoff: number; // e.g. 0.15
  enableEMATrendFilter: boolean;
  enableRSIGuard: boolean;
  rsiOverbought: number;
  rsiOversold: number;
  enableMultiTimeframeConfirm: boolean;
  // Execution & Exit requirements
  stopLossPercent: number;
  takeProfitPercent: number;
  enableTrailingStop: boolean;
  slippageBps: number;
  feeBps: number;
}

export interface Candle {
  time: number; // Unix timestamp in ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface UTBotState {
  trailingStop: number;
  signal: 'BUY' | 'SELL' | 'HOLD';
  isBuyTrigger: boolean;
  isSellTrigger: boolean;
  sensitivity: number;
  atrPeriod: number;
  lastClose: number;
}

export interface BollingerPercentBState {
  basis: number;
  upper: number;
  lower: number;
  percentB: number; // (close - lower) / (upper - lower)
  bandwidth: number;
  signal: 'OVERBOUGHT' | 'OVERSOLD' | 'NEUTRAL';
}

export interface IndicatorBundle {
  candles: Candle[];
  utBot: UTBotState;
  bollinger: BollingerPercentBState;
  rsi: number;
  ema20: number;
  ema50: number;
  ema200: number;
  atr: number;
}

export type ForecastDirection = 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';

export interface MultiTimeframeMatrix {
  '1m': 'BULL' | 'BEAR' | 'NEUTRAL';
  '5m': 'BULL' | 'BEAR' | 'NEUTRAL';
  '15m': 'BULL' | 'BEAR' | 'NEUTRAL';
  '1h': 'BULL' | 'BEAR' | 'NEUTRAL';
  '4h': 'BULL' | 'BEAR' | 'NEUTRAL';
  '1D': 'BULL' | 'BEAR' | 'NEUTRAL';
}

export interface CompositeForecast {
  symbol: MarketSymbol;
  score: number; // -100 to +100
  conviction: number; // 0 to 100%
  direction: ForecastDirection;
  utBotSignal: 'BUY' | 'SELL' | 'HOLD';
  percentB: number;
  rsi: number;
  volatilityScore: number;
  momentumScore: number;
  multiTimeframe: MultiTimeframeMatrix;
  suggestedStopLoss: number;
  suggestedTakeProfit: number;
  riskRewardRatio: number;
  timestamp: number;
}

export type OrderSide = 'BUY' | 'SELL';
export type PositionSide = 'LONG' | 'SHORT';
export type OrderType = 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'TAKE_PROFIT';
export type OrderStatus = 'PENDING' | 'VALIDATING' | 'ROUTED' | 'FILLED' | 'REJECTED' | 'CANCELLED';

export interface IdempotentOrder {
  clientOrderId: string; // Guaranteed unique ID with client timestamp
  idempotencyKey: string; // Hash of symbol + side + amount + timestamp bucket
  symbol: MarketSymbol;
  side: OrderSide;
  type: OrderType;
  amount: number;
  limitPrice?: number;
  targetPrice: number;
  maxSlippagePercent: number; // e.g. 0.15%
  stopLoss?: number;
  takeProfit?: number;
  status: OrderStatus;
  createdAt: number;
  filledAt?: number;
  fillPrice?: number;
  actualSlippage?: number;
  feePaid?: number;
  rejectionReason?: string;
  brokerOrderId?: string;
  source: 'MANUAL' | 'AUTO_CYCLE' | 'CIRCUIT_BREAKER';
}

export interface Position {
  id: string;
  symbol: MarketSymbol;
  side: PositionSide;
  size: number;
  entryPrice: number;
  currentPrice: number;
  leverage: number;
  margin: number;
  liquidationPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  trailingStop?: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  openTime: number;
  clientOrderId: string;
}

export type BrokerProvider = 'PAPER' | 'ALPACA' | 'CCXT_BINANCE' | 'INTERACTIVE_BROKERS';

export interface BrokerConfig {
  provider: BrokerProvider;
  apiKey: string;
  apiSecret: string;
  isTestnet: boolean;
  endpointUrl?: string;
  connected: boolean;
  lastSyncTime: number;
}

export interface AccountState {
  initialEquity: number;
  balance: number;
  equity: number;
  marginUsed: number;
  availableMargin: number;
  dailyStartEquity: number;
  dailyPnL: number;
  dailyPnLPercent: number;
  peakDailyEquity: number;
}

export interface CircuitBreakerState {
  maxDailyDrawdownPercent: number; // e.g. 3.0%
  currentDailyDrawdownPercent: number; // Drop from day's peak equity
  isTripped: boolean;
  trippedReason: string | null;
  trippedAt: number | null;
  maxPositionSizePercent: number; // e.g. 10.0% of total account equity
  maxTotalExposurePercent: number; // e.g. 60.0% of total account equity
  heartbeatTimeoutMs: number; // 10,000ms = 10s
  lastHeartbeatTime: number;
  heartbeatStatus: 'HEALTHY' | 'WARNING' | 'TIMEOUT_LOST';
  autoFlattenOnHeartbeatLoss: boolean;
  slippageLimitPercent: number; // Max allowed execution slippage (e.g. 0.25%)
}

export interface ClosedTrade {
  id: string;
  clientOrderId: string;
  symbol: MarketSymbol;
  side: PositionSide;
  entryPrice: number;
  exitPrice: number;
  size: number;
  grossPnL: number;
  fee: number;
  netPnL: number;
  returnPercent: number;
  holdingTimeMs: number;
  slippagePercent: number;
  openedAt: number;
  closedAt: number;
  exitReason: 'TAKE_PROFIT' | 'STOP_LOSS' | 'MANUAL_CLOSE' | 'CIRCUIT_BREAKER_HALT' | 'SIGNAL_REVERSAL';
}

export interface LedgerMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number; // 0 - 100%
  profitFactor: number;
  totalGrossProfit: number;
  totalGrossLoss: number;
  totalNetPnL: number;
  averageTradePnL: number;
  maxDrawdownPercent: number;
  sharpeRatio: number;
  expectancyRatio: number;
}

export interface AutoCycleLog {
  id: string;
  timestamp: number;
  level: 'INFO' | 'WARN' | 'ERROR' | 'EXEC';
  message: string;
  details?: Record<string, unknown>;
}

export interface AutoCycleConfig {
  enabled: boolean;
  intervalSeconds: number; // 5, 10, 30, 60
  minConviction: number; // e.g. 70%
  tradeSizePercent: number; // e.g. 5%
  enableUTBotFilter: boolean;
  enablePercentBFilter: boolean;
  enableMultiTimeframeConfirm: boolean;
  autoStopLossPercent: number; // e.g. 1.5%
  autoTakeProfitPercent: number; // e.g. 3.0%
  dailyBudget: number; // Enforced daily trading budget ($)
  dailySpent: number; // Budget spent today ($)
  tradingDurationDays: number; // Planned campaign length
  campaignStartDate: number | null;
  dailyResetDate?: string; // UTC yyyy-mm-dd the dailySpent counter belongs to
  targetSymbol: string;
  selectedExchange: string;
  strategyName: string;
  profitToLossRatio: number;
}
