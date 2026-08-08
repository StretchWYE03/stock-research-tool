import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { BacktestResult } from "../api/types";
import { DrawdownChart, EquityCurveChart } from "../components/EquityChart";
import { StatCard } from "../components/ui";
import { ErrorNote, Loading } from "../components/ui";
import { FlaskIcon } from "../components/Icons";
import SymbolInput from "../components/SymbolInput";
import { fmtDate, fmtPct } from "../lib/format";

const STRATEGIES = [
  {
    id: "sma_cross",
    label: "SMA Crossover",
    desc: "Long while the fast SMA stays above the slow SMA; flat otherwise. Classic trend-following.",
  },
  {
    id: "rsi",
    label: "RSI Mean Reversion",
    desc: "Buys when RSI is oversold and exits when it turns overbought. Mean-reversion style.",
  },
  {
    id: "sma_trend",
    label: "SMA Trend Following",
    desc: "Long while price holds above its long-term SMA, riding sustained uptrends."
  },
];

export default function Backtest() {
  const [symbol, setSymbol] = useState("AAPL");
  const [inputSymbol, setInputSymbol] = useState("AAPL");
  const [strategy, setStrategy] = useState("sma_cross");
  const [period, setPeriod] = useState("1y");
  const [fast, setFast] = useState(20);
  const [slow, setSlow] = useState(50);
  const [oversold, setOversold] = useState(30);
  const [overbought, setOverbought] = useState(70);
  const [window, setWindow] = useState(200);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    let alive = true;
    // Debounce param edits so typing doesn't spam the rate-limited route.
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      api
        .get<BacktestResult>(`/backtest/${encodeURIComponent(symbol)}`, {
          params: { strategy, period, fast, slow, oversold, overbought, window },
        })
        .then(({ data }) => alive && setResult(data))
        .catch((e) => alive && setError(e.message))
        .finally(() => alive && setLoading(false));
    }, 350);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [symbol, strategy, period, fast, slow, oversold, overbought, window, runId]);

  const run = () => {
    const cleaned = inputSymbol.trim().toUpperCase();
    if (cleaned) setSymbol(cleaned);
  };

  const strat = STRATEGIES.find((s) => s.id === strategy)!;
  const m = result?.metrics;

  return (
    <div className="page page-reveal">
      <div className="page-head">
        <div>
          <h1 className="page-title">Backtest</h1>
          <p className="page-sub">Rule-based strategies vs buy-and-hold · historical daily data · local computation</p>
        </div>
      </div>

      <div className="panel filter-panel">
        <div className="filter-row backtest-filters">
          <label className="filter-field">
            Symbol
            <SymbolInput
              value={inputSymbol}
              onChange={setInputSymbol}
              onSelect={(s) => {
                setInputSymbol(s);
                setSymbol(s.toUpperCase());
              }}
              placeholder="AAPL"
              ariaLabel="Symbol"
            />
          </label>
          <label className="filter-field">
            Strategy
            <select value={strategy} onChange={(e) => setStrategy(e.target.value)}>
              {STRATEGIES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            Period
            <select value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="1y">1 year</option>
              <option value="2y">2 years</option>
              <option value="5y">5 years</option>
              <option value="10y">10 years</option>
            </select>
          </label>

          {strategy === "sma_cross" && (
            <>
              <label className="filter-field">
                Fast SMA
                <input type="number" min={2} max={100} value={fast} onChange={(e) => setFast(Number(e.target.value))} className="num-input mono" />
              </label>
              <label className="filter-field">
                Slow SMA
                <input type="number" min={2} max={300} value={slow} onChange={(e) => setSlow(Number(e.target.value))} className="num-input mono" />
              </label>
            </>
          )}
          {strategy === "rsi" && (
            <>
              <label className="filter-field">
                Oversold
                <input type="number" min={5} max={50} value={oversold} onChange={(e) => setOversold(Number(e.target.value))} className="num-input mono" />
              </label>
              <label className="filter-field">
                Overbought
                <input type="number" min={50} max={95} value={overbought} onChange={(e) => setOverbought(Number(e.target.value))} className="num-input mono" />
              </label>
            </>
          )}
          {strategy === "sma_trend" && (
            <label className="filter-field">
              SMA window
              <input type="number" min={20} max={500} value={window} onChange={(e) => setWindow(Number(e.target.value))} className="num-input mono" />
            </label>
          )}

          <button className="btn btn-primary" onClick={run}>
            <FlaskIcon size={15} /> Run
          </button>
        </div>
        <p className="dim filter-hint">{strat.desc}</p>
      </div>

      {error && <ErrorNote message={error} onRetry={() => setRunId((r) => r + 1)} />}
      {loading && <Loading label="Running backtest" />}

      {result && m && !loading && (
        <>
          <div className="grid metrics-grid">
            <MetricGroup label="Strategy" accent="up" metrics={m.strategy} showTrades />
            <MetricGroup label="Buy & Hold" accent="neutral" metrics={m.benchmark} />
          </div>

          <div className="grid backtest-grid">
            <div className="panel">
              <div className="chart-head">
                <h3>Equity Curve: $10,000 start</h3>
                <span className="dim mono">{result.strategy_label} · {symbol}</span>
              </div>
              <EquityCurveChart data={result.equity_curve} />
            </div>
            <div className="panel">
              <div className="chart-head">
                <h3>Strategy Drawdown</h3>
                <span className="dim mono">Max {fmtPct(m.strategy.max_drawdown_pct)}</span>
              </div>
              <DrawdownChart data={result.drawdown_curve} />
            </div>
          </div>

          <div className="panel">
            <div className="chart-head">
              <h3>Trades ({result.trades.length})</h3>
            </div>
            {result.trades.length === 0 ? (
              <p className="dim">The strategy never entered a position over this window.</p>
            ) : (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Entry</th>
                      <th>Exit</th>
                      <th>Entry price</th>
                      <th>Exit price</th>
                      <th>Return</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.trades.map((t, i) => (
                      <tr key={i}>
                        <td className="mono">{fmtDate(new Date(t.entry_date).getTime())}</td>
                        <td className="mono">{fmtDate(new Date(t.exit_date).getTime())}</td>
                        <td className="mono">{t.entry_price.toFixed(2)}</td>
                        <td className="mono">{t.exit_price.toFixed(2)}</td>
                        <td className={`mono ${t.return_pct >= 0 ? "up" : "down"}`}>{fmtPct(t.return_pct, true)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function MetricGroup({ label, accent, metrics, showTrades }: { label: string; accent: "up" | "neutral"; metrics: any; showTrades?: boolean }) {
  return (
    <div className={`panel metric-group metric-${accent}`}>
      <div className="metric-group-head">
        <span className="metric-group-dot" />
        <h3>{label}</h3>
      </div>
      <div className="metric-grid">
        <StatCard label="Total return" value={metrics.total_return_pct} suffix="%" accent={metrics.total_return_pct >= 0 ? "up" : "down"} countUp />
        <StatCard label="CAGR" value={metrics.cagr_pct} suffix="%" accent={metrics.cagr_pct >= 0 ? "up" : "down"} countUp />
        <StatCard label="Sharpe" value={metrics.sharpe} accent={metrics.sharpe >= 1 ? "up" : "neutral"} countUp />
        <StatCard label="Max drawdown" value={metrics.max_drawdown_pct} suffix="%" accent="down" countUp />
        <StatCard label="Volatility" value={metrics.annual_vol_pct} suffix="%" accent="neutral" countUp />
        {showTrades && (
          <>
            <StatCard label="Trades" value={metrics.num_trades} decimals={0} accent="neutral" />
            <StatCard label="Win rate" value={metrics.win_rate_pct} suffix="%" accent="brand" countUp />
            <StatCard label="Avg win" value={metrics.avg_win_pct} suffix="%" accent="up" countUp />
          </>
        )}
      </div>
    </div>
  );
}
