"""Rule-based news sentiment scoring.

Pure lexicon scoring: no ML model, no external calls, no data leaves the
machine. Finance-tuned word lists (earnings verbs, analyst actions, market
moves) plus simple negation and amplifier handling, so it produces sensible
Bullish / Neutral / Bearish labels on market headlines.

The score is a signed value in [-1, 1]: the weighted sum of matched terms
divided by the number of matched terms plus one (so a single strong term
saturates near ±1, and many weak terms never blow past the range).
"""

from __future__ import annotations

import re

# Finance-tuned lexicons (token -> weight)
# Positive terms: earnings verbs, analyst actions, market strength, sentiment.

_POSITIVE: dict[str, float] = {
    "beat": 2.0, "beats": 2.0, "beating": 2.0,
    "surge": 2.0, "surges": 2.0, "surged": 2.0,
    "soar": 2.0, "soars": 2.0, "soared": 2.0, "soaring": 2.0,
    "rally": 1.5, "rallies": 1.5, "rallied": 1.5,
    "jump": 1.5, "jumps": 1.5, "jumped": 1.5,
    "gain": 1.5, "gains": 1.5, "gained": 1.5, "gaining": 1.5,
    "climb": 1.5, "climbs": 1.5, "climbed": 1.5,
    "rise": 1.0, "rises": 1.0, "rose": 1.0, "rising": 1.0,
    "upgrade": 1.5, "upgrades": 1.5, "upgraded": 1.5,
    "outperform": 2.0, "outperforms": 2.0, "outperformed": 2.0,
    "exceed": 1.5, "exceeds": 1.5, "exceeded": 1.5, "exceeding": 1.5,
    "profit": 1.0, "profits": 1.0, "profitable": 1.5,
    "record": 1.5, "records": 1.0, "recorded": 1.0,
    "strong": 1.5, "stronger": 1.5, "strongest": 1.5,
    "growth": 1.5, "grow": 1.0, "grows": 1.0, "grew": 1.0, "growing": 1.0,
    "buy": 1.0, "buys": 1.0, "bought": 1.0,
    "bullish": 1.5, "positive": 1.5, "optimistic": 1.0,
    "raise": 1.0, "raises": 1.0, "raised": 1.0, "raising": 1.0,
    "boost": 1.5, "boosts": 1.5, "boosted": 1.5,
    "advance": 1.0, "advances": 1.0, "advanced": 1.0, "advancing": 1.0,
    "recover": 1.5, "recovers": 1.5, "recovered": 1.5, "recovery": 1.5,
    "rebound": 1.5, "rebounds": 1.5, "rebounded": 1.5,
    "win": 1.5, "wins": 1.5, "won": 1.5,
    "success": 1.5, "successful": 1.5, "succeeds": 1.0,
    "approve": 1.0, "approves": 1.0, "approved": 1.5, "approval": 1.5,
    "expand": 1.0, "expands": 1.0, "expanded": 1.0, "expansion": 1.0,
    "momentum": 1.0, "breakout": 1.5,
    "milestone": 1.0, "partnership": 1.0, "partner": 0.5,
    "buyback": 1.0, "dividend": 0.5,
    "launch": 0.5, "launches": 0.5, "launched": 0.5,
    "good": 1.0, "better": 1.0, "best": 1.5, "great": 1.0, "excellent": 1.5,
    "solid": 1.0, "stable": 0.5, "confident": 1.0, "confidence": 1.0,
    "opportunity": 0.5, "opportunities": 0.5,
}

_NEGATIVE: dict[str, float] = {
    "miss": 2.0, "misses": 2.0, "missed": 2.0,  # stored positive; sign applied below
    "plunge": 2.0, "plunges": 2.0, "plunged": 2.0,
    "tumble": 2.0, "tumbles": 2.0, "tumbled": 2.0,
    "crash": 2.5, "crashes": 2.5, "crashed": 2.5,
    "drop": 1.5, "drops": 1.5, "dropped": 1.5, "dropping": 1.5,
    "fall": 1.5, "falls": 1.5, "fell": 1.5, "falling": 1.5,
    "decline": 1.5, "declines": 1.5, "declined": 1.5,
    "slide": 1.5, "slides": 1.5, "slid": 1.5,
    "sink": 1.5, "sinks": 1.5, "sank": 1.5, "sinking": 1.5,
    "slump": 2.0, "slumps": 2.0, "slumped": 2.0,
    "retreat": 1.0, "retreats": 1.0, "retreated": 1.0,
    "downgrade": 1.5, "downgrades": 1.5, "downgraded": 1.5,
    "underperform": 1.5, "underperforms": 1.5, "underperformed": 1.5,
    "loss": 1.5, "losses": 1.5, "lost": 1.0, "loses": 1.0,
    "selloff": 1.5,
    "bearish": 1.5, "negative": 1.5,
    "lower": 1.0, "lowers": 1.0, "lowered": 1.0, "lowering": 1.0,
    "cut": 1.0, "cuts": 1.0, "cutting": 1.0,
    "weak": 1.5, "weaker": 1.5, "weakness": 1.5,
    "warn": 1.0, "warns": 1.0, "warned": 1.0, "warning": 1.0,
    "caution": 1.0, "cautions": 1.0, "cautioned": 1.0, "cautious": 1.0,
    "risk": 0.5, "risks": 0.5, "risky": 1.0,
    "lawsuit": 1.5, "lawsuits": 1.5, "sued": 1.5, "sues": 1.0,
    "probe": 1.0, "probes": 1.0, "probed": 1.0,
    "investigation": 1.0, "investigate": 1.0, "investigated": 1.0,
    "fraud": 2.0, "scandal": 2.0, "settlement": 0.5,
    "recall": 1.5, "recalls": 1.5, "recalled": 1.5,
    "delay": 1.0, "delays": 1.0, "delayed": 1.0,
    "postpone": 1.0, "postpones": 1.0, "postponed": 1.0,
    "suspend": 1.5, "suspends": 1.5, "suspended": 1.5,
    "halt": 1.5, "halts": 1.5, "halted": 1.5,
    "bankrupt": 2.5, "bankruptcy": 2.5,
    "default": 2.0, "defaults": 2.0, "defaulted": 2.0,
    "layoff": 1.5, "layoffs": 1.5,
    "resign": 1.0, "resigns": 1.0, "resigned": 1.0, "resignation": 1.0,
    "worst": 1.5, "worse": 1.0, "bad": 1.0, "poor": 1.0,
    "fail": 1.5, "fails": 1.5, "failed": 1.5, "failure": 1.5,
    "struggle": 1.0, "struggles": 1.0, "struggled": 1.0, "struggling": 1.0,
    "trouble": 1.0, "troubles": 1.0, "troubled": 1.0,
    "shortfall": 1.5, "shortfalls": 1.5,
    "recession": 1.5, "downturn": 1.5, "inflation": 0.5,
    "volatile": 0.5, "volatility": 0.5, "unstable": 1.0, "uncertainty": 1.0,
    "concern": 0.5, "concerns": 0.5, "concerning": 0.5,
    "worry": 0.5, "worries": 0.5, "worried": 1.0, "fear": 0.5, "fears": 0.5,
    "penalty": 1.0, "penalties": 1.0, "fined": 1.5, "ban": 1.0, "banned": 1.5,
    "violation": 1.0, "violations": 1.0, "complaint": 0.5, "complaints": 0.5,
    "overvalued": 1.0, "bubble": 1.5,
    "disappoint": 1.5, "disappoints": 1.5, "disappointed": 1.5, "disappointing": 1.5,
    "pressure": 0.5, "pressured": 1.0, "strain": 0.5,
    "withdraw": 1.0, "withdraws": 1.0, "withdrew": 1.0, "withdrawal": 1.0,
}

_AMPLIFIERS = {
    "strongly": 1.6, "sharply": 1.6, "significantly": 1.4, "massively": 1.6,
    "hugely": 1.6, "substantially": 1.3, "record": 1.3, "very": 1.2,
    "extremely": 1.5, "rapidly": 1.2, "steeply": 1.5, "dramatically": 1.4,
    "considerably": 1.3, "slightly": 0.6, "modestly": 0.6,
}

# True negation markers only. Contrastive conjunctions ("but", "however",
# "despite", "yet") are deliberately NOT here: they shift emphasis rather than
# flip polarity, and treating them as negators would mis-score headlines like
# "rises but misses estimates" as bullish. (Apostrophes are preserved by the
# tokenizer, so only contracted forms like "won't" can ever match.)
_NEGATIONS = {
    "not", "no", "never", "nor", "neither", "without", "unlikely",
    "cannot", "won't", "wasn't", "isn't", "aren't", "don't", "doesn't",
    "didn't",
}

_TOKEN_RE = re.compile(r"[a-z0-9']+")
_WEIGHTS = {**_POSITIVE, **_NEGATIVE}
_LABEL_THRESHOLD = 0.15


def _tokens(text: str) -> list[str]:
    return _TOKEN_RE.findall(text.lower())


def score_text(text: str) -> float:
    """Score a single headline/body string to a float in [-1, 1]."""
    toks = _tokens(text or "")
    if not toks:
        return 0.0

    raw = 0.0
    hits = 0
    for i, tok in enumerate(toks):
        weight = _WEIGHTS.get(tok)
        if weight is None:
            continue
        hits += 1
        sign = -1.0 if tok in _NEGATIVE else 1.0
        # Odd number of negations in the previous two tokens flips the sign.
        window = toks[max(0, i - 2):i]
        if sum(1 for w in window if w in _NEGATIONS) % 2 == 1:
            sign = -sign
        # Amplifier directly before the term scales its weight.
        amp = _AMPLIFIERS.get(toks[i - 1]) if i > 0 else None
        raw += sign * weight * (amp or 1.0)

    if hits == 0:
        return 0.0
    return max(-1.0, min(1.0, raw / (hits + 1)))


def _label(score: float) -> str:
    if score >= _LABEL_THRESHOLD:
        return "Bullish"
    if score <= -_LABEL_THRESHOLD:
        return "Bearish"
    return "Neutral"


def score_news(items: list[dict]) -> dict:
    """Attach per-item sentiment and return an aggregate summary.

    `items` are the news dicts from `market.get_news`; each gets a
    `sentiment: {score, label}` field (None when no headline text). The
    returned summary has the mean score, its label, and per-label counts.
    """
    scored = []
    for item in items:
        text = " ".join(
            t for t in (item.get("title"), item.get("summary")) if t
        )
        if not text:
            scored.append((item, 0.0, False))
            continue
        score = score_text(text)
        # Shallow-copy so the cache-held dicts (returned by market.get_news)
        # are never mutated.
        scored_item = dict(item)
        scored_item["sentiment"] = {"score": round(score, 3), "label": _label(score)}
        scored.append((scored_item, score, True))

    rated = [s for _, s, ok in scored if ok]
    mean = sum(rated) / len(rated) if rated else 0.0
    counts = {"bullish": 0, "neutral": 0, "bearish": 0}
    for _, s, ok in scored:
        if not ok:
            continue
        counts[_label(s).lower()] += 1

    return {
        "items": [item for item, _, _ in scored],
        "summary": {
            "score": round(mean, 3),
            "label": _label(mean),
            "counts": counts,
            "scored": len(rated),
        },
    }
