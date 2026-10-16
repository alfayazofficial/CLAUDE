# Ready for real trading: everything that has to be true

Legend: **BUILT** = in this repo and tested. **YOU** = only you can do it. **GATE** = must pass before the next stage.

## A. The algorithm (strategy "trend", `src/lib/strategy-trend.ts`)
Long-only, Binance Spot, 15-minute closed candles, one position at a time. The live bot and the backtester run the *same* code.

1. **Trend filter (1h, completed hours only):** close > EMA200 and EMA50 > EMA200. No trend, no trade.
2. **Strength filter:** ADX(14) >= 22. Sideways markets are skipped.
3. **Trigger:** the candle closes above the highest high of the previous 20 candles, on volume >= 1.3x the 20-bar average, with a body >= 50% of its range, and not stretched more than 2 ATR above EMA20 (no chasing).
4. **Cost gate:** the target must be at least 4x the round-trip cost (0.2% fees + 0.04% slippage). Small moves that fees would eat are skipped.
5. **Exits:** stop = entry - 1.5 ATR, target = entry + 3 ATR (reward:risk 2:1), both placed on Binance as an OCO order at entry. Time stop after 12 hours (48 candles).
6. **Sizing:** risk 0.5% of equity per trade (`size = equity x 0.005 / stop distance`), hard-capped by `LIVE_MAX_TRADE_USD`.
7. **Limits:** max 6 trades a day, 1 hour cooldown after each trade, daily loss limit, halt after N losing trades in a row, kill switch.

Expect **few trades** (roughly a handful per week per coin), a **win rate near 35-45%**, and **long losing streaks**. That is normal for trend following. Nobody can promise it earns money; section C is how you find out.

## B. Engineering (what the software must do)
| Item | Status |
|---|---|
| Real exchange orders (market buy + exchange-side OCO stop/target) | **BUILT** |
| Order sizing to exchange filters (lot step, tick size, min notional) | **BUILT** |
| Crash safety: intent saved before order, recovery on restart, OCO-failure flatten | **BUILT** |
| Risk limits: per-trade cap, daily loss, losing streak, kill switch | **BUILT** |
| API key safety: live mode refuses keys with withdrawals enabled or without IP whitelist | **BUILT** |
| Same strategy code in backtest and live; no lookahead (tested) | **BUILT** |
| Backtest with fees, slippage, stop-first assumption, folds, parameter robustness, walk-forward | **BUILT** (`npm run backtest`) |
| Fake stock/forex symbols removed; only real Binance pairs | **BUILT** |
| Telegram alerts for entries/exits | **BUILT** (needs your bot token) |
| Real-API behaviour of the executor (testnet) | **GATE** (section C, stage 2) |
| Multi-coin portfolio, shorting, futures | not built (see "Not built") |
| Live-vs-backtest drift alarm, daily email/Telegram report | not built |

## C. Validation stages (do them in order, no skipping)
1. **Backtest on real history (free, 10 minutes).** GitHub: repo -> Actions -> **Backtest** -> Run workflow (BTCUSDT,ETHUSDT, 3 years). Read the report artifact. **GATE:** all checks PASS (>=150 trades, PF > 1.3 after costs, profitable in 3 of 4 time folds, >= 60% of nearby parameter sets profitable, unseen-half PF > 1.1, drawdown < 25%). If it fails, **stop**: do not trade this strategy; send me the report and we change the strategy, not the checks.
2. **Testnet, 4 weeks** (`docs/TESTNET_4_WEEKS.md`). **GATE:** `npm run report` passes, no unexplained errors, kill switch tested by hand once.
3. **Live, tiny, 4+ weeks.** `LIVE_MAX_TRADE_USD=10`, money you can fully lose. **GATE:** live results are in line with the backtest (fees/slippage no worse than modelled).
4. **Scale slowly:** at most double the size after each additional clean month.

## D. Things only you can do
- Confirm trading Binance is legal for you in your country, and your tax duties.
- Create the real API key: **Spot trading ON, withdrawals OFF, IP-restricted to your server**. Never paste it into GitHub, chat, or the browser.
- Keep the server patched; bind the dashboard to localhost; set `ADMIN_TOKEN`.
- Use only money you can afford to lose. Do not borrow, do not use rent/food money.
- Check the bot daily for the first month; have a rule for when you turn it off (e.g. -10% from peak).
- Back up `data/` weekly.

## E. Honest limits
- A backtest is an upper bound: the future will differ, fills on a real exchange are worse, and Binance may change fees/rules.
- Edges decay. Re-run the backtest monthly on fresh data; retire the strategy when it stops passing.
- Spot long-only earns nothing in a falling market; the bot will simply sit out.
- At small size, fixed exchange minimums and rounding take a bigger share. $10 trades are for learning, not income.

## Not built (and why)
- **Shorting / futures / leverage:** leverage is how most retail accounts blow up. Add only after months of clean spot results.
- **ML / "AI" signals:** adds overfitting risk before the basics are proven.
- **Multi-exchange:** one exchange done properly first.
