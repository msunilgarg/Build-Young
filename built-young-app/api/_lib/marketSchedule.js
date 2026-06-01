// ============================ MARKET SCHEDULE (SERVER-ONLY) ============================
//
// The full simulated market-event schedule + per-event media map. This module is
// SERVER-ONLY: it MUST NOT be imported from any file under src/ (or otherwise pulled into
// the Vite client bundle). Keeping the FUTURE schedule off the client is the whole point —
// students could otherwise read every upcoming event from devtools and game the tuition
// prize (see CLAUDE.md "Tuition prize / anti-gaming").
//
// Consumers (all server-side):
//   - api/market-event.js        — returns the SINGLE current event for a {phase,week,checkin}
//   - api/cron/market-news.js     — builds the daily pre-class email drip
//   - test/* (Vitest, node env)   — engine + media tests import marketEventFor/mediaDrip here
//
// The browser app NEVER imports this. At advance time it fetches the current event from
// /api/market-event and falls back to a non-revealing placeholder when offline (demo/tests).
//
// Email/content builders (buildMediaDrip) + small static metadata (pct, WEEK_TITLES,
// ASSET_META, NEWSROOM_FROM_EMAIL) live in ../../src/marketMedia.js (client-safe). We import
// the PURE builder from there so the drip content stays byte-identical whether it's rendered
// in the browser (demo) or here (cron) — the schedule just resolves the event for it.

import { buildMediaDrip, NEWSROOM_FROM_EMAIL } from "../../src/marketMedia.js";

// Re-export the from-address so server callers have a single import surface if they want it.
export { NEWSROOM_FROM_EMAIL };

// Weeks 1–2 are the setup phase (you don't even choose an allocation until Week 2),
// so the market hasn't started moving the portfolio yet — assets are flat, though
// savings still earns its small yield.
export const FLAT_MACRO = { h: "Markets are quiet", d: "You're still getting set up — the market hasn't started moving your portfolio yet. Your savings still earns a little.", e: { stocks: 0, bonds: 0, reits: 0, bullion: 0, sav: .01 } };
// The live market arc begins on WEEK 3 — exactly when the curriculum teaches "Macro
// Forces on Investments." The 10 events are sequenced to land on lesson beats:
//   W5 Housing boom (as you buy a home) → W6 Recession (the very next week) →
//   W8 Market correction (just before the "Same Start, Different Results" review) →
//   W9 Tech-led rally (rewarding students who rebalanced in Active Investing) →
//   W11 Geopolitical jitters / gold spike (as you learn bullion in "Beyond Stocks") →
//   W12 Year-end melt-up (the finale).
// each advance applies these returns to the asset classes + savings yield
export const MACRO = [
  { h: "The Fed hikes rates", d: "Borrowing gets pricier. Bonds slip, gold catches a bid, savings yields rise.", e: { stocks: -.03, bonds: -.02, reits: -.025, bullion: .04, sav: .015 } },   // Week 3
  { h: "Inflation runs hot", d: "Prices jump. Hard assets shine while bonds lag.", e: { stocks: -.015, bonds: -.03, reits: .03, bullion: .06, sav: .015 } },                                  // Week 4
  { h: "Housing boom", d: "Property values climb across the board.", e: { stocks: .015, bonds: .005, reits: .055, bullion: .005, sav: .01 } },                                                // Week 5
  { h: "Recession fears spike", d: "Investors flee to safety. Stocks fall, bonds and gold rise.", e: { stocks: -.06, bonds: .03, reits: -.03, bullion: .035, sav: .01 } },                   // Week 6
  { h: "Soft landing hopes", d: "Cooling inflation without a crash. A relief rally.", e: { stocks: .045, bonds: .02, reits: .02, bullion: -.01, sav: .01 } },                                 // Week 7
  { h: "Market correction", d: "A sharp pullback trims the froth.", e: { stocks: -.045, bonds: .01, reits: -.02, bullion: .015, sav: .01 } },                                                 // Week 8
  { h: "Tech-led rally", d: "Risk appetite roars back and equities surge.", e: { stocks: .07, bonds: .005, reits: .02, bullion: -.02, sav: .01 } },                                           // Week 9
  { h: "Rate cuts begin", d: "The Fed eases. Bonds and growth stocks cheer.", e: { stocks: .05, bonds: .03, reits: .03, bullion: .01, sav: -.005 } },                                         // Week 10
  { h: "Geopolitical jitters", d: "Uncertainty sends gold up and stocks wobbling.", e: { stocks: -.025, bonds: .015, reits: -.01, bullion: .05, sav: .01 } },                                 // Week 11
  { h: "Year-end melt-up", d: "Optimism into the close lifts most assets.", e: { stocks: .04, bonds: .015, reits: .025, bullion: .005, sav: .01 } },                                          // Week 12
];
export const CHECKIN_MACRO = [
  { h: "Q1 — Inflation cools", d: "Bonds recover; gold gives back gains.", e: { stocks: .03, bonds: .025, reits: .02, bullion: -.02, sav: .012 } },
  { h: "Q2 — Surprise rate hike", d: "A hot jobs print rattles markets.", e: { stocks: -.04, bonds: -.02, reits: -.03, bullion: .035, sav: .015 } },
  { h: "Q3 — Earnings strength", d: "Corporate profits push equities higher.", e: { stocks: .055, bonds: .005, reits: .02, bullion: -.01, sav: .012 } },
  { h: "Q4 — Property repricing", d: "Real estate cools as listings rise.", e: { stocks: .01, bonds: .01, reits: -.04, bullion: .01, sav: .012 } },
  { h: "Q5 — Broad rally", d: "A goldilocks quarter lifts nearly everything.", e: { stocks: .04, bonds: .02, reits: .03, bullion: .015, sav: .012 } },
  { h: "Q6 — Volatile finish", d: "Choppy markets reward the diversified.", e: { stocks: -.02, bonds: .02, reits: .005, bullion: .03, sav: .012 } },
];

// The single source of truth for "which market event is happening now."
// Course: Weeks 1–2 are flat (setup), the live arc runs Weeks 3–12 (MACRO[week-3]).
// Check-ins: one CHECKIN_MACRO event per monthly check-in.
export function marketEventFor(phase, week, checkin) {
  if (phase === "course") return week <= 2 ? FLAT_MACRO : MACRO[(week - 3) % MACRO.length];
  return CHECKIN_MACRO[checkin % CHECKIN_MACRO.length];
}

/* ============================ MARKET MEDIA ============================
 * "Simulated media": before each class (Weeks 3–12), the in-sim event breaks and
 * a 3-day email drip goes out (day -3 breaking → -2 analysis → -1 research challenge),
 * each pointing to REAL, primary-source resources so students can research the
 * real-world episode the sim event is modeled on and walk in with their own view.
 * Keyed by the event headline. Every `url` is a primary/official source — per the
 * statistics-integrity bar in CLAUDE.md, re-verify each link before launch.
 */
export const MEDIA = {
  "The Fed hikes rates": {
    analog: "the Federal Reserve's 2022 campaign, when it lifted rates from near zero to over 4% in a single year — the fastest pace since the 1980s",
    watch: "interest rates, bond prices, and savings yields",
    question: "If borrowing money gets more expensive, who benefits and who gets hurt — and would you rather hold long-term bonds or cash earning a higher yield right now?",
    resources: [
      { label: "Federal Reserve — FOMC meetings & statements", url: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm" },
      { label: "FRED — Federal Funds Rate (chart the real history)", url: "https://fred.stlouisfed.org/series/FEDFUNDS" },
    ],
  },
  "Inflation runs hot": {
    analog: "June 2022, when U.S. inflation hit 9.1% over the prior year — the biggest jump in four decades",
    watch: "the prices of hard assets (gold, real estate) versus bonds",
    question: "If prices are rising fast, which of your assets are likely to keep up — and which quietly lose buying power just sitting there?",
    resources: [
      { label: "BLS — Consumer prices up 9.1% over the year ended June 2022 (40-year high)", url: "https://www.bls.gov/opub/ted/2022/consumer-prices-up-9-1-percent-over-the-year-ended-june-2022-largest-increase-in-40-years.htm" },
      { label: "FRED — Consumer Price Index (CPIAUCSL)", url: "https://fred.stlouisfed.org/series/CPIAUCSL" },
    ],
  },
  "Housing boom": {
    analog: "2021, when U.S. home prices climbed almost 19% in a single year",
    watch: "home prices and mortgage rates",
    question: "When home prices climb fast, is it a better time to buy a house or to rent and invest the difference? What would you need to know to decide?",
    resources: [
      { label: "FRED — Case-Shiller U.S. National Home Price Index (CSUSHPINSA)", url: "https://fred.stlouisfed.org/series/CSUSHPINSA" },
      { label: "FRED — 30-Year Fixed Mortgage Rate (MORTGAGE30US)", url: "https://fred.stlouisfed.org/series/MORTGAGE30US" },
    ],
  },
  "Recession fears spike": {
    analog: "the 2008 financial crisis, when frightened investors poured into Treasuries and gold while stocks tumbled",
    watch: "Treasuries and gold — the classic safe havens",
    question: "When everyone's scared, money rushes into 'safe' assets. Which of your holdings is the safe haven here — and is now a time to sell, or to keep buying?",
    resources: [
      { label: "Federal Reserve History — The Great Recession (2007–09)", url: "https://www.federalreservehistory.org/essays/great-recession-of-200709" },
      { label: "FRED — S&P 500 (SP500)", url: "https://fred.stlouisfed.org/series/SP500" },
    ],
  },
  "Soft landing hopes": {
    analog: "2023–2024, when U.S. inflation cooled from about 9% toward 3% without the economy falling into recession — the hoped-for 'soft landing'",
    watch: "inflation and the unemployment rate",
    question: "If the economy cools without a crash, should you get more aggressive or stay cautious? What signal would change your mind?",
    resources: [
      { label: "Investopedia — Soft Landing (definition)", url: "https://www.investopedia.com/terms/s/softlanding.asp" },
      { label: "FRED — U.S. Unemployment Rate (UNRATE)", url: "https://fred.stlouisfed.org/series/UNRATE" },
    ],
  },
  "Market correction": {
    analog: "late 2018, when the S&P 500 fell nearly 20% in about three months — then recovered the following year",
    watch: "how far stocks fall and how fast they recover",
    question: "Stocks just dropped sharply. Is this a reason to sell, or a chance to buy at lower prices? How would market history guide you?",
    resources: [
      { label: "Investopedia — Market Correction (definition)", url: "https://www.investopedia.com/terms/c/correction.asp" },
      { label: "FRED — S&P 500 (SP500)", url: "https://fred.stlouisfed.org/series/SP500" },
    ],
  },
  "Tech-led rally": {
    analog: "2023, when excitement about AI (led by chipmaker Nvidia) drove a tech-heavy surge that lifted the Nasdaq about 43%",
    watch: "tech-stock valuations and how concentrated the rally is",
    question: "When one sector soars, is it smart to pile in or to rebalance away some gains? What's the risk of chasing a hot rally?",
    resources: [
      { label: "FRED — Nasdaq Composite Index (NASDAQCOM)", url: "https://fred.stlouisfed.org/series/NASDAQCOM" },
      { label: "Investopedia — Bull Market (definition)", url: "https://www.investopedia.com/terms/b/bullmarket.asp" },
    ],
  },
  "Rate cuts begin": {
    analog: "September 2024, when the Federal Reserve cut interest rates by half a percentage point — its first cut in over four years",
    watch: "bond prices and growth stocks",
    question: "If interest rates start falling, what tends to happen to bonds, stocks, and your savings yield? Who wins, who loses?",
    resources: [
      { label: "Federal Reserve — FOMC statement, Sept 18, 2024 (first cut since 2020)", url: "https://www.federalreserve.gov/newsevents/pressreleases/monetary20240918a.htm" },
      { label: "FRED — Federal Funds Rate (FEDFUNDS)", url: "https://fred.stlouisfed.org/series/FEDFUNDS" },
    ],
  },
  "Geopolitical jitters": {
    analog: "early 2022, when geopolitical shock sent investors rushing into gold as a safe haven while stocks swung wildly",
    watch: "gold and other safe-haven assets",
    question: "When the world feels uncertain, why does gold often rise? Should a long-term teen investor react to scary headlines at all?",
    resources: [
      { label: "Investopedia — Safe-Haven assets (definition)", url: "https://www.investopedia.com/terms/s/safe-haven.asp" },
      { label: "World Gold Council — gold price history", url: "https://www.gold.org/goldhub/data/gold-prices" },
    ],
  },
  "Year-end melt-up": {
    analog: "late 2023, when a broad year-end rally lifted stocks and bonds together as the Fed signaled rate cuts ahead",
    watch: "whether the rally is broad or driven by just a few names",
    question: "After a big run-up, do you lock in gains, keep riding, or rebalance? What does your own plan say to do?",
    resources: [
      { label: "Investopedia — Santa Claus Rally (definition)", url: "https://www.investopedia.com/terms/s/santaclausrally.asp" },
      { label: "FRED — S&P 500 (SP500)", url: "https://fred.stlouisfed.org/series/SP500" },
    ],
  },
};

// Build the 3-day pre-class media drip for the CURRENT course week's event.
// Resolves the event + its media from the (server-only) schedule, then delegates to the
// shared client-safe builder so the content is byte-identical to the original. Returns []
// for the flat setup weeks (1–2), for check-ins, or any event without authored media.
//
// `opts.fromEmail` is forwarded to the builder (defaults to the historical address).
export function mediaDrip(s, batch, opts = {}) {
  if (!s || s.phase !== "course") return [];
  const ev = marketEventFor("course", s.week, s.checkin);
  const media = MEDIA[ev.h];
  if (!media) return [];
  return buildMediaDrip(ev, media, s, opts);
}

// The market-event resources tied to a COURSE week — the SAME links the pre-class drip
// emails — surfaced so the dashboard can track them by week for review/catch-up.
// Empty for the flat setup weeks (1–2), which have no market event.
export function weekResources(week) {
  const ev = marketEventFor("course", week, 0);
  return (MEDIA[ev.h] && MEDIA[ev.h].resources) || [];
}
