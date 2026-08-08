"""Smoke test hitting real endpoints via FastAPI TestClient (real Yahoo data)."""

import json
import sys

# Chip labels contain non-ASCII (≤/≥); force UTF-8 so the console prints don't
# crash on Windows' default cp1252 encoding.
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)
results = []


def check(name: str, response, required_key=None):
    ok = response.status_code == 200
    if ok and required_key:
        body = response.json()
        ok = required_key in body and body[required_key]
    results.append((name, ok, response.status_code))
    if not ok:
        print(f"  FAIL {name} -> {response.status_code}: {response.text[:200]}")


print("1. health")
check("health", client.get("/api/health"), "status")

print("2. market/overview")
r = client.get("/api/market/overview")
check("overview", r, "indices")
if r.status_code == 200:
    body = r.json()
    print(f"   indices: {len(body['indices'])} | gainers: {len(body['movers']['gainers'])}")

print("3. quote AAPL")
r = client.get("/api/stocks/AAPL/quote")
check("quote", r, "price")

print("4. history AAPL 1y")
r = client.get("/api/stocks/AAPL/history?period=1y")
check("history", r, "bars")
if r.status_code == 200:
    print(f"   bars: {len(r.json()['bars'])}")

print("5. score AAPL")
r = client.get("/api/stocks/AAPL/score")
check("score", r, "composite")
if r.status_code == 200:
    s = r.json()
    print(f"   rating={s['rating_label']} composite={s['composite']} signals={len(s['signals'])}")

print("6. search 'royal bank'")
r = client.get("/api/search?q=royal%20bank")
check("search", r, "results")
if r.status_code == 200:
    print(f"   results: {[x['symbol'] for x in r.json()['results'][:5]]}")

print("7. news AAPL")
r = client.get("/api/stocks/AAPL/news")
check("news", r, "items")
if r.status_code == 200:
    body = r.json()
    items = body["items"]
    print(f"   items: {len(items)}")
    print(f"   sentiment: {body.get('sentiment', {}).get('label')} (score {body.get('sentiment', {}).get('score')}) | per-item: {sum(1 for x in items if x.get('sentiment'))} scored")
check("news-sentiment", r, "sentiment")

print("7b. similar AAPL")
r = client.get("/api/stocks/AAPL/similar")
check("similar", r, "similar")
if r.status_code == 200:
    sim = r.json()["similar"]
    print(f"   neighbours: {len(sim)} | top: {[(s['symbol'], s['similarity']) for s in sim[:3]]} | cluster: {r.json().get('cluster')}")

print("7c. similar CMG (non-universe symbol)")
r = client.get("/api/stocks/CMG/similar")
check("similar-nonuniverse", r, "similar")
if r.status_code == 200:
    sim = r.json()["similar"]
    print(f"   neighbours: {len(sim)} | top: {[(s['symbol'], s['similarity']) for s in sim[:2]]} | cluster: {r.json().get('cluster')}")

print("8. options AAPL")
r = client.get("/api/stocks/AAPL/options")
check("options", r, "expirations")
if r.status_code == 200:
    o = r.json()
    print(f"   expirations: {o['expirations'][:3]} | chains: {len(o['chains'])} | calls: {len(o['chains'][0]['calls'])}")

print("9. backtest AAPL sma_cross 1y")
r = client.get("/api/backtest/AAPL?strategy=sma_cross&period=1y")
check("backtest", r, "metrics")
if r.status_code == 200:
    m = r.json()["metrics"]
    print(f"   strategy={m['strategy']['total_return_pct']}% bench={m['benchmark']['total_return_pct']}% trades={m['strategy']['num_trades']}")

print("9b. screener explain (NL parser)")
r = client.get("/api/screener/explain", params={"q": "large-cap tech that is oversold"})
check("explain", r, "filters")
if r.status_code == 200:
    e = r.json()
    f = e["filters"]
    print(f"   matched={e['matched']} sector={f['sector']} min_cap={f['min_market_cap']} oversold={f['oversold']} chips={[c['label'] for c in e['chips']]}")

print("10. screener (first run warms caches, may be slow)")
r = client.get("/api/screener/screen?min_score=45&limit=10&sort=composite")
check("screener", r, "results")
if r.status_code == 200:
    scr = r.json()
    print(f"   count={scr['count']} | top: {[(x['symbol'], x['rating_label'], x['composite']) for x in scr['results'][:5]]}")

print("10b. screener with NL filters (CA financials, dividend >= 3%)")
r = client.get(
    "/api/screener/screen",
    params={"sector": "Financials", "country": "CA", "min_dividend_yield": 3, "limit": 10},
)
check("screener-filters", r, "results")
if r.status_code == 200:
    scr = r.json()
    print(f"   count={scr['count']} | top: {[(x['symbol'], round((x['dividend_yield'] or 0) * 100, 1)) for x in scr['results'][:5]]}")

print("10c. screener oversold filter (every row must have RSI <= 30)")
r = client.get("/api/screener/screen", params={"oversold": "true", "limit": 10})
check("screener-oversold", r, "results")
if r.status_code == 200:
    rows = r.json()["results"]
    ok = all(x["rsi"] is not None and x["rsi"] <= 30 for x in rows)
    print(f"   rows={len(rows)} all_rsi_le_30={ok} | {[(x['symbol'], x['rsi']) for x in rows[:5]]}")
    if not ok:
        results[-1] = ("screener-oversold", False, 200)

print("11. rate limit 429 check (search bucket)")
client.get("/api/search?q=test")  # warm
statuses = []
for _ in range(35):
    statuses.append(client.get("/api/search?q=test").status_code)
print(f"   statuses: {sorted(set(statuses))}")
results.append(("ratelimit-429", 429 in statuses, 429))

print("\n=== SUMMARY ===")
failed = [r for r in results if not r[1]]
for name, ok, code in results:
    print(f"  {'PASS' if ok else 'FAIL'} {name} ({code})")
sys.exit(1 if failed else 0)
