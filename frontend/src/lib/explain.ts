// Rule-based, plain-English explanations for beginner-friendly research.
// Everything here is template-generated from the data we already fetch:
// no LLM, no network calls, no cost, fully private.

import type { Bar, Quote, Score, Signal } from "../api/types";

export interface ExplainerParagraph {
  heading: string;
  body: string;
}

export interface RiskFactor {
  name: string;
  value: string;
  note: string;
}

export interface RiskAssessment {
  level: "Low" | "Moderate" | "High" | "Extreme";
  score: number;
  note: string;
  factors: RiskFactor[];
}

// Per-signal plain-English explanations (shown as tooltips on the Score tab)

const SIGNAL_EXPLAINERS: Record<string, string> = {
  trend50:
    "The 50-day average smooths out the last ~2.5 months of prices. Trading above it usually means the short-term trend is up; below it means it's down.",
  trend200:
    "The 200-day average is a long-term 'fair value' line many investors watch. Above it = long-term uptrend; below it = long-term downtrend.",
  mom21:
    "How the price moved over the last month. Strong positive momentum can continue, but very stretched moves can reverse.",
  mom63:
    "How the price moved over the last quarter. A steadier signal than one month; it filters out short-term noise.",
  rsi:
    "RSI measures whether buyers or sellers have been in control. Over 70 = possibly overbought (could pull back). Under 30 = oversold (could bounce).",
  macd:
    "MACD compares a fast and a slow moving average. Positive and rising = bullish momentum building; negative and falling = bearish pressure.",
  valuation:
    "P/E = price ÷ earnings per share. A lower P/E can mean cheaper; a very high P/E means you're paying a lot for each dollar of profit.",
  growth:
    "How fast the company's revenue is growing year over year. Fast growers can justify higher prices; shrinking revenue is a warning sign.",
  profitability:
    "The share of every sales dollar the company keeps as profit. Higher margins = a stronger, more defensible business.",
  health:
    "Debt-to-equity compares what the company owes to what shareholders own. High debt means more financial risk, especially if rates rise.",
  dividend:
    "The dividend yield is the annual payout as a % of the price. Dividends reward holders, but an unusually high yield can flag trouble.",
};

export function explainSignal(id: string): string | undefined {
  return SIGNAL_EXPLAINERS[id];
}

// Per-metric plain-English explanations (Fundamentals tab tooltips)

const METRIC_EXPLAINERS: Record<string, string> = {
  marketCap: "Total value of the company = price × shares outstanding. Large caps (>$10B) tend to be more stable; small caps are riskier but can grow faster.",
  trailingPE: "Price you pay for every $1 of the company's past-year profit. Lower = cheaper relative to earnings.",
  forwardPE: "Same as P/E, but using analysts' forecast of next year's earnings instead of the past.",
  priceToBook: "Price ÷ book value. Below 1 can mean the market values the company at less than its assets: sometimes a bargain, sometimes a red flag.",
  trailingEps: "Earnings per share over the last year: the company's profit divided by its shares. The 'E' in P/E.",
  forwardEps: "Analysts' forecast of earnings per share for the coming year.",
  bookValue: "What shareholders would get per share if the company sold everything and paid its debts.",
  beta: "How much the stock jumps when the market moves. 1.0 = moves with the market; 1.5 = 50% more volatile; under 1 = calmer.",
  totalRevenue: "Total sales over the last year. Revenue growth is the engine of a stock price.",
  revenueGrowth: "Year-over-year change in sales. Consistent growth is what makes a stock a long-term winner.",
  earningsGrowth: "Year-over-year change in profit. Profit growth usually drives the price higher over time.",
  profitMargins: "Percent of each sales dollar kept as profit. 20%+ is strong; under 5% is thin.",
  grossMargins: "Profit after the direct cost of making the product: a measure of pricing power.",
  operatingMargins: "Profit after running the business (sales, admin, R&D) but before interest and tax.",
  returnOnEquity: "How much profit the company generates from shareholders' money. Higher is generally better.",
  freeCashFlow: "Cash left after keeping the business running: money available to pay dividends, buy back stock, or grow.",
  debtToEquity: "Debt as a % of shareholder equity. Under 100% is typically comfortable; over 150-200% is getting heavy.",
  currentRatio: "Short-term assets ÷ short-term debts. Above 1 means it can cover what it owes in the next year.",
  dividendYield: "Annual dividend as a % of the share price. 2-4% is a healthy yield; very high yields can be risky.",
  dividendRate: "The actual dollar amount paid per share each year.",
  sharesOutstanding: "How many shares exist. More shares can dilute ownership; buybacks reduce the count.",
  averageVolume: "Typical daily trading volume. Higher volume = easier to buy and sell without moving the price.",
  fiftyTwoWeekHigh: "Highest price in the last year. Prices near it can signal strength, or that it's getting expensive.",
  fiftyTwoWeekLow: "Lowest price in the last year. Near it can signal a bargain, or a business in trouble.",
  targetMeanPrice: "Average price target from analysts. Above the current price = analysts see upside.",
  recommendationMean: "Analysts' average rating on a 1-5 scale, where 1 = Strong Buy and 5 = Strong Sell.",
  numberOfAnalystOpinions: "How many analysts cover the stock. More coverage = more scrutiny (and more trustworthy forecasts).",
};

export function explainMetric(key: string): string | undefined {
  return METRIC_EXPLAINERS[key];
}

// Risk assessment (volatility, beta, leverage) with beginner-friendly labels

export function assessRisk(hist: Bar[], info: Record<string, unknown>): RiskAssessment {
  const factors: RiskFactor[] = [];

  // Volatility from daily returns (annualized).
  const closes = hist.map((b) => b.c).slice(-252);
  let vol = 0;
  if (closes.length > 30) {
    const returns = [];
    for (let i = 1; i < closes.length; i++) {
      if (closes[i - 1]) returns.push(closes[i] / closes[i - 1] - 1);
    }
    if (returns.length > 1) {
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / (returns.length - 1);
      vol = Math.sqrt(variance) * Math.sqrt(252) * 100;
    }
  }
  const volScore = vol >= 45 ? 2 : vol >= 25 ? 1 : 0;
  factors.push({
    name: "Price volatility",
    value: `${vol.toFixed(0)}%`,
    note: vol >= 45 ? "High, expect big swings" : vol >= 25 ? "Moderate, normal market swings" : "Low, a calmer stock",
  });

  const beta = Number(info.beta) || 0;
  const betaScore = beta >= 1.6 ? 2 : beta >= 1.05 ? 1 : 0;
  factors.push({
    name: "Market sensitivity (beta)",
    value: beta ? beta.toFixed(2) : "n/a",
    note: beta >= 1.6 ? "Moves much more than the market" : beta >= 1.05 ? "Moves a bit more than the market" : beta > 0 ? "Moves with or less than the market" : "Unknown",
  });

  const debt = Number(info.debtToEquity) || 0;
  const debtScore = debt >= 150 ? 2 : debt >= 60 ? 1 : 0;
  factors.push({
    name: "Debt load",
    value: debt ? `${debt.toFixed(0)}%` : "n/a",
    note: debt >= 150 ? "High debt on the balance sheet" : debt >= 60 ? "Normal-to-elevated debt" : "Low debt, financially sturdy",
  });

  const total = volScore + betaScore + debtScore;
  let level: RiskAssessment["level"] = "Low";
  if (total >= 6) level = "Extreme";
  else if (total >= 4) level = "High";
  else if (total === 3) level = "Moderate";

  const note: Record<RiskAssessment["level"], string> = {
    Low: "A relatively stable stock: smaller price swings and a cleaner balance sheet. Good starting place for beginners.",
    Moderate: "Average market risk. Prices move meaningfully but not erratically.",
    High: "Expect rough rides. Bigger gains and bigger losses than the market average.",
    Extreme: "One of the more volatile names; only risk capital should go here.",
  };

  return { level, score: total, note: note[level], factors };
}

// Plain-English summary of a recommendation score

function signalById(score: Score, id: string): Signal | undefined {
  return score.signals.find((s) => s.id === id);
}

export function explainScore(symbol: string, score: Score, _quote: Quote | null): ExplainerParagraph[] {
  const paragraphs: ExplainerParagraph[] = [];
  const s = (id: string) => signalById(score, id);

  // Verdict
  const strength =
    score.composite >= 75 ? "a strong buy signal" :
    score.composite >= 60 ? "a buy signal" :
    score.composite >= 45 ? "a hold signal" :
    score.composite >= 30 ? "a sell signal" : "a strong sell signal";
  paragraphs.push({
    heading: "The bottom line",
    body: `${symbol} scores ${score.composite.toFixed(0)} out of 100, which comes out to ${strength}. The score weighs technicals (${score.technical.toFixed(0)}/50: how the chart looks) and fundamentals (${score.fundamental.toFixed(0)}/50: how the business looks). It's a starting point for research, not a prediction.`,
  });

  // Trend
  const t50 = s("trend50");
  const t200 = s("trend200");
  if (t50 || t200) {
    const trendBits: string[] = [];
    if (t50) trendBits.push(t50.detail);
    if (t200) trendBits.push(t200.detail);
    const trendUp = t50 ? t50.score / t50.max >= 0.6 : false;
    paragraphs.push({
      heading: "The trend",
      body: `${trendBits.join(". ")}. In plain terms, the ${trendUp ? "short-term trend is helping" : "short-term trend is not helping"} the score right now.`,
    });
  }

  // Momentum & technical health
  const techBits = [s("mom21")?.detail, s("rsi")?.detail, s("macd")?.detail].filter((b): b is string => Boolean(b));
  if (techBits.length) {
    const lead = /^[-+]/.test(techBits[0]) ? `Price is ${techBits[0]}` : techBits[0][0].toUpperCase() + techBits[0].slice(1);
    paragraphs.push({
      heading: "Momentum & technical health",
      body: [lead, ...techBits.slice(1)].join(". ") + ".",
    });
  }

  // Fundamentals
  const fundSignals = score.signals.filter((sig) => sig.category === "fundamental");
  if (fundSignals.length) {
    paragraphs.push({
      heading: "The business",
      body: fundSignals.map((sig) => sig.detail).join(". ") + ".",
    });
  }

  return paragraphs;
}

// Plain-English 'what to watch' list derived from signal extremes

export function whatToWatch(score: Score, price: number | null | undefined): string[] {
  const watch: string[] = [];
  const s = (id: string) => signalById(score, id);

  const rsi = s("rsi");
  if (rsi && rsi.score <= 1.5) watch.push("RSI is in overbought territory. A pullback isn't guaranteed, but entry timing matters.");
  if (rsi && rsi.score >= 5) watch.push("RSI looks healthy: momentum is neither stretched nor broken.");

  const macd = s("macd");
  if (macd && macd.score <= 2.5) watch.push("MACD is negative: momentum is currently against the stock.");

  const valuation = s("valuation");
  if (valuation && valuation.score / valuation.max < 0.4) watch.push("The valuation is on the richer side: you're paying a premium for this business.");

  const growth = s("growth");
  if (growth && growth.score / growth.max >= 0.7) watch.push("Revenue growth is strong: that's what keeps this story alive.");

  const health = s("health");
  if (health && health.score / health.max < 0.4) watch.push("The balance sheet carries notable debt; worth reading the latest earnings call notes.");

  if (price == null) watch.push("Compare the price to the 52-week range on the chart tab for quick context.");
  return watch;
}
