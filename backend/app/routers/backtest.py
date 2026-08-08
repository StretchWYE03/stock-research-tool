import re

from fastapi import APIRouter, Depends, HTTPException, Query

from ..core.ratelimit import rate_limit
from ..services.backtest import STRATEGIES, run_backtest

router = APIRouter(prefix="/api/backtest", tags=["backtest"])

_SYMBOL_RE = re.compile(r"^[A-Za-z0-9.\-]{1,10}$")


@router.get(
    "/{symbol}",
    dependencies=[Depends(rate_limit(limit=10, window=60))],
    summary="Backtest a strategy on a symbol",
)
def backtest(
    symbol: str,
    strategy: str = Query("sma_cross"),
    fast: int = Query(20, ge=2, le=100),
    slow: int = Query(50, ge=2, le=300),
    oversold: int = Query(30, ge=5, le=50),
    overbought: int = Query(70, ge=50, le=95),
    window: int = Query(200, ge=20, le=500),
    period: str = Query("1y", pattern="^(1y|2y|5y|10y)$"),
) -> dict:
    symbol = symbol.strip().upper()
    if not _SYMBOL_RE.match(symbol):
        raise HTTPException(status_code=400, detail="Invalid symbol.")
    if strategy not in STRATEGIES:
        strategy = "sma_cross"

    params = {"fast": fast, "slow": slow, "oversold": oversold, "overbought": overbought, "window": window}
    result = run_backtest(symbol, strategy, params, period)
    if result.get("error"):
        raise HTTPException(status_code=404, detail=result["error"])
    return result
