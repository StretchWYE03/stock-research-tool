from fastapi import APIRouter, Depends, Query

from ..core.ratelimit import rate_limit
from ..services import market as market_service

router = APIRouter(prefix="/api", tags=["search"])


@router.get(
    "/search",
    dependencies=[Depends(rate_limit(limit=30, window=60))],
    summary="Search US + Canada listed equities",
)
def search(q: str = Query("", min_length=1, max_length=60)) -> dict:
    results = market_service.search(q)
    return {"query": q, "results": results}
