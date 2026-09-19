from fastapi import APIRouter, Depends

from ..core.ratelimit import rate_limit
from ..services import market as market_service

router = APIRouter(prefix="/api/market", tags=["market"])


@router.get(
    "/overview",
    dependencies=[Depends(rate_limit(limit=20, window=60))],
    summary="Market overview: indices + movers",
)
def overview() -> dict:
    index_quotes = market_service.get_index_quotes()
    mover_data = market_service.movers()
    timestamps = [quote.get("updated_at_ms") for quote in index_quotes]
    timestamps.append(mover_data.get("updated_at_ms"))
    timestamps = [timestamp for timestamp in timestamps if timestamp]
    return {
        "indices": index_quotes,
        "movers": mover_data,
        "updated_at_ms": max(timestamps) if timestamps else None,
    }


@router.get(
    "/indices",
    dependencies=[Depends(rate_limit(limit=30, window=60))],
    summary="Index quotes only",
)
def indices() -> dict:
    return {"indices": market_service.get_index_quotes()}
