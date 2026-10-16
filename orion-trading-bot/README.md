# Orion Forecast Trading Engine

Three execution modes, chosen with `EXECUTION_MODE` in `.env`:

| Mode | What happens | Money |
|---|---|---|
| `paper` (default) | Simulated ledger | none |
| `testnet` | Real orders on the Binance Spot Testnet | fake |
| `live` | Real orders on Binance Spot | **real, you can lose it** |

Only **Binance Spot, long-only, USDT pairs** is wired to real orders. The Alpaca / IBKR / MT5 choices in the old
Broker modal are still settings only. Stocks/Gold/EUR-USD data in the dashboard is synthetic demo data and is never traded.

## Going from zero to real trading (do not skip steps)
1. `npm install && cp .env.example .env`, then `npm run dev` and watch **paper** mode for a few days.
2. Make free testnet keys at https://testnet.binance.vision, put them in `.env`, set `EXECUTION_MODE=testnet`. Run for **at least 2-4 weeks**. Compare results with paper.
3. Only if testnet results are consistently net-positive *after fees*: create a real Binance API key (**Spot trading only, no withdrawals, IP-restricted**), set `EXECUTION_MODE=live`, `LIVE_TRADING_CONFIRM=I_ACCEPT_REAL_MONEY_RISK`, keep `LIVE_MAX_TRADE_USD` small, and fund the account with money you can afford to lose.
4. Open the **LIVE TRADING** tab to see connection, balance, P&L, limits, and the **kill switch**. Start the bot from the **24/7 OBSERVER** tab.

## How real orders are protected
* Every entry is a market buy followed immediately by an **exchange-side OCO** (take-profit + stop-loss) on Binance. The stop works even if this program crashes or your internet drops.
* If the OCO cannot be placed, the position is sold at market and trading halts.
* Intent is saved to disk before an order is sent; after a crash the bot reconciles with the exchange on restart.
* Caps: per-trade size, daily loss, losing streak. Any breach halts new entries. The kill switch cancels the OCO, sells, and halts.
* A time-stop closes trades older than `PLAN_MAX_HOLD_MIN`.
* Enable "Pay fees with BNB" on Binance (cheaper fees, and no leftover dust of the coin you buy).

## Read this before risking money
* **No profit is guaranteed, and the built-in breakout strategy has no proven edge.** "50 trades a day" is a trade count, not a profit target.
* Fees are the main enemy: about 0.2% round trip (0.15% with BNB). With the default 0.5% stop / 1% target, fees eat 15-20% of every winner and make every loser bigger. 50 trades/day at that rate is a lot of fee drag.
* Binance Spot cannot short: bearish signals are skipped in testnet/live.
* Binance availability and rules depend on your country. Check that it is legal and permitted for you before using real funds, and check tax rules.
* Tests: `npm test` (executor tested against a fake Binance server). The real Binance API has **not** been exercised from this repo's CI; that is what the testnet phase is for.

## Run
```
npm install
cp .env.example .env      # then fill in TRADINGVIEW_WEBHOOK_SECRET (and ADMIN_TOKEN if deploying)
npm run dev               # development, http://127.0.0.1:3000
npm run build && npm start   # production
```

## What is real and what is not
| Part | Data |
|---|---|
| Crypto (BTC, ETH, SOL, XRP, DOGE, BNB, ADA, AVAX, LINK, SUI, NEAR, PEPE) | Real Binance public candles (15m), refreshed every 5 s |
| Stocks, ETFs, Gold, EUR/USD | **Synthetic random walk (demo only).** Not tradable by the auto-cycle |
| 24/7 Observer + TradingView webhook | Server-side, real Binance prices, one shared paper ledger in `data/paper-ledger.json` |
| Backtests | Real Binance candles when available; otherwise a clearly-labelled synthetic warning |

## Security
* Binance keys are read from the server environment only. Never put them in client code or commit `.env`.
* Control routes (`/api/run`, `/api/broker/*`, `/api/telegram/test`) work only from the local machine, or with `x-admin-token` = `ADMIN_TOKEN`.
* The webhook is disabled until `TRADINGVIEW_WEBHOOK_SECRET` is set. Never put that secret in client code.
