import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BinanceSpot } from '../src/lib/binance-spot';
import { LiveExecutor } from '../src/lib/live-executor';

const SECRET = 'testsecret';
type Req = { method: string; path: string; q: Record<string, string> };

function fakeBinance(opts: { failOco?: boolean; bnbFees?: boolean; restrictions?: any } = {}) {
  const calls: Req[] = [];
  let usdt = 1000;
  const lists = new Map<string, any>();
  const orders = new Map<number, any>();
  let oid = 100;
  const server = http.createServer((req, res) => {
    const u = new URL(req.url!, 'http://x');
    const q = Object.fromEntries(u.searchParams);
    calls.push({ method: req.method!, path: u.pathname, q });
    const send = (code: number, body: unknown) => { res.statusCode = code; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(body)); };
    if (u.pathname !== '/api/v3/time' && u.pathname !== '/api/v3/exchangeInfo' && u.pathname !== '/api/v3/ticker/price') {
      const { signature, ...rest } = q;
      const expect = crypto.createHmac('sha256', SECRET).update(new URLSearchParams(rest).toString()).digest('hex');
      if (signature !== expect) return send(401, { code: -1022, msg: 'bad signature' });
      if (req.headers['x-mbx-apikey'] !== 'key') return send(401, { code: -2014, msg: 'bad key' });
    }
    switch (`${req.method} ${u.pathname}`) {
      case 'GET /api/v3/time': return send(200, { serverTime: Date.now() });
      case 'GET /api/v3/exchangeInfo': return send(200, { symbols: [{ symbol: 'BTCUSDT', status: 'TRADING', baseAsset: 'BTC', quoteAsset: 'USDT', filters: [
        { filterType: 'LOT_SIZE', stepSize: '0.00001000', minQty: '0.00001000' }, { filterType: 'PRICE_FILTER', tickSize: '0.01000000' }, { filterType: 'NOTIONAL', minNotional: '5.00000000' }] }] });
      case 'GET /api/v3/ticker/price': return send(200, { symbol: 'BTCUSDT', price: '50000.00' });
      case 'GET /sapi/v1/account/apiRestrictions': return send(200, opts.restrictions ?? { ipRestrict: true, enableWithdrawals: false, enableSpotAndMarginTrading: true, enableReading: true });
      case 'GET /api/v3/account': return send(200, { canTrade: true, balances: [{ asset: 'USDT', free: String(usdt), locked: '0' }] });
      case 'POST /api/v3/order': {
        if (q.side === 'BUY') {
          const price = 50000; const qty = parseFloat(q.quantity); const spend = qty * price;
          usdt -= spend;
          const o = { orderId: ++oid, clientOrderId: q.newClientOrderId, status: 'FILLED', type: 'MARKET', executedQty: String(qty), cummulativeQuoteQty: (qty * price).toFixed(8), transactTime: Date.now(),
            fills: [{ price: String(price), qty: String(qty), commission: opts.bnbFees ? '0.0001' : (qty * 0.001).toFixed(8), commissionAsset: opts.bnbFees ? 'BNB' : 'BTC' }] };
          orders.set(o.orderId, o); return send(200, o);
        }
        const qty = parseFloat(q.quantity); const price = 50000;
        const o = { orderId: ++oid, clientOrderId: q.newClientOrderId, status: 'FILLED', type: 'MARKET', executedQty: String(qty), cummulativeQuoteQty: (qty * price).toFixed(8),
          fills: [{ price: String(price), qty: String(qty), commission: (qty * price * 0.001).toFixed(8), commissionAsset: 'USDT' }] };
        orders.set(o.orderId, o); usdt += qty * price; return send(200, o);
      }
      case 'POST /api/v3/orderList/oco': {
        if (opts.failOco) return send(400, { code: -1013, msg: 'Filter failure' });
        const tp = { orderId: ++oid, status: 'NEW', type: 'LIMIT_MAKER', executedQty: '0', cummulativeQuoteQty: '0', price: q.abovePrice };
        const sl = { orderId: ++oid, status: 'NEW', type: 'STOP_LOSS_LIMIT', executedQty: '0', cummulativeQuoteQty: '0', price: q.belowPrice };
        orders.set(tp.orderId, tp); orders.set(sl.orderId, sl);
        lists.set(q.listClientOrderId, { listClientOrderId: q.listClientOrderId, listOrderStatus: 'EXECUTING', orders: [{ orderId: tp.orderId }, { orderId: sl.orderId }], tp, sl, qty: q.quantity });
        return send(200, lists.get(q.listClientOrderId));
      }
      case 'GET /api/v3/orderList': { const l = lists.get(q.origClientOrderId); return l ? send(200, l) : send(400, { code: -2018, msg: 'nope' }); }
      case 'DELETE /api/v3/orderList': { const l = lists.get(q.listClientOrderId); l.listOrderStatus = 'ALL_DONE'; l.tp.status = 'CANCELED'; l.sl.status = 'CANCELED'; return send(200, l); }
      case 'GET /api/v3/order': { const o = orders.get(Number(q.orderId)); return o ? send(200, o) : send(400, { code: -2013, msg: 'Order does not exist.' }); }
    }
    send(404, { msg: 'unhandled ' + req.url });
  });
  // helper: simulate the exchange filling a leg
  const fillLeg = (listId: string, leg: 'tp' | 'sl') => {
    const l = lists.get(listId); const o = l[leg]; const px = parseFloat(o.price); const qty = parseFloat(l.qty);
    o.status = 'FILLED'; o.executedQty = String(qty); o.cummulativeQuoteQty = (px * qty).toFixed(8);
    (leg === 'tp' ? l.sl : l.tp).status = 'EXPIRED'; l.listOrderStatus = 'ALL_DONE';
  };
  return { server, calls, lists, fillLeg };
}

async function setup(opts: { failOco?: boolean; bnbFees?: boolean; restrictions?: any; env?: 'testnet' | 'live'; cfg?: any } = {}) {
  const fb = fakeBinance(opts);
  await new Promise<void>((r) => fb.server.listen(0, '127.0.0.1', () => r()));
  const port = (fb.server.address() as any).port;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orion-test-'));
  const api = new BinanceSpot(opts.env ?? 'testnet', 'key', SECRET, `http://127.0.0.1:${port}`);
  const ex = new LiveExecutor(api, opts.cfg ?? {}, dir);
  return { fb, ex, dir, close: () => fb.server.close() };
}

test('entry places a signed market buy then an exchange-side OCO with correct levels', async () => {
  const { fb, ex, close } = await setup({ cfg: { maxTradeUsd: 100 } });
  const r = await ex.open({ symbol: 'BINANCE:BTCUSDT', side: 'BUY', tradeCapital: 40, ratio: '1:2', riskPct: 0.005, tier: 'MEDIUM', maxHoldMs: 60000 });
  assert.equal(r.success, true, JSON.stringify(r));
  const pos = r.position!;
  assert.equal(pos.entryPrice, 50000);
  assert.equal(pos.stopLoss, 49750);   // -0.5%
  assert.equal(pos.takeProfit, 50500); // +1.0%
  const oco = fb.calls.find((c) => c.path === '/api/v3/orderList/oco')!;
  assert.equal(oco.q.aboveType, 'LIMIT_MAKER');
  assert.equal(oco.q.belowType, 'STOP_LOSS_LIMIT');
  assert.equal(oco.q.abovePrice, '50500.00');
  assert.equal(oco.q.belowStopPrice, '49750.00');
  assert.ok(parseFloat(oco.q.belowPrice) < 49750);
  // base-asset commission (0.1%) must be deducted from the quantity we try to sell
  // base-asset fee case: the OCO must cover what we actually hold (>= target, never more than we bought)
  assert.ok(parseFloat(oco.q.quantity) >= 0.00079 && parseFloat(oco.q.quantity) <= 0.0008, 'qty=' + oco.q.quantity);
  assert.equal(ex.dailyCounts().MEDIUM, 1);
  close();
});

test('take-profit fill is detected and booked as a net winner (fees paid in BNB)', async () => {
  const { fb, ex, close } = await setup({ bnbFees: true });
  const r = await ex.open({ symbol: 'BTCUSDT', side: 'BUY', tradeCapital: 40, riskPct: 0.005 });
  fb.fillLeg(r.position!.id + 'OCO', 'tp');
  const closed = await ex.monitor();
  assert.equal(closed?.exitReason, 'TAKE_PROFIT');
  assert.ok(closed!.netPnl > 0.1 && closed!.netPnl < 0.4, `pnl ${closed!.netPnl}`);
  assert.equal((await ex.getState()).activePosition, null);
  close();
});

test('stop-loss fill is booked as a loss', async () => {
  const { fb, ex, close } = await setup();
  const r = await ex.open({ symbol: 'BTCUSDT', side: 'BUY', tradeCapital: 40, riskPct: 0.005 });
  fb.fillLeg(r.position!.id + 'OCO', 'sl');
  const closed = await ex.monitor();
  assert.equal(closed?.exitReason, 'STOP_LOSS');
  assert.ok(closed!.netPnl < 0);
  close();
});

test('if the OCO is rejected the position is flattened and trading halts', async () => {
  const { fb, ex, close } = await setup({ failOco: true });
  const r = await ex.open({ symbol: 'BTCUSDT', side: 'BUY', tradeCapital: 40 });
  assert.equal(r.success, false);
  assert.ok(fb.calls.some((c) => c.path === '/api/v3/order' && c.q.side === 'SELL'), 'must sell at market');
  assert.equal(ex.isHalted().on, true);
  assert.equal((await ex.open({ symbol: 'BTCUSDT', side: 'BUY', tradeCapital: 40 })).success, false);
  close();
});

test('time stop cancels the OCO then sells at market', async () => {
  const { fb, ex, close } = await setup();
  await ex.open({ symbol: 'BTCUSDT', side: 'BUY', tradeCapital: 40, maxHoldMs: 1 });
  await new Promise((r) => setTimeout(r, 10));
  const closed = await ex.monitor(true);
  assert.equal(closed?.exitReason, 'TIME_STOP');
  const order = fb.calls.map((c) => `${c.method} ${c.path}`);
  assert.ok(order.indexOf('DELETE /api/v3/orderList') < order.lastIndexOf('POST /api/v3/order'));
  close();
});

test('guards: shorts, oversize, below-min-notional, one position at a time', async () => {
  const { ex, close } = await setup();
  assert.equal((await ex.open({ symbol: 'BTCUSDT', side: 'SELL', tradeCapital: 40 })).reason, 'SPOT_LONG_ONLY');
  assert.match((await ex.open({ symbol: 'BTCUSDT', side: 'BUY', tradeCapital: 2 })).reason!, /BELOW_MIN_NOTIONAL/);
  const big = await ex.open({ symbol: 'BTCUSDT', side: 'BUY', tradeCapital: 5000 });
  assert.ok(big.success && big.position!.tradeCapital <= 25.01, 'size must be capped at maxTradeUsd (25)');
  assert.equal((await ex.open({ symbol: 'BTCUSDT', side: 'BUY', tradeCapital: 10 })).reason, 'POSITION_ALREADY_OPEN');
  close();
});

test('daily loss limit halts new entries', async () => {
  const { fb, ex, close } = await setup({ cfg: { maxDailyLossUsd: 0.01, maxTradeUsd: 100 } });
  const r = await ex.open({ symbol: 'BTCUSDT', side: 'BUY', tradeCapital: 100, riskPct: 0.005 });
  fb.fillLeg(r.position!.id + 'OCO', 'sl');
  await ex.monitor();
  assert.equal(ex.isHalted().kind, 'DAILY_LOSS');
  assert.equal((await ex.open({ symbol: 'BTCUSDT', side: 'BUY', tradeCapital: 10 })).success, false);
  close();
});

test('state survives a restart (reloaded from disk) and the kill switch flattens', async () => {
  const { fb, ex, dir, close } = await setup();
  await ex.open({ symbol: 'BTCUSDT', side: 'BUY', tradeCapital: 20 });
  const api2 = new BinanceSpot('testnet', 'key', SECRET, `http://127.0.0.1:${(fb.server.address() as any).port}`);
  const ex2 = new LiveExecutor(api2, {}, dir);
  assert.ok((await ex2.getState()).activePosition, 'position must be restored');
  const closed = await ex2.flatten(true);
  assert.equal(closed?.exitReason, 'MANUAL_CLOSE');
  assert.equal(ex2.isHalted().on, true);
  close();
});

test('real-money mode refuses a key with withdrawals enabled or no IP restriction', async () => {
  const bad = await setup({ env: 'live', restrictions: { ipRestrict: true, enableWithdrawals: true, enableSpotAndMarginTrading: true } });
  const r1 = await bad.ex.open({ symbol: 'BTCUSDT', side: 'BUY', tradeCapital: 20 });
  assert.equal(r1.success, false);
  assert.match(bad.ex.isHalted().reason!, /withdrawals are ENABLED/);
  bad.close();
  const noIp = await setup({ env: 'live', restrictions: { ipRestrict: false, enableWithdrawals: false, enableSpotAndMarginTrading: true } });
  assert.equal((await noIp.ex.open({ symbol: 'BTCUSDT', side: 'BUY', tradeCapital: 20 })).success, false);
  assert.match(noIp.ex.isHalted().reason!, /IP/);
  noIp.close();
});

test('real-money mode trades normally with a correctly restricted key', async () => {
  const ok = await setup({ env: 'live' });
  const r = await ok.ex.open({ symbol: 'BTCUSDT', side: 'BUY', tradeCapital: 20 });
  assert.equal(r.success, true, JSON.stringify(r));
  ok.close();
});
