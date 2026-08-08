from fastapi import APIRouter, Depends

from ..core.ratelimit import rate_limit

router = APIRouter(tags=["health"])


@router.get(
    "/api/health",
    dependencies=[Depends(rate_limit(limit=30, window=60))],
    summary="Service health",
)
def health() -> dict:
    return {"status": "ok", "service": "stock-research-api"}
