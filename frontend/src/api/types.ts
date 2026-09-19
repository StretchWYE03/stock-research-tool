export interface Quote {
  symbol: string;
  name: string;
  price: number;
  change: number | null;
  change_pct: number | null;
  open: number | null;
  day_high: number | null;
  day_low: number | null;
  prev_close: number | null;
  volume: number | null;
  market_cap: number | null;
  currency: string | null;
  exchange: string | null;
  year_high: number | null;
  year_low: number | null;
  market_state?: string | null;
  updated_at_ms?: number | null;
}

export interface Bar {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface HistoryResponse {
  symbol: string;
  period: string;
  interval: string;
  currency?: string | null;
  exchange?: string | null;
  name?: string | null;
  bars: Bar[];
}

export interface Signal {
  id: string;
  label: string;
  category: "technical" | "fundamental";
  score: number;
  max: number;
  detail: string;
}

export interface Score {
  symbol: string;
  name?: string | null;
  composite: number;
  technical: number;
  fundamental: number;
  rating: string;
  rating_label: string;
  signals: Signal[];
  currency?: string | null;
  updated_at_ms: number;
}

export interface SearchResult {
  symbol: string;
  name: string | null;
  exchange: string;
  country: string;
}

export type SentimentLabel = "Bullish" | "Neutral" | "Bearish";

export interface NewsItem {
  id?: string | null;
  title: string;
  summary?: string | null;
  publisher?: string | null;
  url?: string | null;
  published_at?: number | null;
  thumbnail?: string | null;
  sentiment?: { score: number; label: SentimentLabel } | null;
}

export interface NewsSentiment {
  score: number;
  label: SentimentLabel;
  counts: { bullish: number; neutral: number; bearish: number };
  scored: number;
}

export interface OptionRow {
  strike: number;
  last_price: number | null;
  bid: number | null;
  ask: number | null;
  volume: number;
  open_interest: number;
  iv: number | null;
  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
  itm: boolean;
}

export interface OptionChain {
  expiration: string;
  calls: OptionRow[];
  puts: OptionRow[];
}

export interface OptionsResponse {
  symbol: string;
  expirations: string[];
  chains: OptionChain[];
}

export interface SimilarRow {
  symbol: string;
  name: string;
  sector: string;
  country: string;
  price: number | null;
  change_pct: number | null;
  currency: string | null;
  similarity: number;
  closest: string[];
}

export interface SimilarResponse {
  symbol: string;
  cluster: { id: number; size: number } | null;
  features: string[];
  similar: SimilarRow[];
}

export interface IndexQuote extends Quote {
  name: string;
}

export interface ScreenerRow {
  symbol: string;
  name: string;
  sector: string;
  country: string;
  rating: string;
  rating_label: string;
  composite: number;
  technical: number;
  fundamental: number;
  price: number | null;
  change_pct: number | null;
  market_cap: number | null;
}

export interface ScreenerResponse {
  count: number;
  sectors: string[];
  results: ScreenerRow[];
}

export interface NlFilters {
  sector: string | null;
  country: "US" | "CA" | null;
  min_market_cap: number | null;
  max_market_cap: number | null;
  min_dividend_yield: number | null;
  oversold: boolean;
  overbought: boolean;
  min_score: number | null;
}

export interface NlChip {
  kind: string;
  label: string;
}

export interface NlExplain {
  query: string;
  filters: NlFilters;
  chips: NlChip[];
  matched: boolean;
  note: string | null;
}

export interface BacktestMetrics {
  total_return_pct: number;
  cagr_pct: number;
  annual_vol_pct: number;
  sharpe: number;
  max_drawdown_pct: number;
  num_trades?: number;
  win_rate_pct?: number;
  avg_win_pct?: number;
}

export interface BacktestTrade {
  entry_date: string;
  exit_date: string;
  entry_price: number;
  exit_price: number;
  return_pct: number;
}

export interface BacktestResult {
  symbol: string;
  strategy: string;
  strategy_label: string;
  params: Record<string, number>;
  period: string;
  metrics: {
    strategy: BacktestMetrics;
    benchmark: BacktestMetrics;
  };
  trades: BacktestTrade[];
  equity_curve: { t: number; strategy: number; benchmark: number }[];
  drawdown_curve: { t: number; drawdown: number }[];
}

export interface Breadth {
  up: number;
  down: number;
  total: number;
  up_pct: number;
}

export interface MoverRow {
  symbol: string;
  name: string;
  sector: string;
  country: string;
  price: number | null;
  change_pct: number | null;
  change: number | null;
  volume: number | null;
  market_cap: number | null;
  currency: string | null;
}

export interface Overview {
  indices: IndexQuote[];
  movers: {
    gainers: MoverRow[];
    losers: MoverRow[];
    most_active: MoverRow[];
    breadth: Breadth;
    updated_at_ms?: number | null;
  };
  updated_at_ms?: number | null;
}
