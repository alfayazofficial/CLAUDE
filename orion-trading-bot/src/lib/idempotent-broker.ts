import {
  AccountState,
  BrokerConfig,
  ClosedTrade,
  IdempotentOrder,
  MarketSymbol,
  OrderSide,
  OrderType,
  Position,
} from '../types/trading';
import { marketDataManager } from './market-data';
import { riskManager } from './risk-manager';

export class IdempotentBrokerEngine {
  private config: BrokerConfig = {
    provider: 'PAPER',
    apiKey: '',
    apiSecret: '',
    isTestnet: true,
    connected: true,
    lastSyncTime: Date.now(),
  };

  private account: AccountState = {
    initialEquity: 100000,
    balance: 100000,
    equity: 100000,
    marginUsed: 0,
    availableMargin: 100000,
    dailyStartEquity: 100000,
    dailyPnL: 0,
    dailyPnLPercent: 0,
    peakDailyEquity: 100000,
  };

  private dayKey = new Date().toISOString().slice(0, 10);
  private positions: Position[] = [];
  private orderRegistry: Map<string, IdempotentOrder> = new Map();
  private idempotencyRegistry: Map<string, { timestamp: number; orderId: string }> = new Map();
  private closedTrades: ClosedTrade[] = [];
  
  private accountListeners: Set<(acc: AccountState) => void> = new Set();
  private positionsListeners: Set<(positions: Position[]) => void> = new Set();
  private ordersListeners: Set<(orders: IdempotentOrder[]) => void> = new Set();
  private tradeClosedListeners: Set<(trade: ClosedTrade) => void> = new Set();

  constructor() {
    this.loadPersistedState();
    this.setupMarketDataSync();
    this.setupEmergencyKillListener();
  }

  private loadPersistedState() {
    try {
      const savedConfig = localStorage.getItem('orion_broker_config');
      if (savedConfig) this.config = { ...this.config, ...JSON.parse(savedConfig) };

      const savedAccount = localStorage.getItem('orion_account_state');
      if (savedAccount) this.account = { ...this.account, ...JSON.parse(savedAccount) };

      const savedPositions = localStorage.getItem('orion_active_positions');
      if (savedPositions) this.positions = JSON.parse(savedPositions);

      const savedDay = localStorage.getItem('orion_account_day');
      if (savedDay) this.dayKey = savedDay;

      const savedTrades = localStorage.getItem('orion_closed_trades');
      if (savedTrades) this.closedTrades = JSON.parse(savedTrades);
    } catch {
      // fallback
    }
  }

  public savePersistedState() {
    try {
      localStorage.setItem('orion_broker_config', JSON.stringify(this.config));
      localStorage.setItem('orion_account_state', JSON.stringify(this.account));
      localStorage.setItem('orion_active_positions', JSON.stringify(this.positions));
      localStorage.setItem('orion_closed_trades', JSON.stringify(this.closedTrades));
      localStorage.setItem('orion_account_day', this.dayKey);
    } catch {
      // ignore
    }
  }

  private setupMarketDataSync() {
    marketDataManager.subscribe((symbol, _candles, currentPrice) => {
      this.recalculatePositions(symbol, currentPrice);
    });
  }

  private setupEmergencyKillListener() {
    riskManager.onEmergencyFlatten((reason) => {
      this.flattenAllPositions(`EMERGENCY_FLATTEN: ${reason}`);
    });
  }

  public getConfig(): BrokerConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<BrokerConfig>) {
    this.config = { ...this.config, ...updates };
    this.savePersistedState();
  }

  public getAccount(): AccountState {
    return { ...this.account };
  }

  public getPositions(): Position[] {
    return [...this.positions];
  }

  public getOrders(): IdempotentOrder[] {
    return Array.from(this.orderRegistry.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public getClosedTrades(): ClosedTrade[] {
    return [...this.closedTrades];
  }

  public subscribeAccount(cb: (acc: AccountState) => void): () => void {
    this.accountListeners.add(cb);
    return () => {
      this.accountListeners.delete(cb);
    };
  }

  public subscribePositions(cb: (positions: Position[]) => void): () => void {
    this.positionsListeners.add(cb);
    return () => {
      this.positionsListeners.delete(cb);
    };
  }

  public subscribeOrders(cb: (orders: IdempotentOrder[]) => void): () => void {
    this.ordersListeners.add(cb);
    return () => {
      this.ordersListeners.delete(cb);
    };
  }

  public onTradeClosed(cb: (trade: ClosedTrade) => void): () => void {
    this.tradeClosedListeners.add(cb);
    return () => {
      this.tradeClosedListeners.delete(cb);
    };
  }

  /**
   * Generates a strict deterministic idempotency hash and unique clientOrderId.
   */
  public generateClientOrderId(prefix = 'ORD'): string {
    const timestamp = Date.now();
    const entropy = Math.random().toString(36).substring(2, 9).toUpperCase();
    return `${prefix}-${timestamp}-${entropy}`;
  }

  private generateIdempotencyKey(symbol: MarketSymbol, side: OrderSide, amount: number): string {
    const bucket = Math.floor(Date.now() / 4000); // 4-second idempotency deduplication window
    return `${symbol}:${side}:${amount.toFixed(4)}:${bucket}`;
  }

  /**
   * Hardened idempotent order submission wrapper.
   */
  public async submitOrder(params: {
    symbol: MarketSymbol;
    side: OrderSide;
    type: OrderType;
    amount: number;
    limitPrice?: number;
    maxSlippagePercent?: number;
    stopLoss?: number;
    takeProfit?: number;
    source?: 'MANUAL' | 'AUTO_CYCLE' | 'CIRCUIT_BREAKER';
    clientOrderId?: string;
  }): Promise<{ success: boolean; order: IdempotentOrder; error?: string }> {
    const currentPrice = marketDataManager.getCurrentPrice(params.symbol);
    const clientOrderId = params.clientOrderId || this.generateClientOrderId();
    const idempotencyKey = this.generateIdempotencyKey(params.symbol, params.side, params.amount);

    // 1. Idempotency Check: Guard against duplicate in-flight orders / double clicks / network hiccups
    const existing = this.idempotencyRegistry.get(idempotencyKey);
    if (existing && Date.now() - existing.timestamp < 4000) {
      const prevOrder = this.orderRegistry.get(existing.orderId);
      if (prevOrder) {
        return {
          success: false,
          order: prevOrder,
          error: `IDEMPOTENT REJECTION: Identical order was already submitted ${((Date.now() - existing.timestamp) / 1000).toFixed(1)}s ago (Client Order ID: ${existing.orderId})`,
        };
      }
    }

    const order: IdempotentOrder = {
      clientOrderId,
      idempotencyKey,
      symbol: params.symbol,
      side: params.side,
      type: params.type,
      amount: params.amount,
      limitPrice: params.limitPrice,
      targetPrice: params.limitPrice || currentPrice,
      maxSlippagePercent: params.maxSlippagePercent ?? 0.15,
      stopLoss: params.stopLoss,
      takeProfit: params.takeProfit,
      status: 'VALIDATING',
      createdAt: Date.now(),
      source: params.source || 'MANUAL',
    };

    this.orderRegistry.set(clientOrderId, order);
    this.idempotencyRegistry.set(idempotencyKey, { timestamp: Date.now(), orderId: clientOrderId });
    this.notifyOrders();

    // 2. Strict Risk Management Gates Check
    const riskCheck = riskManager.validateOrder(order, this.account.equity, this.positions);
    if (!riskCheck.allowed) {
      order.status = 'REJECTED';
      order.rejectionReason = riskCheck.reason;
      this.orderRegistry.set(clientOrderId, order);
      this.notifyOrders();
      return { success: false, order, error: riskCheck.reason };
    }

    // 3. Margin & Buying Power Check
    const requiredMargin = order.amount * order.targetPrice;
    if (requiredMargin > this.account.availableMargin) {
      order.status = 'REJECTED';
      order.rejectionReason = `Insufficient margin: Required $${requiredMargin.toFixed(2)}, available $${this.account.availableMargin.toFixed(2)}`;
      this.orderRegistry.set(clientOrderId, order);
      this.notifyOrders();
      return { success: false, order, error: order.rejectionReason };
    }

    // 4. Broker Execution Routing
    order.status = 'ROUTED';
    this.notifyOrders();

    // Simulate network latency / broker transmission
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Dynamic slippage modeling
    const slippageFactor = (Math.random() - 0.45) * 0.0008; // realistic basis points
    const slippagePercent = Math.abs(slippageFactor) * 100;
    
    // Slippage violation check
    if (slippagePercent > order.maxSlippagePercent) {
      order.status = 'REJECTED';
      order.rejectionReason = `Execution aborted: Estimated slippage (${slippagePercent.toFixed(3)}%) exceeded threshold (${order.maxSlippagePercent}%)`;
      this.notifyOrders();
      return { success: false, order, error: order.rejectionReason };
    }

    const fillPrice = Number(
      (order.side === 'BUY'
        ? order.targetPrice * (1 + Math.max(0, slippageFactor))
        : order.targetPrice * (1 - Math.max(0, slippageFactor))
      ).toFixed(2)
    );

    const feePaid = Number((fillPrice * order.amount * 0.0006).toFixed(2)); // 6 bps fee

    order.status = 'FILLED';
    order.filledAt = Date.now();
    order.fillPrice = fillPrice;
    order.actualSlippage = Number(slippagePercent.toFixed(4));
    order.feePaid = feePaid;
    order.brokerOrderId = `BRK-${Math.floor(Math.random() * 1000000)}`;

    this.orderRegistry.set(clientOrderId, order);

    // 5. Update Account Margin & Create/Update Position
    this.account.balance -= feePaid;
    this.createOrAppendPosition(order);
    this.recalculateAccount();
    this.notifyOrders();
    this.savePersistedState();

    return { success: true, order };
  }

  private createOrAppendPosition(order: IdempotentOrder) {
    const posSide = order.side === 'BUY' ? 'LONG' : 'SHORT';
    const notional = order.amount * order.fillPrice!;
    const leverage = 1; // 1x spot/perp baseline

    // Check if an existing position for this symbol is active
    const existingIndex = this.positions.findIndex((p) => p.symbol === order.symbol);

    if (existingIndex >= 0) {
      const existing = this.positions[existingIndex];
      if (existing.side === posSide) {
        // Average in
        const totalSize = existing.size + order.amount;
        const totalCost = existing.size * existing.entryPrice + order.amount * order.fillPrice!;
        const avgPrice = totalCost / totalSize;
        existing.size = totalSize;
        existing.entryPrice = Number(avgPrice.toFixed(2));
        existing.margin += notional;
        if (order.stopLoss) existing.stopLoss = order.stopLoss;
        if (order.takeProfit) existing.takeProfit = order.takeProfit;
      } else {
        // Reverse or reduce position
        if (order.amount >= existing.size) {
          this.closePosition(existing.id, 'SIGNAL_REVERSAL', order.fillPrice);
          const remainder = order.amount - existing.size;
          if (remainder > 0) {
            this.positions.push({
              id: `POS-${Date.now()}`,
              symbol: order.symbol,
              side: posSide,
              size: remainder,
              entryPrice: order.fillPrice!,
              currentPrice: order.fillPrice!,
              leverage,
              margin: remainder * order.fillPrice!,
              liquidationPrice: posSide === 'LONG' ? order.fillPrice! * 0.2 : order.fillPrice! * 1.8,
              stopLoss: order.stopLoss,
              takeProfit: order.takeProfit,
              unrealizedPnL: 0,
              unrealizedPnLPercent: 0,
              openTime: Date.now(),
              clientOrderId: order.clientOrderId,
            });
          }
        } else {
          // Partial close
          this.closePartialPosition(existing.id, order.amount, order.fillPrice!);
        }
      }
    } else {
      this.positions.push({
        id: `POS-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        symbol: order.symbol,
        side: posSide,
        size: order.amount,
        entryPrice: order.fillPrice!,
        currentPrice: order.fillPrice!,
        leverage,
        margin: notional,
        liquidationPrice: posSide === 'LONG' ? order.fillPrice! * 0.2 : order.fillPrice! * 1.8,
        stopLoss: order.stopLoss,
        takeProfit: order.takeProfit,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
        openTime: Date.now(),
        clientOrderId: order.clientOrderId,
      });
    }

    this.notifyPositions();
  }

  public closePartialPosition(positionId: string, closeSize: number, exitPrice: number): boolean {
    const pos = this.positions.find((p) => p.id === positionId);
    if (!pos) return false;

    const actualCloseSize = Math.min(pos.size, closeSize);
    const pnlMultiplier = pos.side === 'LONG' ? 1 : -1;
    const grossPnL = (exitPrice - pos.entryPrice) * actualCloseSize * pnlMultiplier;
    const fee = exitPrice * actualCloseSize * 0.0006;
    const netPnL = grossPnL - fee;

    const closedTrade: ClosedTrade = {
      id: `TRD-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      clientOrderId: pos.clientOrderId,
      symbol: pos.symbol,
      side: pos.side,
      entryPrice: pos.entryPrice,
      exitPrice,
      size: actualCloseSize,
      grossPnL: Number(grossPnL.toFixed(2)),
      fee: Number(fee.toFixed(2)),
      netPnL: Number(netPnL.toFixed(2)),
      returnPercent: Number(((netPnL / (pos.entryPrice * actualCloseSize)) * 100).toFixed(2)),
      holdingTimeMs: Date.now() - pos.openTime,
      slippagePercent: 0.02,
      openedAt: pos.openTime,
      closedAt: Date.now(),
      exitReason: 'MANUAL_CLOSE',
    };

    this.closedTrades.unshift(closedTrade);
    this.account.balance += netPnL;

    pos.size -= actualCloseSize;
    pos.margin -= actualCloseSize * pos.entryPrice;

    if (pos.size <= 0.00001) {
      this.positions = this.positions.filter((p) => p.id !== positionId);
    }

    this.tradeClosedListeners.forEach((fn) => fn(closedTrade));
    this.recalculateAccount();
    this.notifyPositions();
    this.savePersistedState();
    return true;
  }

  public closePosition(
    positionId: string,
    reason: ClosedTrade['exitReason'] = 'MANUAL_CLOSE',
    overrideExitPrice?: number
  ): boolean {
    const pos = this.positions.find((p) => p.id === positionId);
    if (!pos) return false;

    const exitPrice = overrideExitPrice || marketDataManager.getCurrentPrice(pos.symbol);
    const pnlMultiplier = pos.side === 'LONG' ? 1 : -1;
    const grossPnL = (exitPrice - pos.entryPrice) * pos.size * pnlMultiplier;
    const fee = exitPrice * pos.size * 0.0006;
    const netPnL = grossPnL - fee;

    const closedTrade: ClosedTrade = {
      id: `TRD-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      clientOrderId: pos.clientOrderId,
      symbol: pos.symbol,
      side: pos.side,
      entryPrice: pos.entryPrice,
      exitPrice,
      size: pos.size,
      grossPnL: Number(grossPnL.toFixed(2)),
      fee: Number(fee.toFixed(2)),
      netPnL: Number(netPnL.toFixed(2)),
      returnPercent: Number(((netPnL / (pos.entryPrice * pos.size)) * 100).toFixed(2)),
      holdingTimeMs: Date.now() - pos.openTime,
      slippagePercent: 0.02,
      openedAt: pos.openTime,
      closedAt: Date.now(),
      exitReason: reason,
    };

    this.closedTrades.unshift(closedTrade);
    this.positions = this.positions.filter((p) => p.id !== positionId);
    this.account.balance += netPnL;

    this.tradeClosedListeners.forEach((fn) => fn(closedTrade));
    this.recalculateAccount();
    this.notifyPositions();
    this.savePersistedState();
    return true;
  }

  /**
   * Emergency Kill-Switch: Market-closes all open positions and cancels any routing orders.
   */
  public flattenAllPositions(reason = 'CIRCUIT_BREAKER_HALT') {
    const posCopy = [...this.positions];
    posCopy.forEach((p) => {
      this.closePosition(p.id, 'CIRCUIT_BREAKER_HALT');
    });
    this.recalculateAccount();
    this.savePersistedState();
  }

  private recalculatePositions(symbol: MarketSymbol, currentPrice: number) {
    let changed = false;

    this.positions.forEach((pos) => {
      if (pos.symbol === symbol) {
        pos.currentPrice = currentPrice;
        const pnlMultiplier = pos.side === 'LONG' ? 1 : -1;
        pos.unrealizedPnL = Number(((currentPrice - pos.entryPrice) * pos.size * pnlMultiplier).toFixed(2));
        pos.unrealizedPnLPercent = Number(((pos.unrealizedPnL / (pos.entryPrice * pos.size)) * 100).toFixed(2));

        // Auto Stop-Loss Check
        if (pos.stopLoss) {
          if (pos.side === 'LONG' && currentPrice <= pos.stopLoss) {
            this.closePosition(pos.id, 'STOP_LOSS', currentPrice);
            return;
          }
          if (pos.side === 'SHORT' && currentPrice >= pos.stopLoss) {
            this.closePosition(pos.id, 'STOP_LOSS', currentPrice);
            return;
          }
        }

        // Auto Take-Profit Check
        if (pos.takeProfit) {
          if (pos.side === 'LONG' && currentPrice >= pos.takeProfit) {
            this.closePosition(pos.id, 'TAKE_PROFIT', currentPrice);
            return;
          }
          if (pos.side === 'SHORT' && currentPrice <= pos.takeProfit) {
            this.closePosition(pos.id, 'TAKE_PROFIT', currentPrice);
            return;
          }
        }

        changed = true;
      }
    });

    if (changed) {
      this.recalculateAccount();
      this.notifyPositions();
    }
  }

  /** Resets the daily baselines at 00:00 UTC. Before this, 'daily' PnL and peak equity accumulated forever,
   *  so the 3% "daily" drawdown breaker was really a drawdown-since-all-time-high breaker. */
  private rolloverDayIfNeeded() {
    const today = new Date().toISOString().slice(0, 10);
    if (today === this.dayKey) return;
    this.dayKey = today;
    this.account.dailyStartEquity = this.account.equity;
    this.account.peakDailyEquity = this.account.equity;
    this.account.dailyPnL = 0;
    this.account.dailyPnLPercent = 0;
  }

  public recalculateAccount() {
    this.rolloverDayIfNeeded();
    const totalUnrealized = this.positions.reduce((sum, p) => sum + p.unrealizedPnL, 0);
    const totalMargin = this.positions.reduce((sum, p) => sum + p.margin, 0);

    this.account.equity = Number((this.account.balance + totalUnrealized).toFixed(2));
    this.account.marginUsed = Number(totalMargin.toFixed(2));
    this.account.availableMargin = Number(Math.max(0, this.account.equity - totalMargin).toFixed(2));

    if (this.account.equity > this.account.peakDailyEquity) {
      this.account.peakDailyEquity = this.account.equity;
    }

    this.account.dailyPnL = Number((this.account.equity - this.account.dailyStartEquity).toFixed(2));
    this.account.dailyPnLPercent = Number(
      ((this.account.dailyPnL / this.account.dailyStartEquity) * 100).toFixed(2)
    );

    // Continuous risk manager drawdown check
    riskManager.evaluateDrawdown(this.account.peakDailyEquity, this.account.equity);

    this.notifyAccount();
  }

  public resetAccount(initialBalance = 100000) {
    this.account = {
      initialEquity: initialBalance,
      balance: initialBalance,
      equity: initialBalance,
      marginUsed: 0,
      availableMargin: initialBalance,
      dailyStartEquity: initialBalance,
      dailyPnL: 0,
      dailyPnLPercent: 0,
      peakDailyEquity: initialBalance,
    };
    this.positions = [];
    this.closedTrades = [];
    this.orderRegistry.clear();
    this.idempotencyRegistry.clear();
    this.savePersistedState();
    this.notifyAccount();
    this.notifyPositions();
    this.notifyOrders();
  }

  private notifyAccount() {
    this.accountListeners.forEach((fn) => fn({ ...this.account }));
  }

  private notifyPositions() {
    this.positionsListeners.forEach((fn) => fn([...this.positions]));
  }

  private notifyOrders() {
    const list = this.getOrders();
    this.ordersListeners.forEach((fn) => fn(list));
  }
}

export const idempotentBroker = new IdempotentBrokerEngine();
