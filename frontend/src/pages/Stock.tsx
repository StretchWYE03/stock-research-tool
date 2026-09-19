import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { Bar, HistoryResponse, NewsItem, NewsSentiment, OptionChain, OptionsResponse, Quote, Score, SentimentLabel, Signal, SimilarResponse, SimilarRow } from "../api/types";
import CandlestickChart from "../components/CandlestickChart";
import InfoTip from "../components/InfoTip";
import RatingBadge from "../components/RatingBadge";
import ScoreGauge from "../components/ScoreGauge";
import Tabs from "../components/Tabs";
import { EmptyState, ErrorNote, Loading, SectionTitle } from "../components/ui";
import { ArrowDownIcon, ArrowUpIcon, RefreshIcon, StarIcon } from "../components/Icons";
import { fmtCompact, fmtMoney, fmtNum, fmtPct, safeExternalUrl, timeAgo } from "../lib/format";
import { explainMetric, explainScore, explainSignal, whatToWatch, assessRisk } from "../lib/explain";
import { addToWatchlist, isWatchlisted, removeFromWatchlist } from "../lib/storage";

const RANGES = ["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y"] as const;
type Range = (typeof RANGES)[number];

interface Info {
  longName?: string | null;
  shortName?: string | null;
  sector?: string | null;
  industry?: string | null;
  country?: string | null;
  website?: string | null;
  marketCap?: number | null;
  trailingPE?: number | null;
  forwardPE?: number | null;
  priceToBook?: number | null;
  trailingEps?: number | null;
  forwardEps?: number | null;
  profitMargins?: number | null;
  grossMargins?: number | null;
  operatingMargins?: number | null;
  returnOnEquity?: number | null;
  revenueGrowth?: number | null;
  earningsGrowth?: number | null;
  totalRevenue?: number | null;
  debtToEquity?: number | null;
  currentRatio?: number | null;
  dividendYield?: number | null;
  dividendRate?: number | null;
  beta?: number | null;
  fiftyTwoWeekHigh?: number | null;
  fiftyTwoWeekLow?: number | null;
  averageVolume?: number | null;
  sharesOutstanding?: number | null;
  bookValue?: number | null;
  freeCashflow?: number | null;
  targetMeanPrice?: number | null;
  targetHighPrice?: number | null;
  targetLowPrice?: number | null;
  numberOfAnalystOpinions?: number | null;
  recommendationKey?: string | null;
  recommendationMean?: number | null;
  currency?: string | null;
  longBusinessSummary?: string | null;
}

function sentimentTone(label: SentimentLabel): string {
  if (label === "Bullish") return "up";
  if (label === "Bearish") return "down";
  return "neutral";
}

function sma(points: { t: number; v: number }[], window: number) {
  const out: { t: number; v: number }[] = [];
  for (let i = window - 1; i < points.length; i++) {
    let sum = 0;
    for (let j = i - window + 1; j <= i; j++) sum += points[j].v;
    out.push({ t: points[i].t, v: sum / window });
  }
  return out;
}

export default function Stock() {
  const { symbol = "" } = useParams();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [hist, setHist] = useState<HistoryResponse | null>(null);
  const [score, setScore] = useState<Score | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsSent, setNewsSent] = useState<NewsSentiment | null>(null);
  const [info, setInfo] = useState<Info | null>(null);
  const [options, setOptions] = useState<OptionsResponse | null>(null);
  const [optionsAttempt, setOptionsAttempt] = useState(0);
  const [range, setRange] = useState<Range>("1y");
  const [tab, setTab] = useState("chart");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wl, setWl] = useState(isWatchlisted(symbol));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [q, h, s, n, i] = await Promise.all([
        api.get<Quote>(`/stocks/${encodeURIComponent(symbol)}/quote`),
        api.get<HistoryResponse>(`/stocks/${encodeURIComponent(symbol)}/history?period=${range}`),
        api.get<Score>(`/stocks/${encodeURIComponent(symbol)}/score`),
        api.get<{ items: NewsItem[]; sentiment?: NewsSentiment }>(`/stocks/${encodeURIComponent(symbol)}/news`),
        api.get<Info>(`/stocks/${encodeURIComponent(symbol)}/info`),
      ]);
      setQuote(q.data);
      setHist(h.data);
      setScore(s.data);
      setNews(n.data.items);
      setNewsSent(n.data.sentiment ?? null);
      setInfo(i.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [symbol, range]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setWl(isWatchlisted(symbol));
  }, [symbol]);

  useEffect(() => {
    if (tab === "options" && !options) {
      api
        .get<OptionsResponse>(`/stocks/${encodeURIComponent(symbol)}/options`)
        .then(({ data }) => setOptions(data))
        .catch(() => setOptions(null));
    }
  }, [tab, options, symbol, optionsAttempt]);

  const toggleWatchlist = () => {
    if (wl) {
      removeFromWatchlist(symbol);
      setWl(false);
    } else {
      addToWatchlist(symbol);
      setWl(true);
    }
  };

  const overlays = useMemo(() => {
    if (!hist?.bars || hist.bars.length < 60) return [];
    const pts = hist.bars.map((b) => ({ t: b.t, v: b.c }));
    return [
      { label: "SMA 50", color: "#F59E0B", points: sma(pts, 50) },
      { label: "SMA 200", color: "#3B82F6", points: sma(pts, 200) },
    ];
  }, [hist]);

  const up = (quote?.change_pct ?? 0) >= 0;
  const currency = quote?.currency || hist?.currency || "USD";
  const explanation = score && hist?.bars?.length ? explainScore(symbol, score, quote) : [];
  const watch = score ? whatToWatch(score, quote?.price) : [];

  return (
    <div className="page page-reveal">
      {loading && !quote && <Loading label="Loading symbol" />}
      {error && !quote && <ErrorNote message={error} onRetry={load} />}

      {quote && (
        <>
          <div className="stock-head">
            <div className="stock-title">
              <h1 className="stock-symbol mono">{symbol}</h1>
              <div className="stock-meta">
                <span className="stock-name">{quote.name}</span>
                <span className="stock-exch mono">{quote.exchange}</span>
                <span className="stock-exch mono">{currency}</span>
              </div>
            </div>
            <div className="stock-price-block">
              <div className="stock-price mono">
                {fmtMoney(quote.price, currency)}
                <span className={`stock-change mono ${up ? "up" : "down"}`}>
                  {up ? <ArrowUpIcon size={15} /> : <ArrowDownIcon size={15} />}
                  {fmtPct(quote.change_pct, true)}
                  <span className="stock-change-abs">{fmtMoney(quote.change, currency)}</span>
                </span>
              </div>
              <div className="stock-actions">
                {score && <RatingBadge rating={score.rating} label={score.rating_label} />}
                <button
                  className={`icon-btn star-btn ${wl ? "star-on" : ""}`}
                  onClick={toggleWatchlist}
                  aria-label={wl ? "Remove from watchlist" : "Add to watchlist"}
                  title={wl ? "Remove from watchlist" : "Add to watchlist"}
                >
                  <StarIcon size={17} filled={wl} />
                </button>
                <button className="icon-btn" onClick={load} aria-label="Refresh" title="Refresh">
                  <RefreshIcon size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="stock-stats">
            <Stat label="Open" value={fmtMoney(quote.open, currency)} />
            <Stat label="Day range" value={`${fmtMoney(quote.day_low, currency, 2)} - ${fmtMoney(quote.day_high, currency, 2)}`} />
            <Stat label="Volume" value={fmtCompact(quote.volume)} />
            <Stat label="Mkt cap" value={quote.market_cap ? fmtCompact(quote.market_cap) : (info?.marketCap ? fmtCompact(info.marketCap) : "-")} />
            <Stat label="52w range" value={`${fmtMoney(quote.year_low, currency, 0)} - ${fmtMoney(quote.year_high, currency, 0)}`} />
          </div>

          <Tabs
            tabs={[
              { id: "chart", label: "Chart" },
              { id: "score", label: "Score" },
              { id: "fundamentals", label: "Fundamentals" },
              { id: "news", label: `News (${news.length})` },
              { id: "options", label: "Options" },
            ]}
            active={tab}
            onChange={setTab}
          />

          {tab === "chart" && (
            <div className="panel chart-panel">
              <div className="range-row">
                {RANGES.map((r) => (
                  <button key={r} className={`range-btn mono ${range === r ? "range-btn-active" : ""}`} onClick={() => setRange(r)}>
                    {r.toUpperCase()}
                  </button>
                ))}
              </div>
              {hist?.bars?.length ? (
                <CandlestickChart bars={hist.bars} overlays={overlays} currency={currency} />
              ) : (
                <EmptyState title="No chart data" body="Price history is unavailable for this symbol." />
              )}
            </div>
          )}

          {tab === "score" && (
            <>
              <div className="panel explainer-panel">
                <SectionTitle hint="no jargon, plain English">In Plain English</SectionTitle>
                {explanation.length ? (
                  <div className="explainer-body">
                    <div className="explainer-cols">
                      <div className="explainer-paragraphs">
                        {explanation.map((p) => (
                          <div key={p.heading} className="explainer-p">
                            <div className="explainer-heading">{p.heading}</div>
                            <p>{p.body}</p>
                          </div>
                        ))}
                      </div>
                      <RiskPanel hist={hist?.bars ?? []} info={info} />
                    </div>
                    {watch.length > 0 && (
                      <div className="watch-list">
                        <div className="watch-list-title">Things to watch</div>
                        <ul>
                          {watch.map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <Loading label="Writing the summary" />
                )}
              </div>

              <div className="grid score-grid">
                <div className="panel">
                  <SectionTitle hint="0-100 composite">Recommendation Score</SectionTitle>
                  {score ? (
                    <ScoreGauge score={score} />
                  ) : (
                    <Loading label="Scoring" />
                  )}
                  <p className="score-disclaimer">
                    Rules-based research output combining technicals and fundamentals. Not investment advice.
                  </p>
                </div>
                <div className="panel">
                  <SectionTitle hint={`${score?.signals.length ?? 0} signals · hover any row`}>Signal Breakdown</SectionTitle>
                  {score && (
                    <div className="signal-list">
                      {score.signals.map((s) => (
                        <SignalRow key={s.id} signal={s} />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <SimilarPanel symbol={symbol} />
            </>
          )}

          {tab === "fundamentals" && info && <Fundamentals info={info} quote={quote} />}
          {tab === "news" && (
            <div className="panel news-panel">
              {newsSent && newsSent.scored > 0 && (
                <div className="news-sentiment">
                  <span className={`sentiment-badge ${sentimentTone(newsSent.label)}`}>
                    {newsSent.label}
                  </span>
                  <span className="news-sentiment-note mono">
                    {newsSent.counts.bullish} bullish · {newsSent.counts.neutral} neutral · {newsSent.counts.bearish} bearish
                  </span>
                  <span className="news-sentiment-tip">rule-based reading of the headlines, not a forecast</span>
                </div>
              )}
              {news.length === 0 ? (
                <EmptyState title="No recent news" />
              ) : (
                news.map((item) => (
                  <a key={item.id ?? item.url} href={safeExternalUrl(item.url)} target="_blank" rel="noreferrer" className="news-item">
                    {item.thumbnail && <img src={item.thumbnail} alt="" className="news-thumb" loading="lazy" />}
                    <div className="news-body">
                      <div className="news-title">
                        {item.title}
                        {item.sentiment && (
                          <span className={`sentiment-chip ${sentimentTone(item.sentiment.label)}`}>
                            {item.sentiment.label}
                          </span>
                        )}
                      </div>
                      {item.summary && <div className="news-summary">{item.summary.slice(0, 220)}</div>}
                      <div className="news-meta mono">
                        <span>{item.publisher}</span>
                        <span>·</span>
                        <span>{timeAgo(item.published_at)}</span>
                      </div>
                    </div>
                  </a>
                ))
              )}
            </div>
          )}

          {tab === "options" && (
            <OptionsTab
              options={options}
              currency={currency}
              price={quote.price}
              onRetry={() => setOptionsAttempt((n) => n + 1)}
            />
          )}
        </>
      )}
    </div>
  );
}

function SimilarPanel({ symbol }: { symbol: string }) {
  const [data, setData] = useState<SimilarResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    api
      .get<SimilarResponse>(`/stocks/${encodeURIComponent(symbol)}/similar`)
      .then(({ data }) => {
        if (!alive) return;
        setData(data);
        setLoading(false);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e.message);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [symbol, attempt]);

  const title = <SectionTitle hint="same fundamental profile: valuation, growth, margins, leverage">Stocks like {symbol}</SectionTitle>;

  if (loading) {
    return (
      <div className="panel similar-panel">
        {title}
        <Loading label="Finding similar stocks" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="panel similar-panel">
        {title}
        <ErrorNote message={error} onRetry={() => setAttempt((n) => n + 1)} />
      </div>
    );
  }
  if (!data || data.similar.length === 0) return null;

  return (
    <div className="panel similar-panel">
      {title}
      {data.cluster && data.cluster.size >= 4 && (
        <div className="similar-cluster">
          One of {data.cluster.size} stocks with a similar fundamental profile
        </div>
      )}
      <div className="similar-grid">
        {data.similar.map((s) => (
          <SimilarCard key={s.symbol} row={s} />
        ))}
      </div>
    </div>
  );
}

function SimilarCard({ row }: { row: SimilarRow }) {
  const { symbol, name, sector, country, similarity, closest, price, change_pct, currency } = row;
  const up = (change_pct ?? 0) >= 0;
  return (
    <Link to={`/stock/${encodeURIComponent(symbol)}`} className="similar-card">
      <div className="similar-card-top">
        <span className="mono similar-symbol">{symbol}</span>
        <span className="mono similar-pct">{similarity}%</span>
      </div>
      <div className="similar-name">{name}</div>
      <div className="similar-meta mono">
        {sector} · {country}
      </div>
      {(price != null || change_pct != null) && (
        <div className="similar-quote mono">
          {price != null && <span>{fmtMoney(price, currency)}</span>}
          {change_pct != null && (
            <span className={up ? "up" : "down"}>{fmtPct(change_pct, true)}</span>
          )}
        </div>
      )}
      <div className="similar-why">closest on {closest.join(", ")}</div>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stock-stat">
      <span className="stat-label">{label}</span>
      <span className="mono">{value}</span>
    </div>
  );
}

function SignalRow({ signal }: { signal: Signal }) {
  const pct = Math.max(0, Math.min(100, (signal.score / signal.max) * 100));
  const tone = pct >= 66 ? "up" : pct >= 40 ? "brand" : "down";
  const tip = explainSignal(signal.id);
  return (
    <div className="signal-row">
      <div className="signal-top">
        <span className="signal-label">
          {signal.label}
          {tip && <InfoTip text={tip} />}
        </span>
        <span className="mono signal-score">
          {signal.score}/{signal.max}
        </span>
      </div>
      <div className="signal-bar">
        <div className={`signal-fill signal-${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="signal-detail">{signal.detail}</div>
    </div>
  );
}

function RiskPanel({ hist, info }: { hist: Bar[]; info: Info | null }) {
  const risk = assessRisk(hist, (info ?? {}) as Record<string, unknown>);
  const cls = `risk-${risk.level.toLowerCase()}`;
  return (
    <div className="risk-panel">
      <div className="risk-head">
        <span className="risk-label">Risk snapshot</span>
        <span className={`risk-badge ${cls}`}>{risk.level}</span>
      </div>
      <p className="risk-note">{risk.note}</p>
      <div className="risk-factors">
        {risk.factors.map((f) => (
          <div key={f.name} className="risk-factor">
            <div className="risk-factor-row">
              <span className="risk-factor-name">{f.name}</span>
              <span className="mono risk-factor-value">{f.value}</span>
            </div>
            <div className="risk-factor-note">{f.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value, tip }: { label: string; value: React.ReactNode; tip?: string }) {
  return (
    <div className="info-row">
      <span className="info-label">
        {label}
        {tip && <InfoTip text={tip} />}
      </span>
      <span className="info-value mono">{value ?? "-"}</span>
    </div>
  );
}

function Fundamentals({ info, quote }: { info: Info; quote: Quote }) {
  const currency = quote.currency || "USD";
  const high = info.fiftyTwoWeekHigh ?? quote.year_high;
  const low = info.fiftyTwoWeekLow ?? quote.year_low;
  const price = quote.price ?? 0;
  const rangePct = high && low && high > low ? Math.min(100, Math.max(0, ((price - low) / (high - low)) * 100)) : null;

  const pct = (v: number | null | undefined) => (v == null ? null : `${(v * 100).toFixed(1)}%`);

  return (
    <div className="grid fund-grid">
      <div className="panel">
        <SectionTitle>Valuation</SectionTitle>
        <div className="info-table">
          <Row label="Market cap" value={info.marketCap ? fmtCompact(info.marketCap) : null} tip={explainMetric("marketCap")} />
          <Row label="Trailing P/E" value={info.trailingPE?.toFixed(2)} tip={explainMetric("trailingPE")} />
          <Row label="Forward P/E" value={info.forwardPE?.toFixed(2)} tip={explainMetric("forwardPE")} />
          <Row label="Price / Book" value={info.priceToBook?.toFixed(2)} tip={explainMetric("priceToBook")} />
          <Row label="Trailing EPS" value={info.trailingEps ? fmtMoney(info.trailingEps, currency, 2) : null} tip={explainMetric("trailingEps")} />
          <Row label="Forward EPS" value={info.forwardEps ? fmtMoney(info.forwardEps, currency, 2) : null} tip={explainMetric("forwardEps")} />
          <Row label="Book value" value={info.bookValue ? fmtMoney(info.bookValue, currency, 2) : null} tip={explainMetric("bookValue")} />
          <Row label="Beta" value={info.beta?.toFixed(2)} tip={explainMetric("beta")} />
        </div>
      </div>
      <div className="panel">
        <SectionTitle>Profitability & Growth</SectionTitle>
        <div className="info-table">
          <Row label="Revenue (TTM)" value={info.totalRevenue ? fmtCompact(info.totalRevenue) : null} tip={explainMetric("totalRevenue")} />
          <Row label="Revenue growth" value={pct(info.revenueGrowth)} tip={explainMetric("revenueGrowth")} />
          <Row label="Earnings growth" value={pct(info.earningsGrowth)} tip={explainMetric("earningsGrowth")} />
          <Row label="Profit margin" value={pct(info.profitMargins)} tip={explainMetric("profitMargins")} />
          <Row label="Gross margin" value={pct(info.grossMargins)} tip={explainMetric("grossMargins")} />
          <Row label="Operating margin" value={pct(info.operatingMargins)} tip={explainMetric("operatingMargins")} />
          <Row label="Return on equity" value={pct(info.returnOnEquity)} tip={explainMetric("returnOnEquity")} />
          <Row label="Free cash flow" value={info.freeCashflow ? fmtCompact(info.freeCashflow) : null} tip={explainMetric("freeCashFlow")} />
        </div>
      </div>
      <div className="panel">
        <SectionTitle>Balance Sheet & Income</SectionTitle>
        <div className="info-table">
          <Row label="Debt / equity" value={info.debtToEquity ? `${info.debtToEquity.toFixed(0)}%` : null} tip={explainMetric("debtToEquity")} />
          <Row label="Current ratio" value={info.currentRatio?.toFixed(2)} tip={explainMetric("currentRatio")} />
          <Row label="Dividend yield" value={pct(info.dividendYield)} tip={explainMetric("dividendYield")} />
          <Row label="Dividend rate" value={info.dividendRate ? fmtMoney(info.dividendRate, currency, 2) : null} tip={explainMetric("dividendRate")} />
          <Row label="Shares outstanding" value={info.sharesOutstanding ? fmtCompact(info.sharesOutstanding) : null} tip={explainMetric("sharesOutstanding")} />
          <Row label="Avg volume" value={info.averageVolume ? fmtCompact(info.averageVolume) : null} tip={explainMetric("averageVolume")} />
          <Row label="Sector" value={info.sector} />
          <Row label="Industry" value={info.industry} />
        </div>
      </div>
      <div className="panel">
        <SectionTitle>52-Week Position</SectionTitle>
        <div className="range-52">
          <div className="range-52-bar">
            <div className="range-52-fill" style={{ width: `${rangePct ?? 0}%` }} />
            <span className="range-52-dot" style={{ left: `${rangePct ?? 0}%` }} />
          </div>
          <div className="range-52-labels mono">
            <span>{fmtMoney(low, currency, 2)}</span>
            <span>now {fmtMoney(price, currency, 2)}</span>
            <span>{fmtMoney(high, currency, 2)}</span>
          </div>
        </div>
        <div className="info-table">
          <Row label="Analyst mean target" value={info.targetMeanPrice ? fmtMoney(info.targetMeanPrice, currency, 2) : null} tip={explainMetric("targetMeanPrice")} />
          <Row label="Target range" value={info.targetLowPrice && info.targetHighPrice ? `${fmtMoney(info.targetLowPrice, currency, 0)} - ${fmtMoney(info.targetHighPrice, currency, 0)}` : null} />
          <Row label="Analyst opinions" value={info.numberOfAnalystOpinions ? `${info.numberOfAnalystOpinions} analysts` : null} tip={explainMetric("numberOfAnalystOpinions")} />
          <Row label="Street rating" value={info.recommendationKey ? info.recommendationKey.replace(/_/g, " ") : null} />
          <Row label="Street score" value={info.recommendationMean?.toFixed(2)} tip={explainMetric("recommendationMean")} />
        </div>
      </div>
      {info.longBusinessSummary && (
        <div className="panel fund-summary">
          <SectionTitle>Company</SectionTitle>
          <p className="business-summary">{info.longBusinessSummary}</p>
          {info.website && (
            <a href={safeExternalUrl(info.website)} target="_blank" rel="noreferrer" className="company-site">
              {info.website}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function OptionsTab({ options, currency, price, onRetry }: { options: OptionsResponse | null; currency: string; price: number; onRetry: () => void }) {
  const [exp, setExp] = useState<string | null>(null);
  const chain = options?.chains.find((c) => c.expiration === exp) ?? options?.chains[0];

  if (!options) {
    return (
      <div className="panel">
        <EmptyState title="No options data" body="This symbol may not have listed options." />
        <div className="center-row">
          <button className="btn btn-ghost" onClick={onRetry}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="options-head">
        <div className="expiry-row">
          {options.expirations.map((e) => (
            <button key={e} className={`range-btn mono ${chain?.expiration === e ? "range-btn-active" : ""}`} onClick={() => setExp(e)}>
              {e}
            </button>
          ))}
        </div>
        <span className="dim mono">Spot {fmtMoney(price, currency)}</span>
      </div>
      {chain ? (
        <div className="grid option-grid">
          <OptionTable title={`Calls · ${chain.expiration}`} rows={chain.calls} currency={currency} spot={price} />
          <OptionTable title={`Puts · ${chain.expiration}`} rows={chain.puts} currency={currency} spot={price} />
        </div>
      ) : (
        <EmptyState title="No chains" />
      )}
    </div>
  );
}

function OptionTable({ title, rows, currency, spot }: { title: string; rows: OptionChain["calls"]; currency: string; spot: number }) {
  return (
    <div>
      <SectionTitle>{title}</SectionTitle>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Strike</th>
              <th>Last</th>
              <th>Bid</th>
              <th>Ask</th>
              <th>IV</th>
              <th>Δ</th>
              <th>OI</th>
              <th>Vol</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const itm = r.strike < spot;
              return (
                <tr key={r.strike} className={r.itm ? "row-itm" : ""}>
                  <td className="mono">{r.strike.toFixed(0)} {itm && <span className="itm-dot" title="In the money" />}</td>
                  <td className="mono">{r.last_price != null ? fmtMoney(r.last_price, currency, 2) : "-"}</td>
                  <td className="mono">{r.bid != null ? fmtMoney(r.bid, currency, 2) : "-"}</td>
                  <td className="mono">{r.ask != null ? fmtMoney(r.ask, currency, 2) : "-"}</td>
                  <td className="mono">{r.iv != null ? `${(r.iv * 100).toFixed(0)}%` : "-"}</td>
                  <td className="mono">{r.delta != null ? r.delta.toFixed(2) : "-"}</td>
                  <td className="mono">{fmtNum(r.open_interest, 0)}</td>
                  <td className="mono">{fmtNum(r.volume, 0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
