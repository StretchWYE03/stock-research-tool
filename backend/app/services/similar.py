"""Similar-stock finder.

Clusters the research universe on fundamentals (valuation, growth, margins,
leverage, dividend, size, volatility) and returns the nearest neighbours for a
query symbol. Pure numpy: no ML libraries, no external calls beyond the
already-cached `get_info` fundamentals, nothing leaves the machine.

Algorithm:
  1. Load fundamentals for the whole universe (cached per-symbol, 6h).
  2. Keep features with decent coverage; impute missing values with medians.
  3. Clip outliers, then z-score every column.
  4. k-means (deterministic, fixed seed) assigns each stock a cluster; the
     query's neighbours are the smallest Euclidean distances across the
     universe, and each neighbour reports the features it's closest on.
"""

from __future__ import annotations

import math
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

import numpy as np

from ..core.cache import cache
from ..data.universe import UNIVERSE
from ..services.market import get_info, get_universe_quotes

_model_lock = threading.Lock()

_MODEL_KEY = "similar-model"
_MODEL_TTL = 6 * 3600

# Feature name -> (human label, extraction fn). Values are raw fundamentals;
# transforms (log, clip) happen in _build_model.
_FEATURES: dict[str, tuple[str, callable]] = {
    "marketCap": ("market cap", lambda i: i.get("marketCap")),
    "trailingPE": ("P/E", lambda i: i.get("trailingPE")),
    "revenueGrowth": ("growth", lambda i: i.get("revenueGrowth")),
    "profitMargins": ("margin", lambda i: i.get("profitMargins")),
    "debtToEquity": ("leverage", lambda i: i.get("debtToEquity")),
    "dividendYield": ("dividend", lambda i: i.get("dividendYield")),
    "beta": ("volatility", lambda i: i.get("beta")),
}

# Minimum fraction of the universe that must have a feature for it to be used.
_MIN_COVERAGE = 0.5
_N_CLUSTERS = 8
_MAX_NEIGHBOURS = 6
_N_KMEANS_RESTARTS = 5
_RNG_SEED = 42


def _feature_rows() -> list[dict]:
    """Fundamentals for the whole universe, fetched from cache where possible.

    Returns [{symbol, name, sector, country, info}] with info already cached
    (so a warm screener makes this free) and anything missing filled in via a
    small thread pool.
    """
    missing = [u for u in UNIVERSE if cache.get(f"info:{u['symbol']}") is None]
    if missing:
        with ThreadPoolExecutor(max_workers=8) as pool:
            futures = [pool.submit(get_info, u["symbol"]) for u in missing]
            for future in as_completed(futures):
                try:
                    future.result()  # populates the 6h info cache
                except Exception:
                    pass

    rows = []
    for u in UNIVERSE:
        info = cache.get(f"info:{u['symbol']}") or {}
        if info:
            rows.append(
                {
                    "symbol": u["symbol"],
                    "name": info.get("longName") or info.get("shortName") or u["name"],
                    "sector": u["sector"],
                    "country": u["country"],
                    "info": info,
                }
            )
    return rows


def _zscore(mat: np.ndarray) -> np.ndarray:
    mean = mat.mean(axis=0)
    std = mat.std(axis=0)
    std[std == 0] = 1.0
    return (mat - mean) / std, mean, std


def _kmeans(x: np.ndarray, k: int) -> np.ndarray:
    """Deterministic k-means (fixed seed, best-of-restarts)."""
    if len(x) <= k:
        return np.arange(len(x))
    rng = np.random.default_rng(_RNG_SEED)
    best_labels, best_inertia = None, math.inf
    for _ in range(_N_KMEANS_RESTARTS):
        centers = x[rng.choice(len(x), k, replace=False)].copy()
        labels = np.zeros(len(x), dtype=int)
        for _ in range(60):
            dists = ((x[:, None, :] - centers[None, :, :]) ** 2).sum(axis=2)
            new_labels = dists.argmin(axis=1)
            inertia = dists[np.arange(len(x)), new_labels].sum()
            if np.array_equal(new_labels, labels):
                break
            labels = new_labels
            for c in range(k):
                members = x[labels == c]
                if len(members):
                    centers[c] = members.mean(axis=0)
        if inertia < best_inertia:
            best_inertia, best_labels = inertia, labels
    return best_labels


def _build_model() -> dict:
    """Build (or load cached) feature matrix + cluster assignments.

    Locked so concurrent cold-start requests share a single warm-up.
    """
    cached = cache.get(_MODEL_KEY)
    if cached is not None:
        return cached
    with _model_lock:
        cached = cache.get(_MODEL_KEY)
        if cached is not None:
            return cached
        rows = _feature_rows()
    if len(rows) < 10:
        return {"rows": rows, "features": [], "matrix": None, "clusters": [], "labels": []}

    # Keep features with enough coverage across the universe.
    features: list[str] = []
    for key in _FEATURES:
        coverage = sum(1 for r in rows if _FEATURES[key][1](r["info"]) is not None)
        if coverage / len(rows) >= _MIN_COVERAGE:
            features.append(key)

    raw = np.zeros((len(rows), len(features)), dtype=float)
    for j, key in enumerate(features):
        col = [_FEATURES[key][1](r["info"]) for r in rows]
        # Impute with the column median.
        finite = [float(v) for v in col if v is not None and math.isfinite(v)]
        median = float(np.median(finite)) if finite else 0.0
        col = [float(v) if v is not None and math.isfinite(v) else median for v in col]
        arr = np.array(col)
        # Market cap spans many orders of magnitude; log it.
        if key == "marketCap":
            arr = np.log10(np.maximum(arr, 1.0))
        raw[:, j] = arr

    # Clip the 1st/99th percentiles to blunt extreme outliers, then z-score.
    clip_lo = np.zeros(raw.shape[1])
    clip_hi = np.zeros(raw.shape[1])
    for j in range(raw.shape[1]):
        lo, hi = np.percentile(raw[:, j], [1, 99])
        clip_lo[j], clip_hi[j] = lo, hi
        raw[:, j] = np.clip(raw[:, j], lo, hi)
    matrix, mean, std = _zscore(raw)

    clusters = _kmeans(matrix, min(_N_CLUSTERS, len(rows) // 5 + 1))
    labels = [_FEATURES[f][0] for f in features]

    model = {
        "rows": rows,
        "features": features,
        "labels": labels,
        "matrix": matrix,
        "mean": mean,
        "std": std,
        "clip_lo": clip_lo,
        "clip_hi": clip_hi,
        "clusters": clusters.tolist(),
    }
    cache.set(_MODEL_KEY, model, ttl=_MODEL_TTL)
    return model


def _query_vector(model: dict, symbol: str, rows: list | None = None) -> np.ndarray | None:
    """Standardized feature vector for a symbol (with per-column medians).

    `rows` defaults to the model's universe rows; callers that appended a
    non-universe query row must pass the extended list so the symbol is found.
    """
    rows = rows if rows is not None else model["rows"]
    features = model["features"]
    row = next((r for r in rows if r["symbol"] == symbol), None)
    if row is None or not features:
        return None
    vec = np.zeros(len(features), dtype=float)
    for j, key in enumerate(features):
        col = [r["info"].get(key) for r in rows]
        finite = [float(v) for v in col if v is not None and math.isfinite(v)]
        median = float(np.median(finite)) if finite else 0.0
        value = row["info"].get(key)
        value = float(value) if value is not None and math.isfinite(value) else median
        if key == "marketCap":
            value = math.log10(max(value, 1.0))
        vec[j] = value
    # Reuse the clip bounds the model was built with, then z-score.
    vec = np.clip(vec, model["clip_lo"], model["clip_hi"])
    return (vec - model["mean"]) / model["std"]


def get_similar(symbol: str) -> dict:
    """Nearest neighbours for `symbol` with similarity and explanation."""
    symbol = symbol.strip().upper()
    model = _build_model()
    rows = model["rows"]
    in_universe = symbol in {r["symbol"] for r in rows}

    if not in_universe:
        # Query symbols outside the static universe: fetch fundamentals on
        # demand and add to the row set (model features/means stay as built).
        # Bail only when we couldn't get any fundamental data at all (the
        # name alone is not required; it may be missing even for valid
        # symbols, e.g. CMG).
        info = get_info(symbol)
        has_fundamentals = any(info.get(k) is not None for k in _FEATURES)
        if not has_fundamentals:
            return {"symbol": symbol, "similar": [], "cluster": None}
        meta = next((u for u in UNIVERSE if u["symbol"] == symbol), None)
        rows = list(rows) + [
            {
                "symbol": symbol,
                "name": info.get("longName") or info.get("shortName") or symbol,
                "sector": (meta or {}).get("sector", ""),
                "country": (meta or {}).get("country", ""),
                "info": info,
            }
        ]

    if not model["features"] or len(rows) < 2:
        return {"symbol": symbol, "similar": [], "cluster": None}

    q = _query_vector(model, symbol, rows)
    if q is None:
        return {"symbol": symbol, "similar": [], "cluster": None}

    # Distance to every other row.
    dists: list[tuple[float, int]] = []
    for i, r in enumerate(rows):
        if r["symbol"] == symbol:
            continue
        d = float(np.linalg.norm(q - model["matrix"][i]))
        dists.append((d, i))
    dists.sort(key=lambda t: t[0])
    top = dists[: _MAX_NEIGHBOURS]

    quotes = get_universe_quotes()
    # Normalize against the farthest distance in the whole universe so the
    # percentages read as honest relative similarity (no forced 0% on the
    # bottom of the shown list). Floor at 1%.
    d_max = dists[-1][0] if dists and dists[-1][0] > 0 else 1.0

    similar = []
    for d, i in top:
        r = rows[i]
        closest = _closest_features(model, q, i)
        quote = quotes.get(r["symbol"]) or {}
        similar.append(
            {
                "symbol": r["symbol"],
                "name": r["name"],
                "sector": r["sector"],
                "country": r["country"],
                "price": quote.get("price"),
                "change_pct": quote.get("change_pct"),
                "currency": quote.get("currency"),
                "similarity": max(1, int(round(100 * (1 - d / d_max)))),
                "closest": closest,
            }
        )

    # Cluster lookup is only valid against the original model rows; an
    # appended query row sits beyond the clusters list (IndexError).
    clusters = model["clusters"]
    cluster = None
    if clusters and in_universe:
        idx = next(i for i, r in enumerate(model["rows"]) if r["symbol"] == symbol)
        cluster_id = int(clusters[idx])
        # Clusters mix sectors (banks and mega-cap tech can share a fundamental
        # profile), so a sector label would be misleading. Report size only;
        # the frontend phrases it as a "similarity group".
        size = sum(1 for c in clusters if c == cluster_id)
        cluster = {"id": cluster_id, "size": size}

    return {
        "symbol": symbol,
        "cluster": cluster,
        "features": model["labels"],
        "similar": similar,
    }


def _closest_features(model: dict, q: np.ndarray, row_idx: int) -> list[str]:
    """Feature labels this neighbour matches best (smallest |z| difference)."""
    diff = np.abs(q - model["matrix"][row_idx])
    order = np.argsort(diff)[:3]
    return [model["labels"][j] for j in order]
