"""Data access layer for public market data (US + Canada equities).

Talks directly to Yahoo Finance's public JSON endpoints with a browser
User-Agent: free, no API key, no accounts. A crumb + cookie dance is used only
for the fundamentals (quoteSummary) and options endpoints.

Every upstream call is cached in-memory to respect rate limits, and transient
429s are retried with a short backoff. No personal data ever touches this layer.
"""

from __future__ import annotations

import math
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

import httpx

from ..core.cache import cache
from ..data.universe import INDEXES, UNIVERSE

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)

_HTTP_TIMEOUT = httpx.Timeout(15.0, connect=10.0)

_EXCHANGE_NAMES = {
    "NYQ": "NYSE",
    "NMS": "Nasdaq",
    "NGM": "Nasdaq",
    "NCM": "Nasdaq",
    "ASE": "AMEX",
    "PCX": "NYSE Arca",
    "BTS": "TSX",
    "VAN": "TSXV",
    "NEO": "NEO Exchange",
    "CVE": "Cboe Canada",
}

_ALLOWED_EXCHANGES = set(_EXCHANGE_NAMES)

# Shared HTTP client (keeps cookies, mimics a browser)

_client: httpx.Client | None = None
_client_lock = threading.Lock()

_crumb: str | None = None
_crumb_lock = threading.Lock()


def _get_client() -> httpx.Client:
    global _client
    with _client_lock:
        if _client is None:
            _client = httpx.Client(headers={"User-Agent": UA}, timeout=_HTTP_TIMEOUT)
        return _client


def _get_json(url: str, params: dict, authed: bool = False, retries: int = 2) -> dict | None:
    """GET a Yahoo JSON endpoint. Concurrency-safe; retries transient failures."""
    if authed:
        crumb = _get_crumb()
        if crumb is None:
            return None
        params = {**params, "crumb": crumb}

    for attempt in range(retries + 1):
        try:
            resp = _get_client().get(url, params=params)
        except Exception:
            time.sleep(1.0)
            continue
        if resp.status_code == 200:
            try:
                return resp.json()
            except Exception:
                return None
        if resp.status_code in (429, 502, 503):
            time.sleep(2.0 * (attempt + 1))
            continue
        if resp.status_code in (401, 403) and authed:
            with _crumb_lock:
                global _crumb
                _crumb = None  # crumb expired; refetch next call
            time.sleep(1.0)
            continue
        return None
    return None


def _get_crumb() -> str | None:
    """Fetch and memoize Yahoo's crumb (required for quoteSummary/options)."""
    global _crumb
    with _crumb_lock:
        if _crumb:
            return _crumb
        try:
            client = _get_client()
            client.get("https://fc.yahoo.com")  # sets the A3 cookie
            resp = client.get("https://query2.finance.yahoo.com/v1/test/getcrumb")
            if resp.status_code == 200 and resp.text.strip():
                _crumb = resp.text.strip()
                return _crumb
        except Exception:
            pass
        return None


# Helpers

def _num(value, default=None):
    try:
        if value is None or (isinstance(value, float) and math.isnan(value)):
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _pct(a, b):
    if not a or not b:
        return None
    return round((a - b) / b * 100.0, 2)


def _raw(entry, default=None):
    """quoteSummary entries are {"raw": ..., "fmt": ...}; return the raw value."""
    if isinstance(entry, dict):
        return entry.get("raw", default)
    return entry


def _round(value, digits=4):
    if value is None:
        return None
    return round(float(value), digits)


# Chart endpoint (quotes + history)

def _chart(symbol: str, range_: str, interval: str) -> dict | None:
    key = f"chart:{symbol}:{range_}:{interval}"
    cached = cache.get(key)
    if cached is not None:
        return cached

    data = _get_json(
        "https://query2.finance.yahoo.com/v8/finance/chart/" + symbol,
        {"range": range_, "interval": interval},
    )
    if not data:
        return None
    try:
        result = data["chart"]["result"][0]
    except (KeyError, IndexError, TypeError):
        return None
    cache.set(key, result, ttl=120 if interval.endswith("m") else 300)
    return result


def get_quote(symbol: str) -> dict | None:
    """Latest quote for one symbol from chart meta (fast, cached 30s)."""
    key = f"quote:{symbol}"
    cached = cache.get(key)
    if cached is not None:
        return cached

    # Use a few days of history so we can derive yesterday's close for change%.
    chart = _chart(symbol, "5d", "1d")
    if not chart:
        return None
    meta = chart.get("meta") or {}
    price = _num(meta.get("regularMarketPrice"))
    if price is None:
        return None

    ts = chart.get("timestamp") or []
    quotes = ((chart.get("indicators") or {}).get("quote") or [{}])[0]
    closes = quotes.get("close") or []
    opens = quotes.get("open") or []

    # Yahoo timestamps daily bars at session OPEN (9:30 ET), so compare
    # calendar dates against the market time rather than raw timestamps.
    import datetime as _dt

    prev = None
    open_val = None
    regular_time = _num(meta.get("regularMarketTime"))
    regular_day = _dt.datetime.fromtimestamp(regular_time, tz=_dt.UTC).date() if regular_time else None
    for i in range(len(ts) - 1, -1, -1):
        bar_day = _dt.datetime.fromtimestamp(ts[i], tz=_dt.UTC).date()
        if regular_day is None or bar_day < regular_day:
            prev = _num(closes[i])
            break
    if prev is None and len(closes) >= 2:
        prev = _num(closes[-2])
    if prev is None:
        prev = _num(meta.get("regularMarketPreviousClose")) or _num(meta.get("previousClose"))

    # Today's open = open of the bar on the current market day.
    if regular_day:
        for i in range(len(ts) - 1, -1, -1):
            bar_day = _dt.datetime.fromtimestamp(ts[i], tz=_dt.UTC).date()
            if bar_day == regular_day:
                open_val = _num(opens[i])
                break

    quote = {
        "symbol": symbol,
        "name": meta.get("longName") or meta.get("shortName") or symbol,
        "price": _round(price, 4),
        "change": _round(price - prev) if price and prev else None,
        "change_pct": _pct(price, prev),
        "open": _round(meta.get("regularMarketOpen") or open_val),
        "day_high": _round(meta.get("regularMarketDayHigh") or meta.get("dayHigh")),
        "day_low": _round(meta.get("regularMarketDayLow") or meta.get("dayLow")),
        "prev_close": _round(prev),
        "volume": _num(meta.get("regularMarketVolume")),
        "market_cap": None,  # requires the slower fundamentals endpoint
        "currency": meta.get("currency"),
        "exchange": meta.get("exchangeName"),
        "year_high": _round(meta.get("fiftyTwoWeekHigh")),
        "year_low": _round(meta.get("fiftyTwoWeekLow")),
        "fifty_day_avg": None,
        "two_hundred_day_avg": None,
        "market_state": meta.get("marketState"),
        "updated_at_ms": int(regular_time * 1000) if regular_time else None,
    }
    cache.set(key, quote, ttl=30)
    return quote


HISTORY_PRESETS = {
    "1d": ("1d", "5m"),
    "5d": ("5d", "15m"),
    "1mo": ("1mo", "1h"),
    "3mo": ("3mo", "1d"),
    "6mo": ("6mo", "1d"),
    "1y": ("1y", "1d"),
    "2y": ("2y", "1d"),
    "5y": ("5y", "1wk"),
    "10y": ("10y", "1wk"),
}


def get_history(symbol: str, period: str = "1y", interval: str | None = None) -> dict:
    """OHLCV bars for a symbol, split/dividend adjusted. Cached per key."""
    if interval is None:
        period, interval = HISTORY_PRESETS.get(period, ("1y", "1d"))

    chart = _chart(symbol, period, interval)
    if not chart:
        return {"symbol": symbol, "period": period, "interval": interval, "bars": []}

    meta = chart.get("meta") or {}
    ts = chart.get("timestamp") or []
    quotes = ((chart.get("indicators") or {}).get("quote") or [{}])[0]
    adjclose = ((chart.get("indicators") or {}).get("adjclose") or [{}])[0].get("adjclose")

    opens, highs, lows, closes, volumes = (
        quotes.get("open"),
        quotes.get("high"),
        quotes.get("low"),
        quotes.get("close"),
        quotes.get("volume"),
    )
    if not closes:
        return {"symbol": symbol, "period": period, "interval": interval, "bars": []}

    bars = []
    for i, t in enumerate(ts):
        close = _num(closes[i] if i < len(closes) else None)
        if close is None:
            continue
        # Scale OHLC by adj/raw ratio so charts account for splits & dividends.
        ratio = 1.0
        if adjclose and i < len(adjclose) and adjclose[i]:
            raw_close = closes[i]
            if raw_close:
                ratio = adjclose[i] / raw_close
        # Yahoo occasionally returns null OHLC for a bar (halted names, index
        # edge cases); fall back to the bar's close so charts never see NaN.
        o = _num(opens[i] if i < len(opens) else None) or close
        h = _num(highs[i] if i < len(highs) else None) or close
        l = _num(lows[i] if i < len(lows) else None) or close
        bars.append(
            {
                "t": int(t * 1000),
                "o": _round(o * ratio),
                "h": _round(h * ratio),
                "l": _round(l * ratio),
                "c": _round(close * ratio),
                "v": _num(volumes[i] if i < len(volumes) else None, 0.0),
            }
        )

    return {
        "symbol": symbol,
        "period": period,
        "interval": interval,
        "currency": meta.get("currency"),
        "exchange": meta.get("exchangeName"),
        "name": meta.get("longName") or meta.get("shortName") or symbol,
        "bars": bars,
    }


# Fundamentals (crumb-protected)

_INFO_MODULES = (
    "assetProfile,summaryDetail,financialData,defaultKeyStatistics,price,recommendationTrend"
)

_INFO_FIELDS = [
    "longName", "shortName", "sector", "industry", "country", "website",
    "marketCap", "trailingPE", "forwardPE", "priceToBook", "trailingEps",
    "forwardEps", "profitMargins", "grossMargins", "operatingMargins",
    "returnOnEquity", "returnOnAssets", "revenueGrowth", "earningsGrowth",
    "earningsQuarterlyGrowth", "totalRevenue", "revenuePerShare",
    "debtToEquity", "currentRatio", "quickRatio", "totalDebt", "totalCash",
    "dividendYield", "dividendRate", "payoutRatio", "beta",
    "fiftyTwoWeekHigh", "fiftyTwoWeekLow", "fiftyDayAverage",
    "twoHundredDayAverage", "averageVolume", "sharesOutstanding",
    "floatShares", "bookValue", "freeCashflow", "targetMeanPrice",
    "targetHighPrice", "targetLowPrice", "numberOfAnalystOpinions",
    "recommendationKey", "recommendationMean", "exchange", "currency",
    "marketState", "regularMarketPrice", "regularMarketChangePercent",
    "longBusinessSummary",
]


def get_info(symbol: str) -> dict:
    """Fundamentals & profile for one symbol (cached 6h)."""
    key = f"info:{symbol}"
    cached = cache.get(key)
    if cached is not None:
        return cached

    data = _get_json(
        "https://query2.finance.yahoo.com/v10/finance/quoteSummary/" + symbol,
        {"modules": _INFO_MODULES},
        authed=True,
    )
    result: dict = {}
    if data:
        try:
            rs = data["quoteSummary"]["result"][0]
            for module in rs.values():
                if isinstance(module, dict):
                    result.update({k: _raw(v) for k, v in module.items()})
        except (KeyError, IndexError, TypeError):
            result = {}

    cleaned = {f: result.get(f) for f in _INFO_FIELDS}
    # Merge longName/shortName from chart meta if missing.
    if not cleaned.get("longName") and not cleaned.get("shortName"):
        chart = _chart(symbol, "1d", "1d")
        if chart:
            meta = chart.get("meta") or {}
            cleaned["longName"] = meta.get("longName")
            cleaned["shortName"] = meta.get("shortName")
    cache.set(key, cleaned, ttl=6 * 3600)
    return cleaned


# Search / news (public endpoints)

def search(query: str) -> list[dict]:
    """Symbol search over US + Canada listed equities."""
    query = query.strip()
    if not query:
        return []
    key = f"search:{query.lower()}"
    cached = cache.get(key)
    if cached is not None:
        return cached

    results: list[dict] = []
    data = _get_json(
        "https://query2.finance.yahoo.com/v1/finance/search",
        {"q": query, "quotesCount": 12, "newsCount": 0, "listsCount": 0},
    )
    if data:
        for item in data.get("quotes", []):
            if item.get("typeDisp") != "Equity":
                continue
            exchange = item.get("exchange", "")
            if exchange not in _ALLOWED_EXCHANGES:
                continue
            results.append(
                {
                    "symbol": item.get("symbol"),
                    "name": item.get("shortname") or item.get("longname"),
                    "exchange": _EXCHANGE_NAMES.get(exchange, exchange),
                    "country": "CA" if exchange in ("BTS", "VAN", "NEO", "CVE") else "US",
                }
            )

    seen, clean = set(), []
    for r in results:
        if r["symbol"] and r["symbol"] not in seen:
            seen.add(r["symbol"])
            clean.append(r)
        if len(clean) >= 10:
            break
    cache.set(key, clean, ttl=60)
    return clean


def get_news(symbol: str) -> list[dict]:
    """Recent news for a symbol (cached 5m)."""
    key = f"news:{symbol}"
    cached = cache.get(key)
    if cached is not None:
        return cached

    items: list[dict] = []
    data = _get_json(
        "https://query2.finance.yahoo.com/v1/finance/search",
        {"q": symbol, "quotesCount": 0, "newsCount": 15},
    )
    if data:
        for raw in data.get("news", []):
            content = raw.get("content") or raw
            thumb = content.get("thumbnail")
            thumb_url = None
            if isinstance(thumb, dict):
                thumb_url = thumb.get("url") or (thumb.get("resolutions") or [{}])[-1].get("url")
            pub = content.get("providerPublishTime") or content.get("pubDate")
            if isinstance(pub, str):
                try:
                    import datetime as _dt

                    pub = int(_dt.datetime.fromisoformat(pub.replace("Z", "+00:00")).timestamp() * 1000)
                except Exception:
                    pub = None
            elif isinstance(pub, (int, float)):
                pub = int(pub * 1000) if pub < 10**12 else int(pub)
            items.append(
                {
                    "id": content.get("id") or raw.get("uuid"),
                    "title": content.get("title"),
                    "summary": content.get("summary") or content.get("description"),
                    "publisher": (content.get("provider") or {}).get("displayName") if isinstance(content.get("provider"), dict) else content.get("publisher"),
                    "url": (content.get("canonicalUrl") or {}).get("url") if isinstance(content.get("canonicalUrl"), dict) else content.get("link"),
                    "published_at": pub,
                    "thumbnail": thumb_url,
                }
            )
    cache.set(key, items, ttl=300)
    return items


# Options (crumb-protected)

def get_options(symbol: str, max_expiries: int = 2) -> dict:
    """Option chain (calls/puts with IV, OI, greeks) for the nearest expiries."""
    key = f"options:{symbol}:{max_expiries}"
    cached = cache.get(key)
    if cached is not None:
        return cached

    result = {"symbol": symbol, "expirations": [], "chains": []}
    data = _get_json(
        "https://query2.finance.yahoo.com/v7/finance/options/" + symbol,
        {},
        authed=True,
    )
    if data:
        try:
            chain_result = data["optionChain"]["result"][0]
            result["expirations"] = [
                time.strftime("%Y-%m-%d", time.gmtime(ts))
                for ts in (chain_result.get("expirationDates") or [])[:8]
            ]
            for chain in (chain_result.get("options") or [])[:max_expiries]:
                result["chains"].append(
                    {
                        "expiration": time.strftime("%Y-%m-%d", time.gmtime(chain.get("expirationDate", 0))),
                        "calls": _chain_rows(chain.get("calls") or []),
                        "puts": _chain_rows(chain.get("puts") or []),
                    }
                )
        except (KeyError, IndexError, TypeError):
            pass
    cache.set(key, result, ttl=900)
    return result


def _chain_rows(rows: list[dict]) -> list[dict]:
    out = []
    for r in rows:
        out.append(
            {
                "strike": _round(r.get("strike")),
                "last_price": _round(r.get("lastPrice")),
                "bid": _round(r.get("bid")),
                "ask": _round(r.get("ask")),
                "volume": _num(r.get("volume"), 0),
                "open_interest": _num(r.get("openInterest"), 0),
                "iv": _round(r.get("impliedVolatility"), 4),
                "delta": _round(r.get("delta")),
                "gamma": _round(r.get("gamma")),
                "theta": _round(r.get("theta")),
                "vega": _round(r.get("vega")),
                "itm": bool(r.get("inTheMoney")),
            }
        )
    return out


# Universe / dashboard

def get_index_quotes() -> list[dict]:
    """Dashboard index cards (cached 45s)."""
    key = "indexes"
    cached = cache.get(key)
    if cached is not None:
        return cached

    out = []
    for idx in INDEXES:
        quote = get_quote(idx["symbol"])
        if quote and quote.get("price"):
            out.append({**idx, **quote})
    cache.set(key, out, ttl=45)
    return out


def get_universe_quotes() -> dict[str, dict]:
    """Quotes for the whole research universe (cached 3 min, threaded fetch)."""
    key = "universe-quotes"
    cached = cache.get(key)
    if cached is not None:
        return cached

    out: dict[str, dict] = {}
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(get_quote, item["symbol"]): item for item in UNIVERSE}
        for future in as_completed(futures):
            try:
                quote = future.result()
            except Exception:
                continue
            if quote:
                out[quote["symbol"]] = quote
    if out:
        cache.set(key, out, ttl=180)
    return out


def movers() -> dict[str, list[dict]]:
    """Top gainers / losers / most active from the universe, plus breadth."""
    quotes = get_universe_quotes()
    rows = []
    for symbol, quote in quotes.items():
        meta = next((u for u in UNIVERSE if u["symbol"] == symbol), None)
        rows.append(
            {
                "symbol": symbol,
                "name": quote.get("name") or (meta or {}).get("name", ""),
                "sector": (meta or {}).get("sector", ""),
                "country": (meta or {}).get("country", ""),
                "price": quote.get("price"),
                "change_pct": quote.get("change_pct"),
                "change": quote.get("change"),
                "volume": quote.get("volume"),
                "market_cap": quote.get("market_cap"),
                "currency": quote.get("currency"),
            }
        )
    valid = [r for r in rows if r["price"] and r["change_pct"] is not None]
    valid.sort(key=lambda r: r["change_pct"], reverse=True)
    up = sum(1 for r in valid if r["change_pct"] >= 0)
    down = sum(1 for r in valid if r["change_pct"] < 0)
    total = len(valid)
    return {
        "gainers": valid[:10],
        "losers": list(reversed(valid[-10:])),
        "most_active": sorted(valid, key=lambda r: r["volume"] or 0, reverse=True)[:10],
        "updated_at_ms": max(
            (quote.get("updated_at_ms") for quote in quotes.values()),
            default=None,
        ),
        "breadth": {
            "up": up,
            "down": down,
            "total": total,
            "up_pct": round(up / total * 100, 1) if total else 0.0,
        },
    }
