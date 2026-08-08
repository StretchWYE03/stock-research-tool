"""Recommendation engine.

Combines technical signals (trend, momentum, RSI, MACD) with fundamental signals
(valuation, growth, profitability, health, dividend) into a 0-100 composite score
and a rating band. Pure research output: it does not know the user, hold any
personal data, or place orders. Nothing here is investment advice.

All weights are transparent and returned to the frontend for display.
"""

from __future__ import annotations

import pandas as pd

from ..core.cache import cache
from ..services.market import get_history, get_info
from . import indicators as ta

RATING_BANDS = [
    (75, "STRONG_BUY", "Strong Buy"),
    (60, "BUY", "Buy"),
    (45, "HOLD", "Hold"),
    (30, "SELL", "Sell"),
    (0, "STRONG_SELL", "Strong Sell"),
]


def rating_for(composite: float) -> tuple[str, str]:
    for threshold, key, label in RATING_BANDS:
        if composite >= threshold:
            return key, label
    return "STRONG_SELL", "Strong Sell"


def _scale(value, lo, hi, score_lo=0.0, score_hi=1.0):
    """Map value from [lo, hi] to [score_lo, score_hi], clamped."""
    if value is None:
        return None
    try:
        value = float(value)
    except (TypeError, ValueError):
        return None
    if hi == lo:
        return score_lo
    t = (value - lo) / (hi - lo)
    return max(score_lo, min(score_hi, t)) * (score_hi - score_lo) + score_lo


def _clamp(value, lo, hi):
    return max(lo, min(hi, value))


def compute_score(symbol: str) -> dict:
    key = f"score:{symbol}"
    cached = cache.get(key)
    if cached is not None:
        return cached

    hist = get_history(symbol, "1y", "1d")
    bars = hist.get("bars", [])
    info = get_info(symbol)

    signals: list[dict] = []
    technical_total = 0.0
    technical_max = 0.0
    fundamental_total = 0.0
    fundamental_max = 0.0

    if len(bars) >= 60:
        df = pd.DataFrame(bars)
        close = df["c"]
        last = float(close.iloc[-1])

        # Trend vs moving averages
        for window, max_score, label in ((50, 12, "Trend vs 50-day average"), (200, 10, "Trend vs 200-day average")):
            if len(close) >= window:
                avg = float(ta.sma(close, window).iloc[-1])
                deviation = (last / avg - 1) * 100 if avg else 0.0
                score = max_score * _scale(deviation, -15, 15)
                signals.append(
                    {
                        "id": f"trend{window}",
                        "label": label,
                        "category": "technical",
                        "score": round(score, 1),
                        "max": float(max_score),
                        "detail": f"Price is {deviation:+.1f}% vs the {window}-day average",
                    }
                )
                technical_total += score
                technical_max += max_score

        # Momentum
        for periods, max_score in ((21, 8), (63, 8)):
            ret = ta.pct_returns(close, periods)
            if ret is not None:
                score = max_score * _scale(ret, -25, 25)
                signals.append(
                    {
                        "id": f"mom{periods}",
                        "label": f"Momentum ({periods} trading days)",
                        "category": "technical",
                        "score": round(score, 1),
                        "max": float(max_score),
                        "detail": f"{ret:+.1f}% over the last {periods} sessions",
                    }
                )
                technical_total += score
                technical_max += max_score

        # RSI
        rsi = float(ta.rsi(close, 14).iloc[-1])
        if rsi <= 30:
            rsi_score = 5.0  # oversold bounce potential
            rsi_note = f"Oversold (RSI {rsi:.0f}): possible bounce zone"
        elif rsi <= 45:
            rsi_score = 4.0
            rsi_note = f"Below neutral (RSI {rsi:.0f})"
        elif rsi <= 65:
            rsi_score = 5.5
            rsi_note = f"Healthy momentum zone (RSI {rsi:.0f})"
        elif rsi <= 70:
            rsi_score = 3.0
            rsi_note = f"Approaching overbought (RSI {rsi:.0f})"
        else:
            rsi_score = 1.5
            rsi_note = f"Overbought (RSI {rsi:.0f}): elevated pullback risk"
        signals.append(
            {
                "id": "rsi",
                "label": "RSI (14)",
                "category": "technical",
                "score": rsi_score,
                "max": 6.0,
                "detail": rsi_note,
            }
        )
        technical_total += rsi_score
        technical_max += 6

        # MACD
        _, _, hist = ta.macd(close)
        macd_hist = float(hist.iloc[-1])
        macd_prev = float(hist.iloc[-2]) if len(hist) > 1 else 0.0
        if macd_hist > 0 and macd_hist >= macd_prev:
            macd_score, macd_note = 5.5, "MACD positive and rising"
        elif macd_hist > 0:
            macd_score, macd_note = 4.0, "MACD positive but losing steam"
        elif macd_hist < 0 and macd_hist > macd_prev:
            macd_score, macd_note = 2.5, "MACD negative but improving"
        else:
            macd_score, macd_note = 1.0, "MACD negative and falling"
        signals.append(
            {
                "id": "macd",
                "label": "MACD",
                "category": "technical",
                "score": macd_score,
                "max": 6.0,
                "detail": macd_note,
            }
        )
        technical_total += macd_score
        technical_max += 6

    # Safe even when bars < 60: the ternary only evaluates `rsi` if the guard
    # holds, and `rsi` is only defined inside the bars block above.
    rsi_raw = rsi if len(bars) >= 60 else None

    # Fundamentals (weights rescale if data is missing)
    pe = info.get("trailingPE")
    if pe and pe > 0:
        score = 14.0 * _scale(pe, 60, 8)  # lower PE in band -> better
        signals.append(
            {
                "id": "valuation",
                "label": "Valuation (P/E)",
                "category": "fundamental",
                "score": round(score, 1),
                "max": 14.0,
                "detail": f"Trailing P/E of {pe:.1f}",
            }
        )
        fundamental_total += score
        fundamental_max += 14

    growth = info.get("revenueGrowth")
    if growth is not None:
        score = 12.0 * _scale(growth * 100, -15, 30)
        signals.append(
            {
                "id": "growth",
                "label": "Revenue growth",
                "category": "fundamental",
                "score": round(score, 1),
                "max": 12.0,
                "detail": f"{growth * 100:+.1f}% YoY revenue growth",
            }
        )
        fundamental_total += score
        fundamental_max += 12

    margin = info.get("profitMargins")
    if margin is not None:
        score = 10.0 * _scale(margin * 100, -10, 30)
        signals.append(
            {
                "id": "profitability",
                "label": "Profitability",
                "category": "fundamental",
                "score": round(score, 1),
                "max": 10.0,
                "detail": f"{margin * 100:+.1f}% profit margin",
            }
        )
        fundamental_total += score
        fundamental_max += 10

    debt_eq = info.get("debtToEquity")
    if debt_eq is not None:
        score = 8.0 * (1.0 - _scale(debt_eq, 0, 250))
        signals.append(
            {
                "id": "health",
                "label": "Balance sheet",
                "category": "fundamental",
                "score": round(score, 1),
                "max": 8.0,
                "detail": f"Debt-to-equity of {debt_eq:.0f}%",
            }
        )
        fundamental_total += score
        fundamental_max += 8

    div_yield = info.get("dividendYield")
    if div_yield is not None:
        yield_pct = div_yield * 100
        score = 6.0 * _scale(yield_pct, 0, 4)
        signals.append(
            {
                "id": "dividend",
                "label": "Dividend yield",
                "category": "fundamental",
                "score": round(score, 1),
                "max": 6.0,
                "detail": f"{yield_pct:.2f}% dividend yield",
            }
        )
        fundamental_total += score
        fundamental_max += 6

    technical = (technical_total / technical_max * 50) if technical_max else 0.0
    fundamental = (fundamental_total / fundamental_max * 50) if fundamental_max else 0.0
    composite = _clamp(technical + fundamental, 0.0, 100.0)
    rating_key, rating_label = rating_for(composite)

    result = {
        "symbol": symbol,
        "name": info.get("longName") or info.get("shortName"),
        "composite": round(composite, 1),
        "technical": round(technical, 1),
        "fundamental": round(fundamental, 1),
        "rating": rating_key,
        "rating_label": rating_label,
        "signals": signals,
        "currency": info.get("currency"),
        "rsi": round(rsi_raw, 1) if rsi_raw is not None else None,
        "updated_at_ms": int(pd.Timestamp.now().timestamp() * 1000),
    }
    cache.set(key, result, ttl=900)
    return result
