import re

from fastapi import APIRouter, Depends, HTTPException, Query

from ..core.ratelimit import rate_limit
from ..scoring.engine import compute_score
from ..services import market as market_service
from ..services import sentiment as sentiment_service
from ..services import similar as similar_service

router = APIRouter(prefix="/api/stocks", tags=["stocks"])

_SYMBOL_RE = re.compile(r"^[A-Za-z0-9.\-]{1,10}$")


def _valid_symbol(symbol: str) -> str:
    symbol = symbol.strip().upper()
    if not _SYMBOL_RE.match(symbol):
        raise HTTPException(status_code=400, detail="Invalid symbol.")
    return symbol


@router.get(
    "/{symbol}/quote",
    dependencies=[Depends(rate_limit(limit=30, window=60))],
    summary="Latest quote for a symbol",
)
def quote(symbol: str) -> dict:
    symbol = _valid_symbol(symbol)
    result = market_service.get_quote(symbol)
    if not result:
        raise HTTPException(status_code=404, detail="Symbol not found or market data unavailable.")
    return result


@router.get(
    "/{symbol}/history",
    dependencies=[Depends(rate_limit(limit=30, window=60))],
    summary="OHLCV history for a symbol",
)
def history(symbol: str, period: str = Query("1y")) -> dict:
    symbol = _valid_symbol(symbol)
    if period not in market_service.HISTORY_PRESETS:
        period = "1y"
    result = market_service.get_history(symbol, period)
    if not result["bars"]:
        raise HTTPException(status_code=404, detail="No price history available for this symbol.")
    return result


@router.get(
    "/{symbol}/score",
    dependencies=[Depends(rate_limit(limit=15, window=60))],
    summary="Recommendation score with signal breakdown",
)
def score(symbol: str) -> dict:
    symbol = _valid_symbol(symbol)
    result = compute_score(symbol)
    if not result.get("signals"):
        raise HTTPException(status_code=404, detail="Not enough data to score this symbol.")
    return result


@router.get(
    "/{symbol}/info",
    dependencies=[Depends(rate_limit(limit=20, window=60))],
    summary="Fundamentals profile for a symbol",
)
def info(symbol: str) -> dict:
    symbol = _valid_symbol(symbol)
    result = market_service.get_info(symbol)
    if not result.get("longName") and not result.get("shortName"):
        raise HTTPException(status_code=404, detail="No fundamentals available for this symbol.")
    return result


@router.get(
    "/{symbol}/news",
    dependencies=[Depends(rate_limit(limit=20, window=60))],
    summary="Recent news for a symbol with lexicon-based sentiment",
)
def news(symbol: str) -> dict:
    symbol = _valid_symbol(symbol)
    result = sentiment_service.score_news(market_service.get_news(symbol))
    return {"symbol": symbol, "items": result["items"], "sentiment": result["summary"]}


@router.get(
    "/{symbol}/similar",
    dependencies=[Depends(rate_limit(limit=15, window=60))],
    summary="Stocks with a similar fundamental profile",
)
def similar(symbol: str) -> dict:
    symbol = _valid_symbol(symbol)
    return similar_service.get_similar(symbol)


@router.get(
    "/{symbol}/options",
    dependencies=[Depends(rate_limit(limit=15, window=60))],
    summary="Option chain for a symbol",
)
def options(symbol: str) -> dict:
    symbol = _valid_symbol(symbol)
    result = market_service.get_options(symbol)
    if not result.get("expirations"):
        raise HTTPException(status_code=404, detail="No options data available for this symbol.")
    return result
