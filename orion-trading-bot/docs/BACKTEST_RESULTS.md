# Backtest results: strategy "trend" (15m trend breakout)

Run: https://github.com/alfayazofficial/orion-trading-bot/actions/runs/38977901995 (private repo; workflow "Backtest", 2026-10-16)
Data: real Binance 15m candles, 3 years (2023-10-17 to 2026-10-16). Costs: 0.1% fee and 0.02% slippage per side. Defaults unchanged.

| | BTCUSDT | ETHUSDT |
|---|---|---|
| Net return (0.5% risk per trade) | -9.93% | -19.76% |
| Profit factor | 0.43 | 0.45 |
| Trades | 35 | 87 |
| Win rate | 25.7% | 26.4% |
| Folds profitable (of 4) | 2 | 0 |
| Nearby parameter sets profitable | 5% | 0% |
| Walk-forward (unseen half) profit factor | 0.25 | 0.54 |
| Buy and hold | +187.7% | +55.2% |

**Verdict: FAILED (10 of 12 checks).** The strategy has no edge after costs on this data. Do not trade it with real money.
Parameters were deliberately NOT tuned afterwards; tuning on the same data would overfit.

## What this does and does not mean
- It rejects this rule set on BTC/ETH over these 3 years. It does not prove no profitable strategy exists.
- The execution layer (orders, stops, limits, kill switch, key checks) is independent of the strategy and remains valid.
- Any new strategy must pass `npm run backtest` (or the GitHub "Backtest" workflow) *before* testnet, and testnet before real money.
