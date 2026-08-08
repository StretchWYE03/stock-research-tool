"""Technical indicators computed from OHLCV data (pandas)."""

from __future__ import annotations

import numpy as np
import pandas as pd


def sma(series: pd.Series, window: int) -> pd.Series:
    return series.rolling(window=window, min_periods=1).mean()


def ema(series: pd.Series, window: int) -> pd.Series:
    return series.ewm(span=window, adjust=False).mean()


def rsi(series: pd.Series, period: int = 14) -> pd.Series:
    delta = series.diff()
    gain = delta.clip(lower=0.0)
    loss = -delta.clip(upper=0.0)
    avg_gain = gain.ewm(alpha=1 / period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1 / period, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    out = 100 - (100 / (1 + rs))
    return out.fillna(50.0)


def macd(series: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9):
    line = ema(series, fast) - ema(series, slow)
    sig = line.ewm(span=signal, adjust=False).mean()
    hist = line - sig
    return line, sig, hist


def bollinger(series: pd.Series, window: int = 20, num_std: float = 2.0):
    mid = sma(series, window)
    std = series.rolling(window=window, min_periods=1).std()
    return mid + num_std * std, mid, mid - num_std * std


def pct_returns(series: pd.Series, periods: int) -> float | None:
    if len(series) <= periods:
        return None
    prev = series.iloc[-(periods + 1)]
    curr = series.iloc[-1]
    if not prev:
        return None
    return (curr / prev - 1) * 100.0


def max_drawdown(equity: pd.Series) -> float:
    if equity.empty:
        return 0.0
    running_max = equity.cummax()
    dd = (equity / running_max - 1).min()
    return float(dd) if not np.isnan(dd) else 0.0


def annualized_return(equity: pd.Series, bars_per_year: float = 252) -> float:
    if len(equity) < 2 or equity.iloc[0] <= 0:
        return 0.0
    years = len(equity) / bars_per_year
    if years <= 0:
        return 0.0
    return (equity.iloc[-1] / equity.iloc[0]) ** (1 / years) - 1.0


def annualized_volatility(returns: pd.Series, bars_per_year: float = 252) -> float:
    std = returns.std()
    if pd.isna(std):
        return 0.0
    return float(std * np.sqrt(bars_per_year))


def sharpe(returns: pd.Series, bars_per_year: float = 252) -> float:
    if len(returns) < 2:
        return 0.0
    mean = returns.mean()
    std = returns.std()
    if pd.isna(std) or std == 0:
        return 0.0
    return float((mean / std) * np.sqrt(bars_per_year))
