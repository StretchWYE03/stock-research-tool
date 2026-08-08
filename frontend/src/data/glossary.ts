export interface GlossaryArticle {
  slug: string;
  title: string;
  icon: string;
  summary: string;
  body: string[];
  seeAlso?: string;
}

export const GLOSSARY: GlossaryArticle[] = [
  {
    slug: "candlesticks",
    title: "How to read a candlestick chart",
    icon: "🕯️",
    summary: "Every candle shows one day (or week) of trading: the open, high, low, and close.",
    body: [
      "A candlestick is a one-line summary of a trading period. The wide part (the 'body') runs from the open price to the close price. The thin lines (the 'wicks') show the highest and lowest prices reached that period.",
      "In Ticker, a green candle means the price closed higher than it opened (a good day), and a red candle means it closed lower. A tiny body with long wicks means the price swung a lot but ended where it started: indecision.",
      "The colored bars along the bottom are volume: how many shares traded each period. Big volume next to a big move means the move is 'real'; a move on thin volume is easier to reverse.",
    ],
    seeAlso: "Open any stock and use the 1D-5Y range buttons to see different time scales.",
  },
  {
    slug: "pe-ratio",
    title: "What is the P/E ratio?",
    icon: "🧮",
    summary: "Price-to-earnings = how much you pay for every $1 of the company's profit.",
    body: [
      "The P/E ratio divides the share price by the company's earnings per share. If a stock trades at $100 and earns $10 per share, its P/E is 10: you're paying 10× its annual profit.",
      "A lower P/E can mean the stock is cheaper relative to its earnings. A higher P/E usually means investors expect faster future growth (or that the stock is expensive).",
      "P/E is most useful compared to the same company's history or its industry; a bank at 12× and a tech stock at 35× aren't directly comparable.",
    ],
    seeAlso: "Look at 'Trailing P/E' and 'Forward P/E' on any stock's Fundamentals tab.",
  },
  {
    slug: "market-cap",
    title: "Market cap: big, mid, or small?",
    icon: "🏢",
    summary: "Market cap = price × shares outstanding. It sizes up the whole company.",
    body: [
      "Market capitalization is the total dollar value of a company: the share price multiplied by every share that exists.",
      "Roughly: Large cap = over $10B (usually stable, well-known names). Mid cap = $2-10B. Small cap = under $2B (higher growth potential, higher risk).",
      "Beginners often start with large caps: they're more researched, more liquid (easier to buy/sell), and generally less volatile.",
    ],
    seeAlso: "The Screener page sorts by market cap, so you can filter to large caps only.",
  },
  {
    slug: "rsi",
    title: "RSI, overbought & oversold",
    icon: "📊",
    summary: "RSI is a 0-100 meter of whether buyers or sellers have been in control.",
    body: [
      "The Relative Strength Index measures the speed and size of recent price moves. Above 70 is often called 'overbought': the stock has run up fast and may be due for a breather. Below 30 is 'oversold': it has fallen fast and could bounce.",
      "It's a momentum gauge, not a crystal ball. A strong stock can stay 'overbought' for a long time; a falling knife can stay 'oversold'. Use RSI as context, not as a trigger.",
      "In Ticker's score, RSI between ~40 and 65 scores well: healthy momentum without being stretched.",
    ],
    seeAlso: "Hover the RSI row on the Score tab for the live number and what it means.",
  },
  {
    slug: "dividend",
    title: "Dividends & yield",
    icon: "💵",
    summary: "Dividends are profit shared with shareholders; yield is that payout as a % of price.",
    body: [
      "Some companies pay a slice of their profit to shareholders, usually quarterly. That's a dividend. The dividend yield is the annual payout divided by the share price.",
      "A 3% yield on a $100 stock means you collect ~$3 per share per year while you hold it. Not all companies pay dividends; fast growers often reinvest instead.",
      "Be cautious with very high yields (8%+): the market may be pricing in a dividend cut or trouble ahead.",
    ],
    seeAlso: "Check 'Dividend yield' on the Fundamentals tab, and the 'Dividend yield' signal in the score.",
  },
  {
    slug: "volatility",
    title: "Volatility & risk",
    icon: "🌊",
    summary: "Volatility is how much a price swings. More swing = more risk (and more potential reward).",
    body: [
      "A stock that moves 1% a day is calmer than one that moves 3% a day, even if both end the year in the same place. Annualized volatility turns those daily swings into a yearly number.",
      "Beta compares a stock's swings to the overall market. Beta 1 = moves with the market. Beta 1.5 = 50% wilder. Beta 0.7 = calmer.",
      "Risk isn't bad; it's the price of return. The trick is sizing positions so a bad month doesn't hurt you.",
    ],
    seeAlso: "The Score tab includes a Risk snapshot that rates volatility, beta, and debt on a Low→Extreme scale.",
  },
  {
    slug: "moving-averages",
    title: "Moving averages (SMA 50 / 200)",
    icon: "〰️",
    summary: "A moving average smooths prices so you can see the trend behind the noise.",
    body: [
      "A moving average is just the average price over the last N days, plotted as a line. The 50-day line shows the short-term trend; the 200-day line shows the long-term trend.",
      "Price above the 200-day average = the stock is in a long-term uptrend. Price below = long-term downtrend. When the 50-day crosses above the 200-day it's called a 'golden cross' (bullish); below is a 'death cross' (bearish).",
      "On any chart in Ticker, the yellow line is the 50-day and the blue line is the 200-day average.",
    ],
    seeAlso: "The yellow (SMA 50) and blue (SMA 200) lines on every stock chart.",
  },
  {
    slug: "diversification",
    title: "Why you shouldn't own just one stock",
    icon: "🧺",
    summary: "Spreading money across companies and sectors smooths out the ups and downs.",
    body: [
      "Even the best company can fall 30-50% in a bad year. If all your money is in it, you feel all of that. Spread across 10-20 companies and several sectors, the winners cushion the losers.",
      "That's why the paper-trading account in Ticker starts with $100,000; try buying 5-8 different names from different sectors and watch how the portfolio behaves.",
      "Diversification won't prevent losses; it prevents a single mistake from being catastrophic.",
    ],
    seeAlso: "Use the Screener with different sectors selected to build a balanced list.",
  },
  {
    slug: "score",
    title: "How Ticker's score works",
    icon: "🎯",
    summary: "A 0-100 composite of 11 technical and fundamental signals, rated Strong Buy → Strong Sell.",
    body: [
      "Ticker's recommendation score weighs 6 technical signals (trend, momentum, RSI, MACD: how the chart looks) and 5 fundamental signals (valuation, growth, profitability, balance sheet, dividend: how the business looks).",
      "Each signal earns up to its maximum points, and the total is scaled to 0-100. Ratings: 75+ Strong Buy, 60+ Buy, 45+ Hold, 30+ Sell, below 30 Strong Sell.",
      "It's a transparent, rules-based research filter; every signal and its score is shown on the Score tab, and you can hover any row to learn what it measures. It is not investment advice.",
    ],
    seeAlso: "Every signal on the Score tab has a hover tooltip explaining what it measures.",
  },
];
