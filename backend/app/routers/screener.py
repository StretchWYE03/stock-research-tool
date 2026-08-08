from concurrent.futures import ThreadPoolExecutor, as_completed

from fastapi import APIRouter, Depends, Query

from ..core.ratelimit import rate_limit
from ..data.universe import SECTORS, UNIVERSE
from ..scoring.engine import compute_score
from ..services.market import get_info, get_universe_quotes
from ..services.nlp import parse as parse_nl

router = APIRouter(prefix="/api/screener", tags=["screener"])


def _score_row(item: dict) -> dict | None:
    try:
        score = compute_score(item["symbol"])
        quote = get_universe_quotes().get(item["symbol"]) or {}
        info = get_info(item["symbol"])
        return {
            "symbol": item["symbol"],
            "name": score.get("name") or item["name"],
            "sector": item["sector"],
            "country": item["country"],
            "rating": score.get("rating"),
            "rating_label": score.get("rating_label"),
            "composite": score.get("composite"),
            "technical": score.get("technical"),
            "fundamental": score.get("fundamental"),
            "price": quote.get("price"),
            "change_pct": quote.get("change_pct"),
            "market_cap": info.get("marketCap"),
            "dividend_yield": info.get("dividendYield"),  # fraction, e.g. 0.03
            "rsi": score.get("rsi"),
        }
    except Exception:
        return None


@router.get(
    "/screen",
    dependencies=[Depends(rate_limit(limit=10, window=60))],
    summary="Screen the research universe by score and filters",
)
def screen(
    min_score: float = Query(0, ge=0, le=100),
    max_score: float = Query(100, ge=0, le=100),
    sector: str | None = Query(None),
    country: str | None = Query(None, pattern="^(US|CA)$"),
    min_market_cap: float | None = Query(None, ge=0),
    max_market_cap: float | None = Query(None, ge=0),
    min_dividend_yield: float | None = Query(None, ge=0, le=100, description="minimum dividend yield in percent, e.g. 3"),
    oversold: bool = Query(False, description="RSI <= 30"),
    overbought: bool = Query(False, description="RSI >= 70"),
    sort: str = Query("composite", pattern="^(composite|technical|fundamental|change_pct|market_cap)$"),
    limit: int = Query(50, ge=1, le=100),
) -> dict:
    universe = UNIVERSE
    if sector:
        if sector not in SECTORS:
            sector = None
        else:
            universe = [u for u in universe if u["sector"] == sector]
    if country:
        universe = [u for u in universe if u["country"] == country]

    rows: list[dict] = []
    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = [pool.submit(_score_row, item) for item in universe]
        for future in as_completed(futures):
            row = future.result()
            if not row or row["composite"] is None:
                continue
            if not (min_score <= row["composite"] <= max_score):
                continue
            if min_market_cap is not None and (row.get("market_cap") or 0) < min_market_cap:
                continue
            if max_market_cap is not None and (row.get("market_cap") or 0) > max_market_cap:
                continue
            if min_dividend_yield is not None and (row.get("dividend_yield") or 0) * 100 < min_dividend_yield:
                continue
            if oversold and not (row.get("rsi") is not None and row["rsi"] <= 30):
                continue
            if overbought and not (row.get("rsi") is not None and row["rsi"] > 70):
                continue
            rows.append(row)

    reverse = sort not in ("market_cap",)
    rows.sort(key=lambda r: (r.get(sort) or 0), reverse=reverse)
    return {
        "count": len(rows),
        "sectors": SECTORS,
        "results": rows[:limit],
    }


@router.get(
    "/explain",
    dependencies=[Depends(rate_limit(limit=20, window=60))],
    summary="Parse a plain-English screener query into filters",
)
def explain(q: str = Query(..., min_length=1, max_length=200)) -> dict:
    return parse_nl(q)
