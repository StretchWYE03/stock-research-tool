"""Backtesting service.

Runs simple rule-based strategies against historical daily bars (Yahoo data) and
reports performance metrics vs a buy-and-hold benchmark. Computations only: no
orders, no personal data, no persistence of user inputs.

Strategies:
- sma_cross : long when fast SMA > slow SMA, flat otherwise.
- rsi       : long when RSI < oversold, exit when RSI > overbought.
- sma_trend : long while price > SMA(window), flat otherwise.
"""

from __future__ import annotations

import pandas as pd

from ..core.cache import cache
from ..scoring import indicators as ta
from .market import get_history

BARS_PER_YEAR = 252

STRATEGIES = {
    "sma_cross": {"label": "SMA Crossover", "params": {"fast": 20, "slow": 50}},
    "rsi": {"label": "RSI Mean Reversion", "params": {"period": 14, "oversold": 30, "overbought": 70}},
    "sma_trend": {"label": "SMA Trend Following", "params": {"window": 200}},
}


def _position_series(close: pd.Series, strategy: str, params: dict) -> pd.Series:
    if strategy == "sma_cross":
        fast = ta.sma(close, int(params.get("fast", 20)))
        slow = ta.sma(close, int(params.get("slow", 50)))
        return (fast > slow).astype(int)
    if strategy == "sma_trend":
        avg = ta.sma(close, int(params.get("window", 200)))
        return (close > avg).astype(int)
    if strategy == "rsi":
        rsi = ta.rsi(close, int(params.get("period", 14)))
        oversold = float(params.get("oversold", 30))
        overbought = float(params.get("overbought", 70))
        pos = []
        holding = 0
        for value in rsi:
            if holding:
                if value >= overbought:
                    holding = 0
            elif value <= oversold:
                holding = 1
            pos.append(holding)
        return pd.Series(pos, index=close.index, dtype=int)
    return pd.Series([0] * len(close), index=close.index, dtype=int)


def _extract_trades(close: pd.Series, position: pd.Series) -> list[dict]:
    """Entry/exit trades from a position series (shifted by one bar to avoid lookahead)."""
    pos = position.shift(1).fillna(0)
    trades = []
    entry_idx = None
    for i in range(len(pos)):
        if pos.iloc[i] == 1 and entry_idx is None:
            entry_idx = i
        elif pos.iloc[i] == 0 and entry_idx is not None:
            entry_px = float(close.iloc[entry_idx])
            exit_px = float(close.iloc[i])
            trades.append(
                {
                    "entry_date": close.index[entry_idx].strftime("%Y-%m-%d"),
                    "exit_date": close.index[i].strftime("%Y-%m-%d"),
                    "entry_price": round(entry_px, 2),
                    "exit_price": round(exit_px, 2),
                    "return_pct": round((exit_px / entry_px - 1) * 100, 2) if entry_px else 0.0,
                }
            )
            entry_idx = None
    return trades


def run_backtest(symbol: str, strategy: str = "sma_cross", params: dict | None = None, period: str = "1y") -> dict:
    params = params or {}
    key = f"backtest:{symbol}:{strategy}:{sorted(params.items())}:{period}"
    cached = cache.get(key)
    if cached is not None:
        return cached

    hist = get_history(symbol, period, "1d")
    bars = hist.get("bars", [])
    if len(bars) < 60:
        return {"symbol": symbol, "error": "Not enough price history to backtest."}

    df = pd.DataFrame(bars)
    close = df["c"]
    close.index = pd.to_datetime(df["t"], unit="ms")

    position = _position_series(close, strategy, params)
    ret = close.pct_change().fillna(0.0)
    strat_ret = position.shift(1).fillna(0) * ret

    equity = (1 + strat_ret).cumprod() * 10000
    bench = (1 + ret).cumprod() * 10000

    strat_dd = ta.max_drawdown(equity)
    bench_dd = ta.max_drawdown(bench)

    trades = _extract_trades(close, position)
    trade_returns = [t["return_pct"] for t in trades]
    wins = [r for r in trade_returns if r > 0]

    metrics = {
        "strategy": {
            "total_return_pct": round((equity.iloc[-1] / 10000 - 1) * 100, 2),
            "cagr_pct": round(ta.annualized_return(equity, BARS_PER_YEAR) * 100, 2),
            "annual_vol_pct": round(ta.annualized_volatility(strat_ret, BARS_PER_YEAR) * 100, 2),
            "sharpe": round(ta.sharpe(strat_ret, BARS_PER_YEAR), 2),
            "max_drawdown_pct": round(strat_dd * 100, 2),
            "num_trades": len(trades),
            "win_rate_pct": round(len(wins) / len(trades) * 100, 2) if trades else 0.0,
            "avg_win_pct": round(sum(wins) / len(wins), 2) if wins else 0.0,
        },
        "benchmark": {
            "total_return_pct": round((bench.iloc[-1] / 10000 - 1) * 100, 2),
            "cagr_pct": round(ta.annualized_return(bench, BARS_PER_YEAR) * 100, 2),
            "annual_vol_pct": round(ta.annualized_volatility(ret, BARS_PER_YEAR) * 100, 2),
            "sharpe": round(ta.sharpe(ret, BARS_PER_YEAR), 2),
            "max_drawdown_pct": round(bench_dd * 100, 2),
        },
    }

    result = {
        "symbol": symbol,
        "strategy": strategy,
        "strategy_label": STRATEGIES.get(strategy, {}).get("label", strategy),
        "params": params,
        "period": period,
        "metrics": metrics,
        "trades": trades,
        "equity_curve": [
            {"t": int(ts.timestamp() * 1000), "strategy": round(float(s), 2), "benchmark": round(float(b), 2)}
            for ts, s, b in zip(equity.index, equity, bench)
        ],
        "drawdown_curve": [
            {"t": int(ts.timestamp() * 1000), "drawdown": round(float((e / equity.cummax().iloc[i] - 1) * 100), 2)}
            for i, (ts, e) in enumerate(zip(equity.index, equity))
        ],
    }
    cache.set(key, result, ttl=600)
    return result
