# 4-week Binance Testnet run

Goal: find out, with fake money, whether this bot makes money **after fees** before you risk real money.
Testnet is not the real market (thinner liquidity, easier fills), so a pass here is necessary, not sufficient.

## Day 0: setup (about 20 minutes)

### 1. Get testnet keys
1. Go to https://testnet.binance.vision and log in with GitHub.
2. Click **Generate HMAC-SHA-256 Key**. Copy the API key and secret. You get free test USDT and BTC.

### 2. Configure
```
cd orion-trading-bot
cp .env.testnet.example .env
openssl rand -hex 32          # paste the output as ADMIN_TOKEN in .env
```
Edit `.env`: fill `ADMIN_TOKEN`, `BINANCE_API_KEY`, `BINANCE_API_SECRET`. Telegram is optional but recommended (phone alerts).

### 3. Run it (pick ONE way)
**A. Docker (recommended, restarts itself after crashes/reboots)**
```
docker compose up -d --build
docker compose logs -f          # Ctrl+C leaves it running
```
**B. Without Docker** (needs Node 22)
```
npm install && npm run build
npm start                       # keep it alive with pm2:  npm i -g pm2 && pm2 start "npm start" --name orion && pm2 save && pm2 startup
```
Run it on a computer that stays on 24/7 (a small VPS is ideal), not a laptop that sleeps. Do not expose port 3000 to the internet.

### 4. Check it is alive
Open http://localhost:3000, go to the **LIVE TRADING** tab. You should see:
`TESTNET · FAKE MONEY`, "Connected", a USDT balance, and `Entries: Allowed`.
`AUTO_START_OBSERVER=on` starts the bot by itself (BTCUSDT, 1-minute candles). The first trade can take hours; the bot only trades breakouts, at most 50 a day, at least 10 minutes apart.

If the tab shows an error, send it to me. Typical causes: wrong keys, key copied with a space, or Binance blocked in your country (set `BINANCE_BASE_URL`).

## Every day (2 minutes)
- LIVE TRADING tab: still connected? Halted? (A daily-loss halt clears itself at midnight. A losing-streak halt needs you to press **Resume**, but first look at why.)
- `npm run report` (or `docker compose exec orion npm run report`) for the scorecard.
- Telegram alerts should be arriving. Silence for a full day with the bot running = look at the logs.

## Weekly (10 minutes)
1. Run the report and save the output in a note. Track: net P&L, profit factor, max drawdown.
2. Skim `docker compose logs --tail 300` for `ERROR` lines. Rejected orders and "OCO rejected" are important; send them to me.
3. Back up the `data/` folder (it holds your whole trade history).
4. **Do not change settings mid-run.** Changing the strategy resets your evidence. If you must, restart the 4-week clock.

## Things that can happen
- **Binance resets the testnet periodically** (balances and open orders wiped). If the bot shows a position that no longer exists on the exchange, press **Kill switch**, delete `data/live-state-testnet.json`, restart. Note the date in your log.
- **Halts are the safety system working.** Don't just resume repeatedly.
- Your computer reboots: Docker/pm2 restarts the bot and it reconciles with the exchange.

## Day 28: decide
Run `npm run report`. It checks: 28+ days, 200+ trades, net P&L positive after fees, profit factor above 1.3, drawdown contained, most days profitable.

- **Any FAIL → do not use real money.** Send me the report; we improve or replace the strategy and run another cycle.
- **All PASS → still not proof.** If you go live: new real Binance key (Spot trading ON, withdrawals OFF, IP-restricted), `EXECUTION_MODE=live`, `LIVE_TRADING_CONFIRM=I_ACCEPT_REAL_MONEY_RISK`, `LIVE_MAX_TRADE_USD` at 10 or less, and only money you can afford to lose. Run that for another 4+ weeks before increasing anything.
