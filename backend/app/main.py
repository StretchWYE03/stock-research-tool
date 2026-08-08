"""Stock Research API.

A local-only research tool. Free public market data, no accounts, no personal
data, no database. Every endpoint is rate-limited (global guard + per-route
buckets) to protect the free upstream data sources.
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from .core.ratelimit import limiter
from .routers import backtest, health, market, screener, search, stocks

app = FastAPI(
    title="Stock Research API",
    description="Free, local, privacy-safe stock research: quotes, charts, scores, news, options, screener, backtests.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.middleware("http")
async def global_rate_limit(request: Request, call_next):
    if request.method != "OPTIONS":
        client = request.client.host if request.client else "unknown"
        limiter.check(f"ip:{client}", limit=240, window=60)
    return await call_next(request)


app.include_router(health.router)
app.include_router(market.router)
app.include_router(stocks.router)
app.include_router(search.router)
app.include_router(screener.router)
app.include_router(backtest.router)
