import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Quote, Score } from "../api/types";
import { ErrorNote, EmptyState, Loading } from "../components/ui";
import RatingBadge from "../components/RatingBadge";
import Sparkline from "../components/Sparkline";
import { StarIcon, TrashIcon } from "../components/Icons";
import { fmtMoney, fmtPct } from "../lib/format";
import { getWatchlist, removeFromWatchlist } from "../lib/storage";

interface WatchRow {
  quote: Quote | null;
  score: Score | null;
  spark: number[];
}

export default function Watchlist() {
  const [symbols, setSymbols] = useState<string[]>(getWatchlist());
  const [rows, setRows] = useState<Record<string, WatchRow>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (symbols.length === 0) return;
    setLoading(true);
    setError(null);
    const results = await Promise.allSettled(
      symbols.slice(0, 20).map(async (symbol) => {
        const [q, s, h] = await Promise.all([
          api.get<Quote>(`/stocks/${encodeURIComponent(symbol)}/quote`),
          api.get<Score>(`/stocks/${encodeURIComponent(symbol)}/score`),
          api.get<{ bars: { c: number }[] }>(`/stocks/${encodeURIComponent(symbol)}/history?period=1mo`),
        ]);
        return {
          symbol,
          quote: q.data,
          score: s.data,
          spark: h.data.bars.map((b) => b.c).slice(-40),
        };
      })
    );
    const next: Record<string, WatchRow> = {};
    results.forEach((r) => {
      if (r.status === "fulfilled") {
        next[r.value.symbol] = { quote: r.value.quote, score: r.value.score, spark: r.value.spark };
      }
    });
    setRows(next);
    setLoading(false);
  }, [symbols]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = (symbol: string) => {
    setSymbols(removeFromWatchlist(symbol));
    setRows((r) => {
      const next = { ...r };
      delete next[symbol];
      return next;
    });
  };

  if (symbols.length === 0) {
    return (
      <div className="page page-reveal">
        <div className="page-head">
          <div>
            <h1 className="page-title">Watchlist</h1>
            <p className="page-sub">Saved only in this browser; never sent anywhere.</p>
          </div>
        </div>
        <div className="panel">
          <EmptyState
            title="Your watchlist is empty"
            body="Search any US or Canadian ticker above and open it to add it to your watchlist."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page page-reveal">
      <div className="page-head">
        <div>
          <h1 className="page-title">Watchlist</h1>
          <p className="page-sub">{symbols.length} symbol{symbols.length > 1 ? "s" : ""} · stored in localStorage only</p>
        </div>
        <button className="btn btn-ghost" onClick={load} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error && <ErrorNote message={error} onRetry={load} />}
      {loading && symbols.length > 0 && <Loading label="Loading quotes" />}

      <div className="panel watch-panel">
        <div className="watch-head">
          <span>Symbol</span>
          <span>Rating</span>
          <span>Trend · 1M</span>
          <span>Price</span>
          <span>Change</span>
          <span />
        </div>
        <div className="watch-list">
          {symbols.map((symbol) => {
            const row = rows[symbol];
            const quote = row?.quote;
            const score = row?.score;
            const up = (quote?.change_pct ?? 0) >= 0;
            return (
              <div key={symbol} className={`watch-row ${quote ? "" : "watch-row-missing"}`}>
                <Link to={`/stock/${encodeURIComponent(symbol)}`} className="watch-main">
                  <div className="watch-symbol">
                    <span className="mono watch-symbol-code">{symbol}</span>
                    <span className="watch-symbol-name">{quote?.name ?? "…"}</span>
                  </div>
                </Link>
                <div className="watch-rating">{score ? <RatingBadge rating={score.rating} label={score.rating_label} size="sm" /> : <span className="dim">…</span>}</div>
                <div className="watch-spark">
                  {row?.spark && row.spark.length > 1 ? (
                    <Sparkline data={row.spark} color={up ? "#17C784" : "#F6465D"} width={110} height={30} />
                  ) : (
                    <span className="dim">-</span>
                  )}
                </div>
                <div className="mono watch-price">{quote ? fmtMoney(quote.price, quote.currency) : <span className="dim">…</span>}</div>
                <div className={`mono watch-change ${up ? "up" : "down"}`}>{quote ? fmtPct(quote.change_pct, true) : "-"}</div>
                <button className="icon-btn watch-remove" onClick={() => remove(symbol)} aria-label={`Remove ${symbol}`}>
                  <TrashIcon size={15} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {symbols.length > 20 && <p className="dim">Showing first 20 symbols to keep things fast.</p>}
      <p className="dim watch-hint">
        <StarIcon size={13} /> Tip: open any stock page and hit the star to add it here.
      </p>
    </div>
  );
}
