import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Quote } from "../api/types";
import { EmptyState, SectionTitle, StatCard } from "../components/ui";
import ConfirmDialog from "../components/ConfirmDialog";
import { MinusIcon, PlusIcon, TrashIcon } from "../components/Icons";
import SymbolInput from "../components/SymbolInput";
import { fmtMoney, fmtPct, timeAgo } from "../lib/format";
import { getPortfolio, onPortfolioChange, resetPortfolio, tradeStock, type Portfolio } from "../lib/storage";

export default function Paper() {
  const [portfolio, setPortfolio] = useState<Portfolio>(getPortfolio());
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [currencies, setCurrencies] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Buy-new form state
  const [newSymbol, setNewSymbol] = useState("");
  const [newShares, setNewShares] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  const refreshQuotes = useCallback(async () => {
    const symbols = portfolio.positions.map((p) => p.symbol);
    if (symbols.length === 0) return;
    setLoading(true);
    const results = await Promise.allSettled(
      symbols.map((s) => api.get<Quote>(`/stocks/${encodeURIComponent(s)}/quote`))
    );
    const next: Record<string, number> = {};
    const cur: Record<string, string> = {};
    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        next[symbols[i]] = r.value.data.price;
        cur[symbols[i]] = r.value.data.currency || "USD";
      }
    });
    setPrices(next);
    setCurrencies(cur);
    setLoading(false);
  }, [portfolio.positions]);

  useEffect(() => {
    refreshQuotes();
  }, [refreshQuotes]);

  // Keep two open tabs in sync; re-read the saved portfolio when it changes
  // in another tab (localStorage `storage` event).
  useEffect(() => onPortfolioChange(() => setPortfolio(getPortfolio())), []);

  const lookupQuote = async (symbol: string) => {
    try {
      const { data } = await api.get<Quote>(`/stocks/${encodeURIComponent(symbol)}/quote`);
      setQuote(data);
      setCurrencies((c) => ({ ...c, [symbol]: data.currency || "USD" }));
      return data;
    } catch {
      setQuote(null);
      return null;
    }
  };

  const execute = (symbol: string, name: string, side: "BUY" | "SELL", shares: number, price: number) => {
    setPortfolio(tradeStock(symbol, name, side, shares, price));
    setQuote(null);
    setNewShares("");
    setNewSymbol("");
  };

  const buyNew = async () => {
    const symbol = newSymbol.trim().toUpperCase();
    const shares = Number(newShares);
    if (!symbol || !shares || shares <= 0) return;
    const q = quote?.symbol === symbol ? quote : await lookupQuote(symbol);
    if (!q?.price) return;
    execute(symbol, q.name || symbol, "BUY", shares, q.price);
  };

  const totalValue = useMemo(() => {
    let sum = portfolio.cash;
    for (const pos of portfolio.positions) {
      const price = prices[pos.symbol] ?? pos.avgCost;
      sum += price * pos.shares;
    }
    return sum;
  }, [portfolio, prices]);

  const invested = useMemo(
    () => portfolio.positions.reduce((sum, p) => sum + p.shares * p.avgCost, 0),
    [portfolio]
  );

  const unrealized = useMemo(() => {
    let sum = 0;
    for (const pos of portfolio.positions) {
      const price = prices[pos.symbol] ?? pos.avgCost;
      sum += (price - pos.avgCost) * pos.shares;
    }
    return sum;
  }, [portfolio, prices]);

  const totalPnl = totalValue - 100_000;

  return (
    <div className="page page-reveal">
      <div className="page-head">
        <div>
          <h1 className="page-title">Paper Trading</h1>
          <p className="page-sub">Simulated portfolio with $100,000 starting cash · stored only in this browser · no real money</p>
        </div>
        <div className="page-actions">
          <span className="saved-note" title="Your portfolio autosaves to this browser and survives reloads and restarts.">
            ✓ Saved locally
          </span>
          <button className="btn btn-danger-ghost" onClick={() => setResetOpen(true)}>
            <TrashIcon size={14} /> Reset
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={resetOpen}
        title="Reset paper account?"
        message="This clears all positions and trade history and restores the $100,000 starting cash. This can't be undone."
        confirmLabel="Reset"
        cancelLabel="Keep account"
        onConfirm={() => {
          setPortfolio(resetPortfolio());
          setResetOpen(false);
        }}
        onCancel={() => setResetOpen(false)}
      />

      <div className="grid metrics-grid">
        <StatCard label="Total equity" value={totalValue} prefix="$" countUp accent="brand" />
        <StatCard label="Cash" value={portfolio.cash} prefix="$" countUp accent="neutral" />
        <StatCard label="Invested" value={invested} prefix="$" countUp accent="neutral" />
        <StatCard label="Unrealized P&L" value={unrealized} prefix="$" countUp accent={unrealized >= 0 ? "up" : "down"} />
        <StatCard label="Total P&L" value={totalPnl} prefix="$" countUp accent={totalPnl >= 0 ? "up" : "down"} />
        <StatCard label="Positions" value={portfolio.positions.length} decimals={0} accent="neutral" />
      </div>

      <div className="panel">
        <SectionTitle hint="fills at latest market price">Buy a New Position</SectionTitle>
        <div className="trade-form">
          <SymbolInput
            value={newSymbol}
            onChange={(v) => setNewSymbol(v.toUpperCase())}
            onSelect={(s) => {
              setNewSymbol(s.toUpperCase());
              lookupQuote(s);
            }}
            onBlurValue={(v) => v && lookupQuote(v)}
            placeholder="Symbol (e.g. NVDA)"
            ariaLabel="Symbol"
          />
          <input
            className="mono num-input"
            placeholder="Shares"
            type="number"
            min={1}
            value={newShares}
            onChange={(e) => setNewShares(e.target.value)}
          />
          <div className="trade-price mono">
            {quote?.symbol === newSymbol.trim().toUpperCase() && quote.price
              ? `@ ${fmtMoney(quote.price, quote.currency)}`
              : "price auto-fills"}
          </div>
          <button
            className="btn btn-primary"
            disabled={!quote?.price || Number(newShares) <= 0 || Number(newShares) * quote.price > portfolio.cash}
            onClick={buyNew}
          >
            <PlusIcon size={15} /> Buy
          </button>
        </div>
      </div>

      <div className="panel">
        <SectionTitle hint={loading ? "updating…" : "live mark-to-market"}>Positions</SectionTitle>
        {portfolio.positions.length === 0 ? (
          <EmptyState title="No positions yet" body="Buy a simulated position above; prices come from real market data." />
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Name</th>
                  <th>Shares</th>
                  <th>Avg cost</th>
                  <th>Last</th>
                  <th>Market value</th>
                  <th>Unrealized</th>
                  <th>Trade</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.positions.map((pos) => {
                  const price = prices[pos.symbol] ?? pos.avgCost;
                  const value = price * pos.shares;
                  const pnl = (price - pos.avgCost) * pos.shares;
                  const pnlPct = pos.avgCost ? (price / pos.avgCost - 1) * 100 : 0;
                  const cur = currencies[pos.symbol] || "USD";
                  return (
                    <tr key={pos.symbol}>
                      <td>
                        <Link to={`/stock/${encodeURIComponent(pos.symbol)}`} className="table-link mono">
                          {pos.symbol}
                        </Link>
                      </td>
                      <td className="table-name">{pos.name}</td>
                      <td className="mono">{pos.shares}</td>
                      <td className="mono">{fmtMoney(pos.avgCost, cur)}</td>
                      <td className="mono">{fmtMoney(price, cur)}</td>
                      <td className="mono">{fmtMoney(value, cur)}</td>
                      <td className={`mono ${pnl >= 0 ? "up" : "down"}`}>
                        {fmtMoney(pnl, cur)} <span className="dim">({fmtPct(pnlPct, true)})</span>
                      </td>
                      <td>
                        <TradeButtons
                          symbol={pos.symbol}
                          price={price}
                          onTrade={(side, shares, px) => execute(pos.symbol, pos.name, side, shares, px)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel">
        <SectionTitle>Trade History</SectionTitle>
        {portfolio.history.length === 0 ? (
          <EmptyState title="No trades yet" />
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Side</th>
                  <th>Symbol</th>
                  <th>Shares</th>
                  <th>Price</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.history.slice(0, 50).map((t) => (
                  <tr key={t.id}>
                    <td className="mono dim">{timeAgo(t.at)}</td>
                    <td>
                      <span className={`pill pill-${t.side === "BUY" ? "up" : "down"}`}>{t.side}</span>
                    </td>
                    <td className="mono">{t.symbol}</td>
                    <td className="mono">{t.shares}</td>
                    <td className="mono">{fmtMoney(t.price, currencies[t.symbol] || "USD")}</td>
                    <td className="mono">{fmtMoney(t.price * t.shares, currencies[t.symbol] || "USD")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function TradeButtons({ symbol, price, onTrade }: { symbol: string; price: number; onTrade: (side: "BUY" | "SELL", shares: number, price: number) => void }) {
  const [shares, setShares] = useState("");
  return (
    <div className="trade-buttons">
      <input
        className="mono mini-input"
        placeholder="shares"
        type="number"
        min={1}
        value={shares}
        onChange={(e) => setShares(e.target.value)}
      />
      <button className="btn btn-xs btn-up" onClick={() => onTrade("BUY", Number(shares) || 0, price)} title={`Buy ${symbol}`}>
        <PlusIcon size={12} />
      </button>
      <button className="btn btn-xs btn-down" onClick={() => onTrade("SELL", Number(shares) || 0, price)} title={`Sell ${symbol}`}>
        <MinusIcon size={12} />
      </button>
    </div>
  );
}
