import { AutoCycleConfig, AutoCycleLog, MarketSymbol } from '../types/trading';
import { idempotentBroker } from './idempotent-broker';
import { marketDataManager } from './market-data';
import { riskManager } from './risk-manager';
import { computeCompositeForecast } from './scoring-engine';

export class AutoCycleDaemon {
  private config: AutoCycleConfig = {
    enabled: false,
    intervalSeconds: 5,
    minConviction: 65,
    tradeSizePercent: 5.0, // 5% account equity per trade
    enableUTBotFilter: true,
    enablePercentBFilter: true,
    enableMultiTimeframeConfirm: true,
    autoStopLossPercent: 1.5,
    autoTakeProfitPercent: 3.5,
    dailyBudget: 2500,
    dailySpent: 0,
    tradingDurationDays: 30,
    campaignStartDate: null,
    targetSymbol: 'BTC/USDT',
    selectedExchange: 'BINANCE',
    strategyName: 'Orion UT Bot Trend Surfer',
    profitToLossRatio: 2.0,
  };

  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false; // guards against overlapping cycles (orders take ~150ms+, interval can be 5s or less)
  private cycleCount = 0;
  private lastRunTime: number | null = null;
  private logs: AutoCycleLog[] = [];
  private logListeners: Set<(logs: AutoCycleLog[]) => void> = new Set();
  private statusListeners: Set<(status: { enabled: boolean; cycleCount: number; lastRunTime: number | null }) => void> = new Set();

  constructor() {
    this.loadState();
  }

  private loadState() {
    try {
      const savedConfig = localStorage.getItem('orion_auto_config');
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig), enabled: false }; // safety default to false on start
      }
    } catch {
      // ignore
    }
  }

  public getConfig(): AutoCycleConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<AutoCycleConfig>) {
    this.config = { ...this.config, ...updates };
    try {
      localStorage.setItem('orion_auto_config', JSON.stringify(this.config));
    } catch {
      // ignore
    }
    this.notifyStatus();
  }

  public getLogs(): AutoCycleLog[] {
    return [...this.logs];
  }

  public subscribeLogs(cb: (logs: AutoCycleLog[]) => void): () => void {
    this.logListeners.add(cb);
    return () => {
      this.logListeners.delete(cb);
    };
  }

  public subscribeStatus(cb: (s: { enabled: boolean; cycleCount: number; lastRunTime: number | null }) => void): () => void {
    this.statusListeners.add(cb);
    return () => {
      this.statusListeners.delete(cb);
    };
  }

  public log(level: AutoCycleLog['level'], message: string, details?: Record<string, unknown>) {
    const entry: AutoCycleLog = {
      id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      level,
      message,
      details,
    };
    this.logs.unshift(entry);
    if (this.logs.length > 200) this.logs.pop();
    this.logListeners.forEach((fn) => fn([...this.logs]));
  }

  public start() {
    if (this.timer) clearInterval(this.timer);
    this.config.enabled = true;
    if (!this.config.campaignStartDate) this.config.campaignStartDate = Date.now();
    this.log('INFO', `Auto-Cycle daemon started. Scanning at ${this.config.intervalSeconds}s intervals.`);
    this.notifyStatus();

    this.timer = setInterval(() => {
      void this.executeCycle();
    }, this.config.intervalSeconds * 1000);

    // Run first cycle immediately
    void this.executeCycle();
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.config.enabled = false;
    this.log('WARN', 'Auto-Cycle daemon paused by operator.');
    this.notifyStatus();
  }

  private todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  private async executeCycle() {
    if (this.running) return;
    this.running = true;
    try {
      await this.runCycle();
    } catch (err: any) {
      this.log('ERROR', `Cycle error: ${err?.message || err}`);
    } finally {
      this.running = false;
    }
  }

  private async runCycle() {
    this.cycleCount++;
    this.lastRunTime = Date.now();
    this.notifyStatus();

    // 0. Daily budget counter rolls over at 00:00 UTC (it previously never reset and was never incremented).
    if (this.config.dailyResetDate !== this.todayKey()) {
      this.config.dailyResetDate = this.todayKey();
      this.config.dailySpent = 0;
      this.updateConfig({});
    }

    // 1. Circuit Breaker Check
    const cbState = riskManager.getState();
    if (cbState.isTripped) {
      this.log('ERROR', `Auto-Cycle blocked by Active Circuit Breaker: ${cbState.trippedReason}`);
      this.stop();
      return;
    }

    // 2. Feed Heartbeat Check
    const hbStatus = riskManager.checkHeartbeatLoss();
    if (hbStatus === 'TIMEOUT_LOST') {
      this.log('ERROR', 'Auto-Cycle aborted: Feed heartbeat lost (>10s). Pausing automated daemon.');
      this.stop();
      return;
    }

    // 3. Campaign Duration Check
    if (this.config.campaignStartDate && this.config.tradingDurationDays > 0) {
      const elapsedDays = (Date.now() - this.config.campaignStartDate) / 86400000;
      if (elapsedDays >= this.config.tradingDurationDays) {
        this.log('INFO', `Auto-Trade Campaign of ${this.config.tradingDurationDays} days completed.`);
        this.stop();
        return;
      }
    }

    // 4. Only symbols with a LIVE exchange feed are tradable. The equity symbols are a random-walk
    //    demo; auto-trading them would be trading noise.
    const symbols: MarketSymbol[] = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'];

    for (const symbol of symbols) {
      if (!marketDataManager.isLive(symbol)) continue;

      // Fresh account/positions each iteration: the previous symbol's order may just have changed them.
      const activePositions = idempotentBroker.getPositions();
      const account = idempotentBroker.getAccount();

      const candles = marketDataManager.getCandles(symbol);
      const forecast = computeCompositeForecast(symbol, candles);
      if (forecast.conviction < this.config.minConviction) continue;

      const isLong = forecast.direction === 'STRONG_BUY' || forecast.direction === 'BUY';
      const isShort = forecast.direction === 'STRONG_SELL' || forecast.direction === 'SELL';
      if (!isLong && !isShort) continue;

      const existingPos = activePositions.find((p) => p.symbol === symbol);
      if (existingPos && existingPos.side === (isLong ? 'LONG' : 'SHORT')) continue;

      // Filters (all three toggles are now honoured)
      if (this.config.enableUTBotFilter && forecast.utBotSignal !== (isLong ? 'BUY' : 'SELL')) continue;
      if (this.config.enablePercentBFilter) {
        if (isLong && forecast.percentB > 0.9) continue; // don't buy the top of the band
        if (isShort && forecast.percentB < 0.1) continue; // don't sell the bottom
      }
      if (this.config.enableMultiTimeframeConfirm) {
        const want = isLong ? 'BULL' : 'BEAR';
        if (forecast.multiTimeframe['15m'] !== want || forecast.multiTimeframe['1h'] !== want) continue;
      }

      const currentPrice = marketDataManager.getCurrentPrice(symbol);
      const orderNotional = (account.equity * this.config.tradeSizePercent) / 100;
      const amount = Number((orderNotional / currentPrice).toFixed(symbol.includes('BTC') ? 5 : 3));
      if (amount <= 0) continue;

      // Stops must be on the correct side of price, otherwise the order would be closed on the very next tick.
      const sl = forecast.suggestedStopLoss;
      const tp = forecast.suggestedTakeProfit;
      const validBracket = isLong ? sl < currentPrice && tp > currentPrice : sl > currentPrice && tp < currentPrice;
      if (!validBracket) {
        this.log('WARN', `Skipped ${symbol}: invalid SL/TP bracket (SL ${sl}, TP ${tp}, price ${currentPrice}).`);
        continue;
      }

      // Enforce the daily budget BEFORE the order (and count it after).
      if (this.config.dailyBudget > 0 && this.config.dailySpent + orderNotional > this.config.dailyBudget) {
        this.log('WARN', `Daily budget ($${this.config.dailyBudget}) would be exceeded by ${symbol} ($${orderNotional.toFixed(2)}). Skipped.`);
        continue;
      }

      const side = isLong ? 'BUY' : 'SELL';
      this.log(
        'EXEC',
        `Signal: ${side} ${symbol} (Conviction ${forecast.conviction}%, Score ${forecast.score}, %B ${forecast.percentB})`,
        { symbol, conviction: forecast.conviction, stopLoss: sl, takeProfit: tp }
      );

      const res = await idempotentBroker.submitOrder({
        symbol, side, type: 'MARKET', amount, stopLoss: sl, takeProfit: tp, source: 'AUTO_CYCLE',
      });

      if (!res.success) {
        this.log('WARN', `Order rejected for ${symbol}: ${res.error}`);
      } else {
        this.config.dailySpent = Number((this.config.dailySpent + res.order.amount * (res.order.fillPrice ?? currentPrice)).toFixed(2));
        this.updateConfig({});
        this.log('INFO', `Order executed: ${symbol} ${isLong ? 'Long' : 'Short'} filled @ $${res.order.fillPrice} (ID ${res.order.clientOrderId})`);
      }
    }
  }

  private notifyStatus() {
    const s = {
      enabled: this.config.enabled,
      cycleCount: this.cycleCount,
      lastRunTime: this.lastRunTime,
    };
    this.statusListeners.forEach((fn) => fn(s));
  }
}

export const autoCycleDaemon = new AutoCycleDaemon();
