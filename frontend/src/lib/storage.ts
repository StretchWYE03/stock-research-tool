// Everything here lives in the browser's localStorage; it never leaves this
// machine and is never sent to any server. No accounts, no personal data.

const WATCHLIST_KEY = "ticker.watchlist.v1";
const PAPER_KEY = "ticker.paper.v1";

export function getWatchlist(): string[] {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    const list = raw ? (JSON.parse(raw) as string[]) : [];
    return [...new Set(list.filter((s) => typeof s === "string" && s.length > 0))];
  } catch {
    return [];
  }
}

export function addToWatchlist(symbol: string): string[] {
  const next = [...getWatchlist(), symbol.toUpperCase()];
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify([...new Set(next)]));
  return [...new Set(next)];
}

export function removeFromWatchlist(symbol: string): string[] {
  const next = getWatchlist().filter((s) => s !== symbol.toUpperCase());
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
  return next;
}

export function isWatchlisted(symbol: string): boolean {
  return getWatchlist().includes(symbol.toUpperCase());
}

export interface Position {
  symbol: string;
  name: string;
  shares: number;
  avgCost: number;
  openedAt: number;
}

export interface Trade {
  id: string;
  symbol: string;
  name: string;
  side: "BUY" | "SELL";
  shares: number;
  price: number;
  at: number;
}

export interface Portfolio {
  cash: number;
  positions: Position[];
  history: Trade[];
}

const STARTING_CASH = 100_000;

export function getPortfolio(): Portfolio {
  try {
    const raw = localStorage.getItem(PAPER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Portfolio>;
      // Defensive: a stale or hand-edited payload must never crash the page.
      const cash = parsed.cash;
      if (
        parsed &&
        typeof cash === "number" &&
        Number.isFinite(cash) &&
        cash >= 0 &&
        Array.isArray(parsed.positions) &&
        Array.isArray(parsed.history)
      ) {
        return {
          cash,
          positions: parsed.positions.filter(
            (p): p is Position =>
              !!p &&
              typeof p.symbol === "string" &&
              Number.isFinite(p.shares) &&
              Number.isFinite(p.avgCost)
          ),
          history: parsed.history.filter(
            (t): t is Trade =>
              !!t &&
              typeof t.symbol === "string" &&
              Number.isFinite(t.shares) &&
              Number.isFinite(t.price)
          ),
        };
      }
    }
  } catch {
    /* fall through to fresh portfolio */
  }
  return { cash: STARTING_CASH, positions: [], history: [] };
}

/**
 * Re-read the portfolio when it changes in another tab (localStorage `storage`
 * event). Lets two open tabs stay in sync without any server involvement.
 */
export function onPortfolioChange(cb: () => void): () => void {
  const handler = (e: StorageEvent) => {
    if (e.key === PAPER_KEY) cb();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

function savePortfolio(p: Portfolio) {
  localStorage.setItem(PAPER_KEY, JSON.stringify(p));
}

export function tradeStock(symbol: string, name: string, side: "BUY" | "SELL", sharesRequested: number, price: number): Portfolio {
  const p = getPortfolio();
  const shares = Math.floor(sharesRequested);
  if (shares <= 0) return p;
  const cost = shares * price;
  const existing = p.positions.find((pos) => pos.symbol === symbol);

  if (side === "BUY") {
    if (cost > p.cash) return p;
    p.cash -= cost;
    if (existing) {
      existing.avgCost = (existing.avgCost * existing.shares + cost) / (existing.shares + shares);
      existing.shares += shares;
    } else {
      p.positions.push({ symbol, name, shares, avgCost: price, openedAt: Date.now() });
    }
  } else {
    if (!existing || shares > existing.shares) return p;
    p.cash += cost;
    existing.shares -= shares;
    if (existing.shares === 0) {
      p.positions = p.positions.filter((pos) => pos.symbol !== symbol);
    }
  }

  p.history.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    symbol,
    name,
    side,
    shares,
    price,
    at: Date.now(),
  });
  savePortfolio(p);
  return p;
}

export function resetPortfolio(): Portfolio {
  const fresh = { cash: STARTING_CASH, positions: [], history: [] };
  savePortfolio(fresh);
  return fresh;
}
