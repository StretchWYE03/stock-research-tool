"""Stock Research API.

A local-only research tool. Free public market data, no accounts, no personal
data, no database. Every API endpoint is rate-limited (global guard + per-route
buckets) to protect the free upstream data sources.

When a frontend production build exists (frontend/dist), it is served from the
same origin so the app runs as one process with no CORS or proxy in the way.
"""

import os
import sys
from pathlib import Path
from urllib.parse import urlsplit

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .core.ratelimit import limiter
from .routers import backtest, health, market, screener, search, stocks

# Interactive docs are useful in a source checkout and useless in the packaged
# app. sys.frozen is set by PyInstaller; the env var is the escape hatch for a
# hosted deployment.
_packaged = bool(getattr(sys, "frozen", False)) or os.environ.get("TICKER_DISABLE_DOCS") == "1"

app = FastAPI(
    title="Stock Research API",
    description="Free, local, privacy-safe stock research: quotes, charts, scores, news, options, screener, backtests.",
    version="0.1.0",
    docs_url=None if _packaged else "/docs",
    redoc_url=None if _packaged else "/redoc",
    openapi_url=None if _packaged else "/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.middleware("http")
async def global_rate_limit(request: Request, call_next):
    # Only API traffic is rate-limited. Static page assets would otherwise burn
    # the shared budget on every page load.
    if request.method != "OPTIONS" and request.url.path.startswith("/api/"):
        client = request.client.host if request.client else "unknown"
        try:
            limiter.check(f"ip:{client}", limit=240, window=60)
        except HTTPException as exc:
            # HTTPException raised here is outside Starlette's exception
            # middleware, so it must become a real response or it surfaces as
            # an unhandled 500.
            return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail}, headers=exc.headers)
    return await call_next(request)


# Loopback hosts (any port) are always allowed. TICKER_ALLOWED_HOSTS and
# TICKER_ALLOWED_ORIGINS extend this for opt-in LAN or hosted setups.
_LOOPBACK_HOSTS = {"127.0.0.1", "localhost", "::1"}


def _allowed_hosts() -> set[str]:
    extra = {h.strip().lower() for h in os.environ.get("TICKER_ALLOWED_HOSTS", "").split(",") if h.strip()}
    return _LOOPBACK_HOSTS | extra


def _allowed_origins() -> set[str]:
    return {o.strip() for o in os.environ.get("TICKER_ALLOWED_ORIGINS", "").split(",") if o.strip()}


@app.middleware("http")
async def origin_host_guard(request: Request, call_next):
    """Reject API requests from foreign Hosts or Origins.

    Any website the user visits can send requests to 127.0.0.1; CORS only stops
    the attacker from reading responses, not from sending requests. This guard
    blocks that class (localhost CSRF, DNS rebinding): the Host must be a
    loopback address and, when a browser sends an Origin, it must be loopback
    too. Same-origin and dev-proxied requests always pass.
    """
    if request.url.path.startswith("/api/"):
        hostname = (request.headers.get("host") or "").lower().split(":")[0].strip("[]")
        if hostname not in _allowed_hosts():
            return JSONResponse(status_code=403, content={"detail": "Forbidden host."})
        origin = request.headers.get("origin")
        if origin:
            origin_host = urlsplit(origin).hostname
            if origin_host not in _allowed_hosts() and origin not in _allowed_origins():
                return JSONResponse(status_code=403, content={"detail": "Forbidden origin."})
    return await call_next(request)


app.include_router(health.router)
app.include_router(market.router)
app.include_router(stocks.router)
app.include_router(search.router)
app.include_router(screener.router)
app.include_router(backtest.router)


# ---- Production frontend serving (same origin, no CORS needed) ----

def _frontend_dist() -> Path | None:
    """Locate the built frontend across dev, onedir, and onefile layouts."""
    candidates = [
        os.environ.get("TICKER_FRONTEND_DIST"),
        # PyInstaller bundle (both onedir and onefile expose _MEIPASS)
        str(Path(getattr(sys, "_MEIPASS", "")) / "frontend" / "dist"),
        # onedir: folder next to the executable
        str(Path(sys.executable).resolve().parent / "frontend" / "dist"),
        # source checkout
        str(Path(__file__).resolve().parents[2] / "frontend" / "dist"),
    ]
    for candidate in candidates:
        if candidate and Path(candidate).joinpath("index.html").is_file():
            return Path(candidate)
    return None


FRONTEND_DIST = _frontend_dist()

if FRONTEND_DIST is not None:
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    async def spa_fallback(path: str) -> FileResponse:
        # Real files win, otherwise let the SPA router take over. Only serve
        # files that resolve inside the dist folder.
        if path:
            candidate = (FRONTEND_DIST / path).resolve()
            if candidate.is_relative_to(FRONTEND_DIST.resolve()) and candidate.is_file():
                return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")
