"""Rule-based natural-language screener parser.

Turns plain-English queries like "large-cap tech that's oversold" or "high
dividend Canadian banks" into the structured filters the /api/screener/screen
endpoint accepts, plus human-readable chips for the UI. Pure keyword matching
(word-boundary aware), no LLM, no external calls, nothing leaves the machine.

Unknown words are ignored, so partial understanding is still useful; callers
check `matched` to decide whether to show the "I couldn't understand that"
help message.
"""

from __future__ import annotations

import re

# Sector keywords (lowercase). Sector wins by most keyword matches.
SECTOR_KEYWORDS: dict[str, list[str]] = {
    "Technology": [
        "tech", "technology", "software", "semiconductor", "semis", "chip",
        "chips", "cloud", "internet", "saas", "cybersecurity", "data",
    ],
    "Financials": [
        "bank", "banks", "banking", "financial", "finance", "fintech",
        "insurance", "broker", "lenders", "lending",
    ],
    "Energy": [
        "energy", "oil", "gas", "petroleum", "drilling", "refiner",
        "refiners", "uranium", "pipelines", "pipeline",
    ],
    "Healthcare": [
        "health", "healthcare", "pharma", "pharmaceutical", "medical",
        "biotech", "biotechnology", "drug", "drugs",
    ],
    "Consumer": [
        "consumer", "retail", "restaurant", "restaurants", "food",
        "beverage", "e-commerce", "ecommerce", "luxury", "stores",
    ],
    "Industrials": [
        "industrial", "industrials", "rail", "railway", "defense",
        "aerospace", "manufacturing", "machinery", "airline", "airlines",
    ],
    "Materials": [
        "materials", "mining", "miners", "gold", "silver", "copper",
        "precious", "metal", "metals", "steel", "chemical",
    ],
    "Communication": [
        "communication", "telecom", "telecommunications", "media",
        "entertainment", "streaming", "wireless",
    ],
    "Utilities": [
        "utility", "utilities", "electric", "power", "water", "renewable",
        "grid",
    ],
}

_COUNTRY_KEYWORDS = {
    "CA": ["canadian", "canada", "tsx"],
    "US": ["american", "america", "united states", "nyse", "nasdaq", "us", "usa", "states"],
}

# Market-cap tiers (USD). The universe is large-cap heavy, so small/mid caps        # mostly return empty results; still handled so the parser is honest.
_CAP_TIERS = [
    ("mega", "mega cap", 200e9, None),
    ("large", "large cap", 50e9, None),
    ("blue chip", "blue chip", 50e9, None),
    ("mid", "mid cap", 2e9, 50e9),
    ("small", "small cap", None, 2e9),
]

_RATING = [
    ("strong buy", 75.0, "Strong Buy (score 75+)"),
    ("buy", 60.0, "Buy or better (score 60+)"),
]

_DIVIDEND_WORDS = ["dividend", "dividends", "income", "yield"]


def _words(query: str) -> set[str]:
    return set(re.findall(r"[a-z]+", query.lower()))


def _has_phrase(query: str, phrase: str) -> bool:
    """Match a phrase, allowing a trailing plural 's' (e.g. 'strong buys')."""
    lowered = query.lower()
    if re.search(rf"\b{re.escape(phrase)}\b", lowered) is not None:
        return True
    return re.search(rf"\b{re.escape(phrase)}s\b", lowered) is not None


def _norm_cap_phrase(text: str) -> str:
    return text.lower().replace("-", " ").replace("_", " ")


def parse(query: str) -> dict:
    """Parse a plain-English query into screener filters + chips."""
    q = query.strip()
    words = _words(q)
    q_norm = _norm_cap_phrase(q)

    filters: dict = {
        "sector": None,
        "country": None,
        "min_market_cap": None,
        "max_market_cap": None,
        "min_dividend_yield": None,
        "oversold": False,
        "overbought": False,
        "min_score": None,
    }
    chips: list[dict] = []
    matched = False

    # Sector (most keyword matches wins)
    best_sector, best_hits = None, 0
    for sector, keywords in SECTOR_KEYWORDS.items():
        hits = sum(1 for k in keywords if k in words)
        if hits > best_hits:
            best_sector, best_hits = sector, hits
    if best_sector:
        filters["sector"] = best_sector
        chips.append({"kind": "sector", "label": best_sector})
        matched = True

    # Country
    # Word-boundary matching only; a raw substring check would make "us"
    # match inside words like "focus" or "stocks".
    for country, keywords in _COUNTRY_KEYWORDS.items():
        if any(_has_phrase(q, k) for k in keywords):
            filters["country"] = country
            chips.append(
                {"kind": "country", "label": "Canada" if country == "CA" else "United States"}
            )
            matched = True
            break

    # Market cap tier
    for _, phrase, lo, hi in _CAP_TIERS:
        if _has_phrase(q_norm, phrase):
            filters["min_market_cap"] = lo
            filters["max_market_cap"] = hi
            if lo and hi:
                label = f"{phrase.title()} (${_fmt_cap(lo)}-${_fmt_cap(hi)})"
            elif lo:
                label = f"{phrase.title()} (${_fmt_cap(lo)}+)"
            else:
                label = f"{phrase.title()} (under ${_fmt_cap(hi)})"
            chips.append({"kind": "cap", "label": label})
            matched = True
            break

    # RSI zone
    if "oversold" in words:
        filters["oversold"] = True
        chips.append({"kind": "rsi", "label": "Oversold (RSI ≤ 30)"})
        matched = True
    elif "overbought" in words:
        filters["overbought"] = True
        chips.append({"kind": "rsi", "label": "Overbought (RSI > 70)"})
        matched = True

    # Rating
    for phrase, score, label in _RATING:
        if _has_phrase(q, phrase):
            filters["min_score"] = score
            chips.append({"kind": "rating", "label": label})
            matched = True
            break

    # Dividend yield
    if any(w in words for w in _DIVIDEND_WORDS):
        high = "high" in words or "big" in words
        filters["min_dividend_yield"] = 3.0 if high else 2.0
        chips.append(
            {
                "kind": "dividend",
                "label": f"Dividend ≥ {filters['min_dividend_yield']:.1f}%",
            }
        )
        matched = True

    note = None
    if not matched:
        note = (
            "I couldn't understand that. Try: \"large-cap tech that's oversold\", "
            "\"high dividend Canadian banks\", \"US energy stocks\", \"strong buys\"."
        )

    return {"query": q, "filters": filters, "chips": chips, "matched": matched, "note": note}


def _fmt_cap(value: float | None) -> str:
    """Format a cap threshold like 50e9 -> '50B', 2e9 -> '2B'."""
    if value is None:
        return "?"
    return f"{int(value / 1e9)}B" if value >= 1e9 else f"{int(value / 1e6)}M"
