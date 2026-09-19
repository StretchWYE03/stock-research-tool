import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { MoverRow, Overview } from "../api/types";
import CountUp from "../components/CountUp";
import { ErrorNote, Loading, SectionTitle } from "../components/ui";
import TickerTape from "../components/TickerTape";
import { ArrowDownIcon, ArrowUpIcon, RefreshIcon } from "../components/Icons";
import { fmtDateTime, fmtMoney, fmtPct, fmtCompact } from "../lib/format";

export default function Dashboard() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let alive = true;
    setError(null);
    api
      .get<Overview>("/market/overview")
      .then(({ data }) => alive && setData(data))
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && undefined);
    return () => {
      alive = false;
    };
  }, [refreshKey]);

  if (error && !data) return <ErrorNote message={error} onRetry={() => setRefreshKey((k) => k + 1)} />;
  if (!data) return <Loading label="Loading market overview" />;

  const { indices, movers } = data;
  const upCount = indices.filter((i) => (i.change_pct ?? 0) >= 0).length;
  const breadth = { up: upCount, down: indices.length - upCount };
  const universe = movers.breadth;

  return (
    <div className="page page-reveal">
      <div className="page-head">
        <div>
          <h1 className="page-title">Market Overview</h1>
          <p className="page-sub">US &amp; Canadian equities · research only · not investment advice</p>
          <p className="data-freshness">Data as of {fmtDateTime(data.updated_at_ms)}</p>
        </div>
        <button className="btn btn-ghost" onClick={() => setRefreshKey((k) => k + 1)}>
          <RefreshIcon size={15} /> Refresh
        </button>
      </div>

      <TickerTape
        items={indices.map((i) => ({ symbol: i.symbol.replace("^", ""), price: i.price, change_pct: i.change_pct, currency: i.currency }))}
      />

      {/* Indices */}
      <section className="grid indices-grid">
        {indices.map((idx, i) => {
          const up = (idx.change_pct ?? 0) >= 0;
          return (
            <div key={idx.symbol} className="index-card" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="index-top">
                <span className="index-name">{idx.name}</span>
                <span className={`index-state ${up ? "up" : "down"}`}>{idx.symbol.replace("^", "")}</span>
              </div>
              <div className="index-price mono">
                {idx.price != null && <CountUp value={idx.price} prefix={idx.currency === "CAD" ? "C$" : "$"} />}
              </div>
              <div className={`index-change mono ${up ? "up" : "down"}`}>
                {up ? <ArrowUpIcon size={13} /> : <ArrowDownIcon size={13} />}
                <span>{fmtPct(idx.change_pct, true)}</span>
                <span className="index-change-abs">{fmtMoney(idx.change, idx.currency)}</span>
              </div>
              <div className="index-breadth">
                <span className="breadth-up" style={{ width: `${breadth.up}%` }} />
                <span className="breadth-down" style={{ width: `${breadth.down}%` }} />
              </div>
            </div>
          );
        })}
        {universe && (
          <div className="index-card breadth-card" style={{ animationDelay: `${indices.length * 60}ms` }}>
            <div className="index-top">
              <span className="index-name">Universe Breadth</span>
              <span className="index-state mono">{universe.up}/{universe.total} ↑</span>
            </div>
            <div className="index-price mono">{universe.up_pct.toFixed(0)}%</div>
            <div className="index-change up">
              <span>advancing</span>
              <span className="index-change-abs">vs {universe.down} declining</span>
            </div>
            <div className="index-breadth">
              <span className="breadth-up" style={{ width: `${universe.up_pct}%` }} />
              <span className="breadth-down" style={{ width: `${100 - universe.up_pct}%` }} />
            </div>
          </div>
        )}
      </section>

      {/* Movers */}
      <section className="grid movers-grid">
        <MoverTable title="Top Gainers" tone="up" rows={movers.gainers} />
        <MoverTable title="Top Losers" tone="down" rows={movers.losers} />
        <MoverTable title="Most Active" tone="brand" rows={movers.most_active} />
      </section>
    </div>
  );
}

function MoverTable({ title, tone, rows }: { title: string; tone: "up" | "down" | "brand"; rows: MoverRow[] }) {
  return (
    <div className="panel mover-panel">
      <SectionTitle hint={`${rows.length} of ${rows.length}`}>
        <span className={`mover-title-dot mover-${tone}`} />
        {title}
      </SectionTitle>
      <div className="mover-list">
        {rows.map((row) => {
          const up = (row.change_pct ?? 0) >= 0;
          return (
            <Link to={`/stock/${encodeURIComponent(row.symbol)}`} key={row.symbol} className="mover-row">
              <div className="mover-name">
                <span className="mover-symbol mono">{row.symbol}</span>
                <span className="mover-full">{row.name}</span>
              </div>
              <div className="mover-vol mono">{row.volume ? fmtCompact(row.volume) : ""}</div>
              <div className="mover-price mono">{fmtMoney(row.price, row.currency)}</div>
              <div className={`mover-change mono ${up ? "up" : "down"}`}>{fmtPct(row.change_pct, true)}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
