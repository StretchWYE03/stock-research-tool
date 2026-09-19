# Ticker - Stock Research Terminal

A **local, privacy-safe stock research tool** for US & Canadian equities. No
accounts, no API keys, no personal data, no banking: just free public market
data (Yahoo Finance's public JSON endpoints) served through a small local
backend and a React dashboard.

> Research and education only. Recommendations are rules-based outputs, not
> investment advice. First-time users must accept a legal disclaimer before
> using the app (a link to the full disclaimer is always first in the sidebar).

## Screenshots

Every page, in both themes. Click to view full size.

| Page | Light | Dark |
| --- | --- | --- |
| Market dashboard | [light](docs/screenshots/dashboard-light.png) | [dark](docs/screenshots/dashboard-dark.png) |
| Screener + natural-language search | [light](docs/screenshots/screener-light.png) | [dark](docs/screenshots/screener-dark.png) |
| Backtester | [light](docs/screenshots/backtest-light.png) | [dark](docs/screenshots/backtest-dark.png) |
| Paper trading | [light](docs/screenshots/paper-light.png) | [dark](docs/screenshots/paper-dark.png) |
| Watchlist | [light](docs/screenshots/watchlist-light.png) | [dark](docs/screenshots/watchlist-dark.png) |
| Learn | [light](docs/screenshots/learn-light.png) | [dark](docs/screenshots/learn-dark.png) |
| Stock page (Score tab + similar stocks) | [light](docs/screenshots/stock-light.png) | [dark](docs/screenshots/stock-dark.png) |
| Disclaimer | [light](docs/screenshots/disclaimer-light.png) | [dark](docs/screenshots/disclaimer-dark.png) |

## Features

- **Market dashboard**: live index cards (S&P 500, Nasdaq, Dow, TSX, VIX), a
  scrolling ticker tape, universe breadth, and top gainers / losers / most
  active across a ~120-symbol US + Canada universe.
- **Stock pages**: candlestick charts with SMA 50/200 overlays and volume,
  1D-5Y ranges, crosshair tooltips, fundamentals, news, and option chains
  (IV, OI, greeks).
- **Recommendation scores**: a transparent 0-100 composite from 11 technical +
  fundamental signals (trend, momentum, RSI, MACD, valuation, growth,
  profitability, balance sheet, dividend) mapped to Strong Buy → Strong Sell.
- **Screener**: filters and sorts the whole universe by score, sector, country,
  market cap and day change.
- **Natural-language screener**: "ask in plain English" on the Screener page:
  type "large-cap tech that's oversold" or "high dividend Canadian banks" and
  a rule-based parser (no LLM) turns it into real filters, shown as removable
  chips before the results run.
- **Backtester**: SMA crossover, RSI mean-reversion, and trend-following
  strategies vs buy-and-hold, with equity curves, drawdown, and trade logs.
- **Symbol autocomplete**: the Backtest and Paper Trading symbol fields
  suggest matching tickers (name + exchange) as you type, so beginners can
  find stocks without knowing the exact symbol.
- **Paper trading**: a simulated $100k portfolio that fills at real market
  prices. Watchlist and portfolio live **only in your browser's localStorage**
  and **persist across reloads and restarts** (they even stay in sync across
  open tabs).
- **Beginner research tools**: an "In Plain English" explainer and risk
  snapshot on every stock, hover tooltips that decode each signal and
  fundamental, and a Learn page with 9 plain-English guides.
- **News sentiment**: each headline is scored Bullish / Neutral / Bearish by
  a local finance lexicon (no ML, no external calls), with an aggregate
  reading at the top of the News tab.
- **Similar stocks**: on every Score tab, the closest fundamental matches
  across the universe (valuation, growth, margins, leverage, dividend,
  volatility, size), clustered locally with numpy and explained per match
  ("closest on P/E, margin, market cap").
- **Light & dark themes**: a light theme (white, navy / light-blue / light-
  purple accents) plus the original dark terminal look, toggled from the
  topbar and remembered in your browser.
- **Rate limiting everywhere**: a global guard plus per-route buckets protect
  the free upstream data source (429s return `Retry-After`).

## Architecture

```
stock-research/
  backend/   FastAPI (Python): Yahoo data proxy, cache, scoring, backtesting
  frontend/  React + Vite + TypeScript: Recharts, custom SVG candlesticks
```

### Data & privacy

- Data source: Yahoo Finance public endpoints via `httpx` with a browser
  User-Agent. Free, no key, no ToS-breaking scraping: quotes, history,
  fundamentals (`quoteSummary` + crumb), news, options.
- The backend caches everything in-memory (30s-6h TTLs) to stay well under
  rate limits.
- **Nothing about you is stored server-side.** The backend has no database, no
  auth, and logs only request lines. Watchlists and the paper portfolio never
  leave your machine.
- Equities only: crypto, NFTs, and funds are filtered out of search.

## Getting started

Prerequisites: Python 3.11+ and Node 20+.

```bash
# 1. Backend
cd backend
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt   # Windows
# .venv/bin/pip install -r requirements.txt     # macOS / Linux
.venv/Scripts/python run.py                     # serves http://127.0.0.1:8000

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev                                     # serves http://localhost:5173
```

Open http://localhost:5173. The Vite dev server proxies `/api` to the backend.

> First screener run scores the whole universe and can take a minute while the
> backend warms its cache; afterwards it's instant. Options and fundamentals
> are also cached (15 min / 6 h).

### Run without the Vite dev server

Once `frontend/dist` exists (any `npm run build`), the backend serves the app
from the same origin, so no dev server is needed:

```bash
cd backend
.venv/Scripts/python desktop.py --no-window   # serves http://127.0.0.1:8765
```

## Desktop app (Windows)

`Ticker.exe` is a self-contained desktop app: the FastAPI server runs in a
background thread and a native window (Edge WebView2, no browser chrome) points
at it. Closing the window shuts the server down. It binds 127.0.0.1 only, so
nothing on your network can reach it.

### Build

Prerequisites: the backend venv from Getting started, Node, and a built
frontend (the script builds it for you anyway).

```bat
scripts\build_desktop.bat
```

Output: `dist\Ticker\Ticker.exe` (~90 MB folder, pandas/numpy included).

### Run

Double-click `dist\Ticker\Ticker.exe`, or from a terminal:

```
dist\Ticker\Ticker.exe
```

The first run may show a Windows SmartScreen prompt (the exe is unsigned);
choose More info then Run anyway. It opens on the first free port at or above
8765, so it never clashes with a running instance. Paper trading and watchlist
persist in the app's WebView profile, exactly like the browser version.

Close the window to quit. If you ever need to force-quit, use Task Manager or
`taskkill /IM Ticker.exe /F` (killing a single Ticker process can leave the
server up, because the app runs as a parent and child pair).

Headless mode for tests and scripting:

```
dist\Ticker\Ticker.exe --no-window --port 8765
```

## API surface (all rate-limited)

| Endpoint | Notes |
| --- | --- |
| `GET /api/health` | service check |
| `GET /api/market/overview` | indices + movers + breadth |
| `GET /api/search?q=` | US/CA equity symbol search |
| `GET /api/stocks/{sym}/quote` | live quote (30s cache) |
| `GET /api/stocks/{sym}/history?period=` | OHLCV, split-adjusted |
| `GET /api/stocks/{sym}/score` | recommendation score + signals |
| `GET /api/stocks/{sym}/info` | fundamentals (6h cache) |
| `GET /api/stocks/{sym}/news` | recent headlines + lexicon-based sentiment per item and in aggregate |
| `GET /api/stocks/{sym}/options` | chains with IV & greeks |
| `GET /api/stocks/{sym}/similar` | closest fundamental matches across the universe |
| `GET /api/screener/screen` | score/filter the universe (also market-cap, dividend-yield and RSI filters) |
| `GET /api/screener/explain?q=` | turn a plain-English query into screener filters |
| `GET /api/backtest/{sym}` | strategy backtests |

Run `backend/smoke_test.py` to exercise every endpoint end-to-end.

## Roadmap: free, privacy-safe AI features

All planned features run **locally or on-device** (no paid APIs, no data
leaving the machine):

1. **Extractive news summaries**: a TextRank-style sentence scorer compresses
   each article to 2-3 sentences, still fully local.
2. **Optional local LLM (Ollama)**: behind a settings toggle, route an
   "explain this stock" prompt to a self-hosted model; zero cost, zero data
   egress (skipped automatically when no local model is running).

## Docs

- [`EULA.md`](EULA.md): end-user license agreement
- [`PRIVACY.md`](PRIVACY.md): privacy policy (we collect nothing about you)
- [`LICENSE`](LICENSE): MIT
- **Disclaimer**: full legal disclaimer is built into the app (first item in
  the sidebar) and must be accepted before first use.

## Notes

- Market data is delayed/free-tier Yahoo data: fine for research, not for
  live trading decisions.
- Canada tickers use Yahoo's `.TO` suffix (e.g. `RY.TO`); Canadian prices are
  shown in CAD.
