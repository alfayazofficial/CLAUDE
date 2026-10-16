export interface TradeAlertData {
  symbol: string;
  side: 'BUY' | 'SELL' | string;
  strategy: string;
  regime?: string;
  ratioLabel: string;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskAmount: string;
  targetProfit: string;
  clientOrderId: string;
}

export interface CloseAlertData {
  symbol: string;
  side: string;
  exitPrice: number;
  exitReason: string;
  netPnl: number;
  newBalance: number;
  clientOrderId: string;
}

// Telegram HTML mode: user/webhook-supplied text MUST be escaped or the whole message is rejected.
const esc = (v: unknown) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const money = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });

async function send(chatId: string, token: string, text: string): Promise<{ success: boolean; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
      signal: controller.signal,
    });
    const data: any = await res.json().catch(() => ({}));
    if (!data.ok) {
      console.error('[Telegram Error]', data.description || res.status);
      return { success: false, error: data.description || `HTTP ${res.status}` };
    }
    return { success: true };
  } catch (err: any) {
    // Do not log `err` wholesale: fetch errors can embed the bot-token URL.
    console.error('[Telegram Network Error]', err?.name === 'AbortError' ? 'timeout' : err?.message?.replace(token, '***'));
    return { success: false, error: err?.name === 'AbortError' ? 'Telegram request timed out' : 'Network error' };
  } finally {
    clearTimeout(timer);
  }
}

function resolveToken(botToken?: string): string {
  return botToken || (typeof process !== 'undefined' ? process.env?.TELEGRAM_BOT_TOKEN : '') || '';
}

export async function sendTradeExecutionAlert(chatId: string, alert: TradeAlertData, botToken?: string) {
  const token = resolveToken(botToken);
  if (!token || !chatId) return { success: false, error: 'MISSING_CREDENTIALS' };

  const emoji = alert.side.toUpperCase() === 'BUY' ? '🟢' : '🔴';
  const message = [
    `${emoji} <b>ORION OBSERVER: ${esc(alert.side.toUpperCase())} OPENED (PAPER)</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `<b>Symbol:</b> <code>${esc(alert.symbol)}</code>`,
    `<b>Strategy:</b> ${esc(alert.strategy)} (${esc(alert.ratioLabel)})`,
    `<b>Entry:</b> $${money(alert.entryPrice)}`,
    `<b>Take Profit:</b> $${money(alert.takeProfit)} (+${esc(alert.targetProfit)})`,
    `<b>Stop Loss:</b> $${money(alert.stopLoss)} (-${esc(alert.riskAmount)})`,
    `<b>Order ID:</b> <code>${esc(alert.clientOrderId)}</code>`,
    `<b>Time:</b> ${new Date().toUTCString()}`,
    `<i>Paper trade, no real funds</i>`,
  ].join('\n');
  return send(chatId, token, message);
}

export async function sendTradeCloseAlert(chatId: string, alert: CloseAlertData, botToken?: string) {
  const token = resolveToken(botToken);
  if (!token || !chatId) return { success: false, error: 'MISSING_CREDENTIALS' };

  const isWin = alert.netPnl >= 0;
  const message = [
    `${isWin ? '🎯' : '🛑'} <b>ORION OBSERVER: POSITION CLOSED (PAPER)</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `<b>Symbol:</b> <code>${esc(alert.symbol)}</code> (${esc(alert.side)})`,
    `<b>Exit Reason:</b> ${esc(alert.exitReason)}`,
    `<b>Exit Price:</b> $${money(alert.exitPrice)}`,
    // Telegram HTML does not support style attributes; the old <b style=...> made the whole message fail.
    `<b>Net PnL:</b> ${isWin ? '+' : ''}$${alert.netPnl.toFixed(4)}`,
    `<b>Paper Balance:</b> $${alert.newBalance.toFixed(2)}`,
    `<b>Order ID:</b> <code>${esc(alert.clientOrderId)}</code>`,
  ].join('\n');
  return send(chatId, token, message);
}
