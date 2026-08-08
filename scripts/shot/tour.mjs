// One-off screenshot tour for the Ticker README.
// Captures every page in light + dark theme using system Edge (no browser download).
// Usage:  node tour.mjs
// Output: ../../docs/screenshots/<page>-<theme>.png
import { mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const EDGE =
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = "http://localhost:5173";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "docs", "screenshots");

// Each page: route + a waitForSelector that proves real content rendered.
const PAGES = [
  { name: "dashboard", route: "/", wait: ".index-card" },
  { name: "screener", route: "/screener", wait: ".data-table tbody tr" },
  { name: "backtest", route: "/backtest", wait: ".metric-grid" },
  { name: "paper", route: "/paper", wait: ".saved-note" },
  { name: "watchlist", route: "/watchlist", wait: ".page-head" },
  { name: "learn", route: "/learn", wait: ".learn-article" },
  { name: "stock", route: "/stock/AAPL", wait: ".similar-card" }, // Score tab clicked below
  { name: "disclaimer", route: "/disclaimer", wait: ".page" },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function capture(page, name, theme) {
  // Fresh localStorage per theme so app state is deterministic (tour only —
  // the user's real profile is untouched; this runs in a throwaway profile).
  await page.evaluateOnNewDocument(
    ([themeVal, consent, watchlist, portfolio]) => {
      localStorage.setItem("ticker.theme", themeVal);
      localStorage.setItem("ticker.consent.v1", consent);
      localStorage.setItem("ticker.watchlist.v1", JSON.stringify(watchlist));
      localStorage.setItem("ticker.paper.v1", JSON.stringify(portfolio));
    },
    [
      theme,
      "accepted",
      ["AAPL", "MSFT", "NVDA", "SHOP.TO", "RY.TO"],
      {
        cash: 98484.3,
        positions: [
          { symbol: "SHOP.TO", name: "Shopify Inc.", shares: 10, avgCost: 151.57, openedAt: 1754000000000 },
          { symbol: "AAPL", name: "Apple Inc.", shares: 25, avgCost: 218.4, openedAt: 1753000000000 },
          { symbol: "RY.TO", name: "Royal Bank of Canada", shares: 40, avgCost: 172.1, openedAt: 1752000000000 },
        ],
        history: [
          { id: "t3", symbol: "RY.TO", name: "Royal Bank of Canada", side: "BUY", shares: 40, price: 172.1, at: 1752000000000 },
          { id: "t2", symbol: "AAPL", name: "Apple Inc.", side: "BUY", shares: 25, price: 218.4, at: 1753000000000 },
          { id: "t1", symbol: "SHOP.TO", name: "Shopify Inc.", side: "BUY", shares: 10, price: 151.57, at: 1754000000000 },
        ],
      },
    ]
  );

  await page.goto(`${BASE}${PAGES.find((p) => p.name === name).route}`, {
    waitUntil: "networkidle2",
    timeout: 90_000,
  });

  if (name === "stock") {
    // Open the Score tab (flagship feature: explainer + similar stocks)
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Score");
      btn?.click();
    });
  }

  // Let data/charts settle, then wait for the page's proof selector
  await sleep(1200);
  const pageDef = PAGES.find((p) => p.name === name);
  try {
    await page.waitForSelector(pageDef.wait, { timeout: 60_000 });
  } catch (e) {
    console.warn(`  ! no content for ${name} (${theme}): ${e.message.split("\n")[0]}`);
  }
  await sleep(2500); // charts + tapes + layout animations

  const file = join(OUT, `${name}-${theme}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`  saved ${file}`);
}

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: true,
  args: ["--window-size=1440,900", "--force-device-scale-factor=2"],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
});

try {
  await mkdir(OUT, { recursive: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(60_000);

  for (const theme of ["light", "dark"]) {
    console.log(`theme: ${theme}`);
    for (const p of PAGES) {
      try {
        await capture(page, p.name, theme);
      } catch (e) {
        console.error(`  FAILED ${p.name} (${theme}): ${e.message.split("\n")[0]}`);
      }
    }
  }
} finally {
  await browser.close();
}
console.log("tour complete");
