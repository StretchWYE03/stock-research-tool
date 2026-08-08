import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { NlChip, NlExplain, ScreenerResponse } from "../api/types";
import RatingBadge from "../components/RatingBadge";
import { EmptyState, ErrorNote, Loading } from "../components/ui";
import { RefreshIcon, SearchIcon } from "../components/Icons";
import { fmtCompact, fmtMoney, fmtPct } from "../lib/format";

export default function Screener() {
  const [minScore, setMinScore] = useState(45);
  const [sector, setSector] = useState("all");
  const [country, setCountry] = useState("all");
  const [sort, setSort] = useState("composite");
  const [limit, setLimit] = useState(50);
  const [sectors, setSectors] = useState<string[]>([]);
  const [data, setData] = useState<ScreenerResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runId, setRunId] = useState(0);
  const firstRunRef = useRef(true);

  // Natural-language query state.
  const [query, setQuery] = useState("");
  const [nlChips, setNlChips] = useState<NlChip[] | null>(null);
  const [nlNote, setNlNote] = useState<string | null>(null);
  const [capMin, setCapMin] = useState<number | null>(null);
  const [capMax, setCapMax] = useState<number | null>(null);
  const [minDiv, setMinDiv] = useState<number | null>(null);
  const [oversold, setOversold] = useState(false);
  const [overbought, setOverbought] = useState(false);

  const runNl = async () => {
    const q = query.trim();
    if (!q) return;
    try {
      const { data } = await api.get<NlExplain>("/screener/explain", { params: { q } });
      const f = data.filters;
      setNlChips(data.chips.length ? data.chips : null);
      setNlNote(data.matched ? null : data.note);
      if (f.sector) setSector(f.sector);
      if (f.country) setCountry(f.country);
      setCapMin(f.min_market_cap);
      setCapMax(f.max_market_cap);
      setMinDiv(f.min_dividend_yield);
      setOversold(f.oversold);
      setOverbought(f.overbought);
      if (f.min_score != null) setMinScore(f.min_score);
    } catch (e: any) {
      setNlNote(e.message);
    }
  };

  const removeChip = (kind: string) => {
    setNlChips((prev) => (prev ? prev.filter((c) => c.kind !== kind) : prev));
    setNlNote(null);
  };

  const clearChip = (kind: string) => {
    if (kind === "sector") setSector("all");
    if (kind === "country") setCountry("all");
    if (kind === "cap") {
      setCapMin(null);
      setCapMax(null);
    }
    if (kind === "dividend") setMinDiv(null);
    if (kind === "rsi") {
      setOversold(false);
      setOverbought(false);
    }
    if (kind === "rating") setMinScore(45);
    removeChip(kind);
  };

  const clearNl = () => {
    setQuery("");
    setNlChips(null);
    setNlNote(null);
    setSector("all");
    setCountry("all");
    setCapMin(null);
    setCapMax(null);
    setMinDiv(null);
    setOversold(false);
    setOverbought(false);
    setMinScore(45);
  };

  useEffect(() => {
    let alive = true;
    // Debounce so slider drags don't hammer the (deliberately tight) screener limit.
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      api
        .get<ScreenerResponse>("/screener/screen", {
          params: {
            min_score: minScore,
            sector: sector === "all" ? undefined : sector,
            country: country === "all" ? undefined : country,
            min_market_cap: capMin ?? undefined,
            max_market_cap: capMax ?? undefined,
            min_dividend_yield: minDiv ?? undefined,
            oversold: oversold || undefined,
            overbought: overbought || undefined,
            sort,
            limit,
          },
        })
        .then(({ data }) => {
          if (!alive) return;
          setData(data);
          setSectors(data.sectors);
        })
        .catch((e) => alive && setError(e.message))
        .finally(() => {
          if (alive) {
            setLoading(false);
            firstRunRef.current = false;
          }
        });
    }, 400);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [minScore, sector, country, capMin, capMax, minDiv, oversold, overbought, sort, limit, runId]);

  return (
    <div className="page page-reveal">
      <div className="page-head">
        <div>
          <h1 className="page-title">Screener</h1>
          <p className="page-sub">
            Scores {data ? `the full ${data.count}-symbol universe` : "the research universe"} with the same engine used on stock pages.
          </p>
        </div>
        <button className="btn btn-ghost" onClick={() => setRunId((r) => r + 1)} disabled={loading}>
          <RefreshIcon size={15} /> Rescreen
        </button>
      </div>

      <div className="nl-box">
        <form
          className="nl-form"
          onSubmit={(e) => {
            e.preventDefault();
            runNl();
          }}
        >
          <SearchIcon size={16} />
          <input
            className="nl-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Try "high dividend Canadian banks", "US energy stocks", or "oversold stocks"'
            aria-label="Describe the stocks you want"
          />
          <button type="submit" className="btn btn-ghost nl-go" disabled={!query.trim()}>
            Search
          </button>
        </form>
        {nlChips && nlChips.length > 0 && (
          <div className="nl-chips">
            <span className="nl-chips-label">Applying</span>
            {nlChips.map((c) => (
              <span key={c.kind} className="nl-chip mono">
                {c.label}
                <button
                  className="nl-chip-x"
                  onClick={() => clearChip(c.kind)}
                  aria-label={`Remove ${c.label}`}
                >
                  ×
                </button>
              </span>
            ))}
            <button className="nl-clear" onClick={clearNl}>
              Clear all
            </button>
          </div>
        )}
        {nlNote && <p className="nl-note">{nlNote}</p>}
      </div>

      <div className="preset-row">
        <span className="preset-label">Beginner presets</span>
        {[
          { label: "Strong Buys only", value: 60, hint: "scores 60+" },
          { label: "Buys & better", value: 45, hint: "scores 45+" },
          { label: "Everything", value: 0, hint: "all ratings" },
        ].map((preset) => (
          <button
            key={preset.label}
            className={`preset-chip mono ${minScore === preset.value ? "preset-chip-active" : ""}`}
            onClick={() => setMinScore(preset.value)}
            title={preset.hint}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="panel filter-panel">
        <div className="filter-row">
          <label className="filter-label">
            Min score
            <span className="mono filter-value">{minScore}</span>
          </label>
          <input
            type="range"
            min={0}
            max={90}
            step={5}
            value={minScore}
            onChange={(e) => {
              setMinScore(Number(e.target.value));
              removeChip("rating");
            }}
            className="score-slider"
          />
          <label className="filter-field">
            Sector
            <select
              value={sector}
              onChange={(e) => {
                setSector(e.target.value);
                removeChip("sector");
              }}
            >
              <option value="all">All sectors</option>
              {sectors.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            Country
            <select
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                removeChip("country");
              }}
            >
              <option value="all">US + Canada</option>
              <option value="US">United States</option>
              <option value="CA">Canada</option>
            </select>
          </label>
          <label className="filter-field">
            Sort by
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="composite">Composite score</option>
              <option value="technical">Technical</option>
              <option value="fundamental">Fundamental</option>
              <option value="change_pct">Day change</option>
              <option value="market_cap">Market cap</option>
            </select>
          </label>
          <label className="filter-field">
            Results
            <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
        </div>
        {loading && firstRunRef.current && (
          <p className="dim filter-hint">First run scores the whole universe; this can take a minute while data caches.</p>
        )}
      </div>

      {error && <ErrorNote message={error} onRetry={() => setRunId((r) => r + 1)} />}
      {loading && <Loading label="Scoring universe" />}

      {data && !loading && (
        <div className="panel">
          {data.results.length === 0 ? (
            <EmptyState
              title="No stocks match right now"
              body="Nothing in the universe fits these filters today, which is common when the market runs broad. Try removing a chip or widening the search."
            />
          ) : (
            <>
              <div className="table-scroll">
                <table className="data-table screener-table">
                  <thead>
                    <tr>
                      <th>Rating</th>
                      <th>Symbol</th>
                      <th>Name</th>
                      <th>Sector</th>
                      <th>Composite</th>
                      <th>Tech</th>
                      <th>Fund</th>
                      <th>Price</th>
                      <th>Day</th>
                      <th>Mkt cap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.results.map((row) => {
                      const up = (row.change_pct ?? 0) >= 0;
                      return (
                        <tr key={row.symbol}>
                          <td>
                            <RatingBadge rating={row.rating} label={row.rating_label} size="sm" />
                          </td>
                          <td>
                            <Link to={`/stock/${encodeURIComponent(row.symbol)}`} className="table-link mono">
                              {row.symbol}
                            </Link>
                          </td>
                          <td className="table-name">{row.name}</td>
                          <td className="dim">{row.sector}</td>
                          <td className="mono">
                            <span className={`composite-num ${row.composite >= 60 ? "up" : row.composite >= 45 ? "brand" : "down"}`}>
                              {row.composite.toFixed(0)}
                            </span>
                          </td>
                          <td className="mono">{row.technical.toFixed(0)}</td>
                          <td className="mono">{row.fundamental.toFixed(0)}</td>
                          <td className="mono">{row.price ? fmtMoney(row.price, undefined, 2) : "-"}</td>
                          <td className={`mono ${up ? "up" : "down"}`}>{fmtPct(row.change_pct, true)}</td>
                          <td className="mono dim">{row.market_cap ? fmtCompact(row.market_cap) : "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="dim table-foot">
                Showing {data.results.length} of {data.count} symbols · universe of large-cap US + Canadian equities
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
