import {
  CircuitBreakerState,
  IdempotentOrder,
  Position,
} from '../types/trading';

export class RiskManager {
  private state: CircuitBreakerState = {
    maxDailyDrawdownPercent: 3.0, // 3% code-enforced circuit breaker
    currentDailyDrawdownPercent: 0.0,
    isTripped: false,
    trippedReason: null,
    trippedAt: null,
    maxPositionSizePercent: 10.0, // Max 10% equity per trade
    maxTotalExposurePercent: 50.0, // Max 50% combined exposure
    heartbeatTimeoutMs: 10000, // 10 seconds disconnect guard
    lastHeartbeatTime: Date.now(),
    heartbeatStatus: 'HEALTHY',
    autoFlattenOnHeartbeatLoss: true,
    slippageLimitPercent: 0.25, // 0.25% max slippage
  };

  private listeners: Set<(state: CircuitBreakerState) => void> = new Set();
  private flattenListeners: Set<(reason: string) => void> = new Set();

  constructor() {
    this.loadState();
  }

  private loadState() {
    try {
      const saved = localStorage.getItem('orion_risk_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.state = {
          ...this.state,
          ...parsed,
          lastHeartbeatTime: Date.now(),
        };
      }
    } catch {
      // ignore
    }
  }

  public saveState() {
    try {
      localStorage.setItem('orion_risk_state', JSON.stringify(this.state));
    } catch {
      // ignore
    }
  }

  public getState(): CircuitBreakerState {
    return { ...this.state };
  }

  public updateConfig(updates: Partial<CircuitBreakerState>) {
    this.state = { ...this.state, ...updates };
    this.saveState();
    this.notify();
  }

  public subscribe(cb: (state: CircuitBreakerState) => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  public onEmergencyFlatten(cb: (reason: string) => void): () => void {
    this.flattenListeners.add(cb);
    return () => {
      this.flattenListeners.delete(cb);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn({ ...this.state }));
  }

  /**
   * Monitor portfolio daily drawdown.
   * If current equity drops by more than maxDailyDrawdownPercent (e.g. 3.0%) from the peak,
   * trips the circuit breaker hard-stop.
   */
  public evaluateDrawdown(peakDailyEquity: number, currentEquity: number): boolean {
    if (peakDailyEquity <= 0) return false;

    const dd = Math.max(0, ((peakDailyEquity - currentEquity) / peakDailyEquity) * 100);
    this.state.currentDailyDrawdownPercent = Number(dd.toFixed(2));

    if (dd >= this.state.maxDailyDrawdownPercent && !this.state.isTripped) {
      this.tripCircuitBreaker(
        `CIRCUIT BREAKER: Max Daily Drawdown of ${this.state.maxDailyDrawdownPercent}% breached (Current Drawdown: ${dd.toFixed(2)}%). All automated and manual entries blocked.`
      );
      return true;
    }

    this.notify();
    return this.state.isTripped;
  }

  /**
   * Validates order against all strict risk gates:
   * 1. Circuit breaker status
   * 2. Feed heartbeat status
   * 3. Max position size limit relative to equity
   * 4. Total exposure limit
   * 5. Slippage tolerance
   */
  public validateOrder(
    order: IdempotentOrder,
    totalEquity: number,
    activePositions: Position[]
  ): { allowed: boolean; reason?: string } {
    // 1. Is Circuit Breaker active?
    if (this.state.isTripped) {
      return {
        allowed: false,
        reason: `Order blocked: Circuit Breaker active (${this.state.trippedReason})`,
      };
    }

    // 2. Is Feed Heartbeat Lost? (>10 seconds)
    const now = Date.now();
    const heartbeatAge = now - this.state.lastHeartbeatTime;
    if (heartbeatAge > this.state.heartbeatTimeoutMs) {
      return {
        allowed: false,
        reason: `Order blocked: Feed heartbeat lost (${(heartbeatAge / 1000).toFixed(1)}s since last tick). Execution paused for safety.`,
      };
    }

    // 3. Position size check
    const orderNotional = order.amount * order.targetPrice;
    const maxAllowedNotional = (totalEquity * this.state.maxPositionSizePercent) / 100;
    if (orderNotional > maxAllowedNotional) {
      return {
        allowed: false,
        reason: `Order blocked: Position size $${orderNotional.toFixed(2)} exceeds maximum risk threshold of ${this.state.maxPositionSizePercent}% ($${maxAllowedNotional.toFixed(2)})`,
      };
    }

    // 4. Total portfolio exposure check
    const currentTotalExposure = activePositions.reduce(
      (sum, p) => sum + p.size * p.currentPrice,
      0
    );
    const newTotalExposure = currentTotalExposure + orderNotional;
    const maxTotalAllowed = (totalEquity * this.state.maxTotalExposurePercent) / 100;
    if (newTotalExposure > maxTotalAllowed) {
      return {
        allowed: false,
        reason: `Order blocked: Total portfolio exposure $${newTotalExposure.toFixed(2)} exceeds cap of ${this.state.maxTotalExposurePercent}% ($${maxTotalAllowed.toFixed(2)})`,
      };
    }

    // 5. Slippage limit
    if (order.maxSlippagePercent > this.state.slippageLimitPercent) {
      return {
        allowed: false,
        reason: `Order blocked: Requested slippage ${order.maxSlippagePercent}% exceeds institutional ceiling of ${this.state.slippageLimitPercent}%`,
      };
    }

    return { allowed: true };
  }

  /**
   * Heartbeat monitor check.
   * Returns HEALTHY, WARNING (5-10s), or TIMEOUT_LOST (>10s).
   */
  public updateHeartbeat(timestamp: number) {
    this.state.lastHeartbeatTime = timestamp;
    const prevStatus = this.state.heartbeatStatus;
    this.state.heartbeatStatus = 'HEALTHY';
    if (prevStatus !== 'HEALTHY') {
      this.notify();
    }
  }

  public checkHeartbeatLoss(): 'HEALTHY' | 'WARNING' | 'TIMEOUT_LOST' {
    const elapsed = Date.now() - this.state.lastHeartbeatTime;
    let status: 'HEALTHY' | 'WARNING' | 'TIMEOUT_LOST' = 'HEALTHY';

    if (elapsed > this.state.heartbeatTimeoutMs) {
      status = 'TIMEOUT_LOST';
      if (this.state.autoFlattenOnHeartbeatLoss && !this.state.isTripped) {
        this.tripCircuitBreaker(
          `HEARTBEAT TIMEOUT: Data feed disconnected for >${(this.state.heartbeatTimeoutMs / 1000).toFixed(0)}s. Automatic fail-safe triggered.`
        );
        this.triggerEmergencyFlatten('FEED_HEARTBEAT_DISCONNECT');
      }
    } else if (elapsed > 5000) {
      status = 'WARNING';
    }

    this.state.heartbeatStatus = status;
    return status;
  }

  public tripCircuitBreaker(reason: string) {
    this.state.isTripped = true;
    this.state.trippedReason = reason;
    this.state.trippedAt = Date.now();
    this.saveState();
    this.notify();
  }

  public resetCircuitBreaker() {
    this.state.isTripped = false;
    this.state.trippedReason = null;
    this.state.trippedAt = null;
    this.state.currentDailyDrawdownPercent = 0.0;
    this.saveState();
    this.notify();
  }

  public triggerEmergencyFlatten(reason: string = 'MANUAL_EMERGENCY_KILL') {
    this.tripCircuitBreaker(`EMERGENCY HALT & FLATTEN ALL: ${reason}`);
    this.flattenListeners.forEach((fn) => fn(reason));
  }
}

export const riskManager = new RiskManager();
