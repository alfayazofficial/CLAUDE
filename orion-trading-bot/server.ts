import 'dotenv/config'; // must be first: loads .env BEFORE the modules below read process.env
import express, { NextFunction, Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { Execution, MODE } from './src/lib/execution';
import { globalTradingViewObserver } from './src/lib/tradingview-live-engine';
import { PaperBroker } from './src/lib/broker-store';
import { sendTradeExecutionAlert, sendTradeCloseAlert } from './src/lib/telegram-notifier';
import { normalizeSymbol, parseRatio } from './src/types/paper';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '127.0.0.1'; // loopback by default; set HOST=0.0.0.0 only when deploying
const IS_PROD = process.env.NODE_ENV === 'production' || process.argv.includes('--prod');
const ADMIN_TOKEN = (process.env.ADMIN_TOKEN || '').trim();
const WEBHOOK_SECRET = (process.env.TRADINGVIEW_WEBHOOK_SECRET || '').trim();

app.disable('x-powered-by');
app.use(express.json({ limit: '50kb' }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const sha = (s: string) => crypto.createHash('sha256').update(s).digest();
const safeEqual = (a: string, b: string) => crypto.timingSafeEqual(sha(a), sha(b)); // equal-length digests: no length leak

const isLoopback = (req: Request) => {
  const ip = req.socket.remoteAddress || '';
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
};

/** Protects every route that changes state or starts/stops trading. */
function authorized(req: Request): boolean {
  if (ADMIN_TOKEN) {
    const supplied = String(req.header('x-admin-token') || '');
    return !!supplied && safeEqual(supplied, ADMIN_TOKEN);
  }
  // No token configured: only a direct local connection is allowed (a proxy sets x-forwarded-for).
  return isLoopback(req) && !req.header('x-forwarded-for');
}

function requireControl(req: Request, res: Response, next: NextFunction) {
  if (authorized(req)) return next();
  return res.status(ADMIN_TOKEN ? 401 : 403).json({ error: ADMIN_TOKEN ? 'Unauthorized: missing or wrong x-admin-token' : 'Forbidden: set ADMIN_TOKEN to use control routes remotely' });
}

const num = (v: unknown): number => (typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/[^\d.\-eE+]/g, '')));
const SYMBOL_RE = /^[A-Za-z0-9:\/._\-]{2,30}$/;
const RATIO_RE = /^\d+(\.\d+)?:\d+(\.\d+)?$/;
const TIMEFRAMES = new Set(['1', '3', '5', '15', '30', '60', '120', '240']);

const alertOpen = (symbol: string, side: string, ratio: string, tradeCapital: number, price: number, pos: { stopLoss: number; takeProfit: number; id: string }, strategy: string) => {
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!chat) return;
  const { riskMul, rewardMul } = parseRatio(ratio);
  void sendTradeExecutionAlert(
    chat,
    {
      symbol, side, strategy, regime: 'Dynamic', ratioLabel: ratio, entryPrice: price,
      stopLoss: pos.stopLoss, takeProfit: pos.takeProfit,
      riskAmount: `$${(tradeCapital * 0.01).toFixed(2)}`,
      targetProfit: `$${(tradeCapital * 0.01 * (rewardMul / riskMul)).toFixed(2)}`,
      clientOrderId: pos.id,
    },
    process.env.TELEGRAM_BOT_TOKEN
  );
};

const alertClose = (c: Awaited<ReturnType<typeof Execution.manualClose>>) => {
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!chat || !c) return;
  void sendTradeCloseAlert(
    chat,
    { symbol: c.symbol, side: c.side, exitPrice: c.exitPrice, exitReason: c.exitReason, netPnl: c.netPnl, newBalance: c.newBalance, clientOrderId: c.id },
    process.env.TELEGRAM_BOT_TOKEN
  );
};

// ---------------------------------------------------------------------------
// 1. TradingView webhook (authenticated by shared secret, no hardcoded fallback)
// ---------------------------------------------------------------------------
const handleTradingViewWebhook = async (req: Request, res: Response) => {
  try {
    if (!WEBHOOK_SECRET) {
      return res.status(503).json({ error: 'Webhook disabled: set TRADINGVIEW_WEBHOOK_SECRET in .env' });
    }
    const payload = req.body || {};
    const received = String(payload.secret || payload.secretToken || '').trim();
    if (!received || !safeEqual(received, WEBHOOK_SECRET)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const symbol = String(payload.ticker || payload.symbol || '');
    const action = String(payload.action || '').toUpperCase();
    const price = num(payload.price);
    const ratio = RATIO_RE.test(String(payload.ratio || '')) ? String(payload.ratio) : '1:2';
    const tradeCapital = payload.tradeCapital === undefined ? 2.0 : num(payload.tradeCapital);

    if (action === 'CLOSE') {
      const state = await Execution.getState();
      if (!state.activePosition) return res.json({ ok: true, success: true, closed: null, message: 'No open position' });
      if (!Execution.isLive && (!Number.isFinite(price) || price <= 0)) return res.status(400).json({ ok: false, error: 'price is required for CLOSE' });
      const closed = await Execution.manualClose(price);
      alertClose(closed);
      return res.json({ ok: true, success: true, closed });
    }

    if (action === 'BUY' || action === 'SELL') {
      if (!SYMBOL_RE.test(symbol)) return res.status(400).json({ ok: false, error: 'valid ticker/symbol is required' });
      if (!Execution.isLive && (!Number.isFinite(price) || price <= 0)) return res.status(400).json({ ok: false, error: 'valid price > 0 is required' });
      if (!Number.isFinite(tradeCapital) || tradeCapital <= 0) return res.status(400).json({ ok: false, error: 'invalid tradeCapital' });

      const result = await Execution.open({ symbol, side: action, price, tradeCapital, ratio });
      if (!result.success || !result.position) return res.json({ ok: false, success: false, reason: result.reason });
      alertOpen(symbol, action, ratio, tradeCapital, price, result.position, 'TradingView Webhook Alert');
      return res.json({ ok: true, success: true, position: result.position });
    }

    return res.json({ ok: true, status: 'IGNORED', message: 'Action not recognized' });
  } catch (err: any) {
    console.error('[Webhook Error]', err);
    return res.status(500).json({ error: 'Internal error' }); // do not leak internals
  }
};
app.post('/webhook/tradingview', handleTradingViewWebhook);
app.post('/api/tradingview-webhook', handleTradingViewWebhook);

// ---------------------------------------------------------------------------
// 2. Observer control
// ---------------------------------------------------------------------------
app.post('/api/run', requireControl, async (req: Request, res: Response) => {
  const { action } = req.body || {};

  if (action === 'START') {
    const symbol = req.body.symbol ?? 'BINANCE:BTCUSDT';
    const ratio = req.body.ratio ?? '1:2';
    const tradeCapital = num(req.body.tradeCapital ?? 2.0);
    const timeframe = String(req.body.timeframe ?? '1');
    if (!SYMBOL_RE.test(String(symbol))) return res.status(400).json({ status: 'ERROR', message: 'Invalid symbol' });
    if (!RATIO_RE.test(String(ratio))) return res.status(400).json({ status: 'ERROR', message: 'Ratio must look like 1:2' });
    if (!Number.isFinite(tradeCapital) || tradeCapital <= 0 || tradeCapital > 1_000_000) return res.status(400).json({ status: 'ERROR', message: 'Invalid tradeCapital' });
    if (!TIMEFRAMES.has(timeframe)) return res.status(400).json({ status: 'ERROR', message: 'Invalid timeframe' });

    const open = (await Execution.getState()).activePosition;
    if (open && normalizeSymbol(open.symbol) !== normalizeSymbol(String(symbol))) {
      return res.status(409).json({ status: 'ERROR', message: `Close the open ${open.symbol} position before switching symbol.` });
    }

    globalTradingViewObserver.updateConfig({
      symbol: String(symbol), ratio: String(ratio), tradeCapital, timeframe,
      telegramChatId: process.env.TELEGRAM_CHAT_ID, telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    });
    await globalTradingViewObserver.start();
    return res.json({ status: 'RUNNING', message: 'Observer active.' });
  }

  if (action === 'STOP') {
    globalTradingViewObserver.stop();
    return res.json({ status: 'STOPPED', message: 'Observer paused.' });
  }

  return res.status(400).json({ status: 'UNKNOWN_ACTION', message: 'Use action: START or STOP' });
});

app.get('/api/run/status', async (_req: Request, res: Response) => {
  const o = globalTradingViewObserver;
  res.json({
    mode: MODE,
    isRunning: o.isRunning, symbol: o.symbol, ratio: o.ratio, tradeCapital: o.tradeCapital,
    timeframe: o.timeframe, lastPrice: o.lastPrice, logs: o.getLogs().slice(0, 100), plan: await o.getPlanStatus(),
  });
});

// ---------------------------------------------------------------------------
// 3. Paper broker
// ---------------------------------------------------------------------------
app.get('/api/broker-state', async (req: Request, res: Response) => {
  // Real balances are private; the paper ledger stays readable as before.
  if (Execution.isLive && !authorized(req)) return res.status(401).json({ error: 'Unauthorized' });
  res.json(await Execution.getState());
});

app.post('/api/broker/reset', requireControl, (_req: Request, res: Response) => {
  if (Execution.isLive) return res.status(400).json({ success: false, reason: 'Reset only applies to the paper ledger.' });
  res.json({ success: true, state: PaperBroker.reset() });
});

app.post('/api/broker/open', requireControl, async (req: Request, res: Response) => {
  const { symbol, side, ratio } = req.body || {};
  const price = num(req.body?.price);
  const tradeCapital = req.body?.tradeCapital === undefined ? 2.0 : num(req.body.tradeCapital);
  if (!SYMBOL_RE.test(String(symbol || ''))) return res.status(400).json({ success: false, reason: 'INVALID_SYMBOL' });
  const result = await Execution.open({ symbol: String(symbol), side: String(side), price, tradeCapital, ratio: RATIO_RE.test(String(ratio)) ? String(ratio) : '1:2' });
  if (result.success && result.position) alertOpen(String(symbol), String(side).toUpperCase(), result.position.ratio, tradeCapital, price, result.position, 'Manual Paper Entry');
  res.json(result);
});

app.post('/api/broker/close', requireControl, async (req: Request, res: Response) => {
  const price = num(req.body?.price);
  if (!Execution.isLive && (!Number.isFinite(price) || price <= 0)) return res.status(400).json({ success: false, reason: 'INVALID_PRICE' });
  const closed = await Execution.manualClose(price);
  alertClose(closed);
  res.json({ success: !!closed, closed });
});

// ---------------------------------------------------------------------------
// 3b. Live trading controls (testnet / live). All require the control token or a local connection.
// ---------------------------------------------------------------------------
app.get('/api/live/status', requireControl, async (_req: Request, res: Response) => {
  const ex = Execution.executor;
  const base = { mode: MODE, configError: Execution.configError, ready: MODE === 'paper' || !!ex };
  if (!ex) return res.json(base);
  try {
    const [acct, state] = await Promise.all([ex.check(), ex.getState()]);
    res.json({ ...base, env: state.env, connected: true, canTrade: acct.canTrade, usdtFree: acct.usdtFree, usdtLocked: acct.usdtLocked,
      halted: state.halted, todayPnl: state.todayPnl, limits: ex.cfg, activePosition: state.activePosition });
  } catch (e: any) {
    res.json({ ...base, connected: false, error: String(e?.message || e) });
  }
});

app.post('/api/live/halt', requireControl, (_req: Request, res: Response) => {
  if (!Execution.executor) return res.status(400).json({ ok: false, error: 'Live execution is not configured' });
  Execution.executor.haltManual('Halted by operator');
  res.json({ ok: true, halted: Execution.executor.isHalted() });
});

app.post('/api/live/resume', requireControl, (_req: Request, res: Response) => {
  if (!Execution.executor) return res.status(400).json({ ok: false, error: 'Live execution is not configured' });
  Execution.executor.resume();
  res.json({ ok: true, halted: Execution.executor.isHalted() });
});

/** Kill switch: stop the observer, halt new entries, cancel the OCO and sell the open position at market. */
app.post('/api/live/kill', requireControl, async (_req: Request, res: Response) => {
  if (!Execution.executor) return res.status(400).json({ ok: false, error: 'Live execution is not configured' });
  globalTradingViewObserver.stop();
  try {
    const closed = await Execution.executor.flatten(true);
    alertClose(closed);
    res.json({ ok: true, closed, halted: Execution.executor.isHalted() });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: `Halted, but flatten failed: ${e?.message || e}. Close the position on Binance manually.` });
  }
});

// ---------------------------------------------------------------------------
// 4. Telegram test
// ---------------------------------------------------------------------------
app.post('/api/telegram/test', requireControl, async (req: Request, res: Response) => {
  const { chatId, botToken } = req.body || {};
  const targetChatId = String(chatId || process.env.TELEGRAM_CHAT_ID || '');
  const targetToken = String(botToken || process.env.TELEGRAM_BOT_TOKEN || '');
  if (!targetChatId || !targetToken) {
    return res.status(400).json({ success: false, error: 'Provide both Telegram Bot Token and Chat ID.' });
  }
  const result = await sendTradeExecutionAlert(
    targetChatId,
    {
      symbol: 'BINANCE:BTCUSDT', side: 'BUY', strategy: 'Test Ping', ratioLabel: '1:2',
      entryPrice: 68450.0, stopLoss: 67765.5, takeProfit: 69819.0,
      riskAmount: '$0.02', targetProfit: '$0.04', clientOrderId: `TEST-${Date.now()}`,
    },
    targetToken
  );
  res.json(result);
});

// ---------------------------------------------------------------------------
// 5. TradingView scanner proxy (the Vite dev proxy does not exist in production)
// ---------------------------------------------------------------------------
app.post('/api/tv-scanner/:market/scan', async (req: Request, res: Response) => {
  if (!/^[a-z]+$/.test(req.params.market)) return res.status(400).json({ error: 'bad market' });
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 8000);
  try {
    const r = await fetch(`https://scanner.tradingview.com/${req.params.market}/scan`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req.body || {}), signal: controller.signal,
    });
    res.status(r.status).type('application/json').send(await r.text());
  } catch {
    res.status(502).json({ error: 'Scanner unavailable' });
  } finally {
    clearTimeout(t);
  }
});

// ---------------------------------------------------------------------------
// 6. Vite (dev) or static files (prod)
// ---------------------------------------------------------------------------
async function startServer() {
  if (!IS_PROD) {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));
  }

  // AUTO_START_OBSERVER=on resumes the observer after a crash/reboot (use with a process manager or Windows startup task).
  if ((process.env.AUTO_START_OBSERVER || '').toLowerCase() === 'on') {
    globalTradingViewObserver.updateConfig({ telegramChatId: process.env.TELEGRAM_CHAT_ID, telegramBotToken: process.env.TELEGRAM_BOT_TOKEN });
    void globalTradingViewObserver.start();
  }

  // Live/testnet: reconcile with the exchange even when the observer is stopped (exits happen there, bookkeeping happens here).
  if (Execution.executor) {
    setInterval(() => {
      void Execution.monitor(0, true).then((closed) => closed && globalTradingViewObserver.reportClose(closed)).catch(() => undefined);
    }, 5000);
  }

  app.listen(PORT, HOST, () => {
    console.log(`[Orion] ${IS_PROD ? 'production' : 'development'} on http://${HOST}:${PORT} | execution mode: ${MODE.toUpperCase()}${MODE === 'live' && Execution.executor ? ' (REAL MONEY)' : ''}`);
    if (!WEBHOOK_SECRET) console.warn('[Orion] TRADINGVIEW_WEBHOOK_SECRET not set: webhook endpoint is disabled.');
    if (HOST !== '127.0.0.1' && !ADMIN_TOKEN) console.warn('[Orion] WARNING: listening on a public interface without ADMIN_TOKEN; control routes are locked to local connections only.');
  });
}

startServer();
