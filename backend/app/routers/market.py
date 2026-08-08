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
    return {
        "indices": market_service.get_index_quotes(),
        "movers": market_service.movers(),
    }


@router.get(
    "/indices",
    dependencies=[Depends(rate_limit(limit=30, window=60))],
    summary="Index quotes only",
)
def indices() -> dict:
    return {"indices": market_service.get_index_quotes()}
