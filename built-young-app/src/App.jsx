import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from "react";
import {
  TrendingUp, TrendingDown, Home, Car, Wallet, PiggyBank, LineChart as LineIcon,
  Shield, Coins, Building2, GraduationCap, ArrowRight, Check, Lock, Newspaper,
  CircleDollarSign, Sparkles, AlertTriangle, ShoppingBag, Landmark, Video, Mail, Briefcase,
  Hourglass, Anchor, MessageCircle, Linkedin, BookOpen,
} from "lucide-react";
// Client-safe market-media bits live in a dependency-free module (no React/lucide) so the
// serverless cron + the server-only schedule module can share the SAME builders. The FUTURE
// market SCHEDULE (FLAT_MACRO/MACRO/CHECKIN_MACRO/marketEventFor) + the MEDIA map are NOT
// imported here on purpose — they're server-only (api/_lib/marketSchedule.js) so they never
// ship in the client bundle (anti-gaming for the tuition prize; see CLAUDE.md). At advance
// time the dashboard fetches the SINGLE current event from /api/market-event and falls back
// to a non-revealing placeholder when offline (demo/tests). App.jsx layers React/lucide bits
// (ASSETS icons, WEEKS subtitles) on top.
import { pct, ASSET_META, buildMediaDrip } from "./marketMedia.js";
// Re-export the client-safe content so callers importing from "../src/App.jsx" still work.
export { pct, buildMediaDrip } from "./marketMedia.js";
// recharts is heavy (~344 KB) and only used in the dashboard — load it on demand
// so the landing/enroll/call pages don't pay for it.
const Charts = React.lazy(() => import("./Charts.jsx"));

const SUNIL_PHOTO = "data:image/jpeg;base64,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";

/* ============================ THEME ============================ */
const C = {
  paper: "#faf9f8",
  paper2: "#f3f2f1",
  card: "#ffffff",
  ink: "#242424",
  ink2: "#424242",
  muted: "#605e5c",
  line: "#e1dfdd",
  emerald: "#0067b8",
  emeraldLite: "#0078d4",
  gold: "#5c2e91",
  goldLite: "#c19c00",
  rust: "#d13438",
  sky: "#038387",
  pink: "#c2298a",
  turq: "#0a7d85",
  green: "#178045",
};

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap');
* { box-sizing: border-box; }
.flp { font-family: "Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif; color: ${C.ink}; -webkit-font-smoothing: antialiased; }
.disp { font-family: "Space Grotesk","Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif; letter-spacing: -.02em; }
.grad { background: linear-gradient(95deg, ${C.emerald} 0%, ${C.turq} 45%, ${C.green} 100%); -webkit-background-clip: text; background-clip: text; color: transparent; -webkit-text-fill-color: transparent; }
.grad-warm { background: linear-gradient(95deg, ${C.emerald} 0%, ${C.gold} 55%, ${C.pink} 100%); -webkit-background-clip: text; background-clip: text; color: transparent; -webkit-text-fill-color: transparent; }
@keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.rise{animation:rise .45s cubic-bezier(.1,.9,.2,1) both;}
.btn{cursor:pointer;border:none;font-family:inherit;font-weight:600;transition:.1s ease;}
.btn:hover{filter:brightness(.93);}
.btn:active{filter:brightness(.87);}
.tab{cursor:pointer;transition:.12s;}
input,select{font-family:inherit;}
input:focus,select:focus{outline:2px solid ${C.emerald};outline-offset:-1px;}
:focus-visible{outline:2px solid ${C.emerald};outline-offset:2px;border-radius:3px;}
.lift{transition:box-shadow .15s, border-color .15s;}
.lift:hover{box-shadow:0 6.4px 14.4px rgba(0,0,0,.10),0 1.2px 3.6px rgba(0,0,0,.09);border-color:#c8c6c4;}
@keyframes drawIn{to{stroke-dashoffset:0}}
@keyframes hpFade{from{opacity:0}to{opacity:1}}
@keyframes hpPop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:scale(1)}}
@keyframes livePulse{0%,100%{opacity:1}50%{opacity:.2}}
.hp-line{stroke-dasharray:1;stroke-dashoffset:1;animation:drawIn 1.5s ease-out .3s forwards;}
.hp-area{opacity:0;animation:hpFade .9s ease 1s forwards;}
.hp-end{opacity:0;animation:hpFade .4s ease 1.7s forwards;}
.hp-donut{transform-box:fill-box;transform-origin:center;animation:hpPop .7s cubic-bezier(.2,.8,.2,1) .5s both;}
.hp-live{animation:livePulse 1.8s ease-in-out infinite;}
.enroll-grid{display:grid;grid-template-columns:1fr 320px;gap:22px;align-items:start;}
@media(max-width:760px){.enroll-grid{grid-template-columns:1fr;}}
@media(max-width:560px){.nav-talk{display:none!important;}}
::-webkit-scrollbar{width:12px;height:12px}::-webkit-scrollbar-thumb{background:#c8c6c4}::-webkit-scrollbar-track{background:${C.paper2}}
`;

const fmt = (n) => (n < 0 ? "-$" : "$") + Math.abs(Math.round(n)).toLocaleString();
// `pct` now comes from ./marketMedia.js (imported above) so the email content is single-sourced.
// Lightweight email check — good enough to gate the UI (server-side validation is authoritative).
export const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((e || "").trim());

/* ============================ DATA ============================ */
// Cohorts (SEASONS + BATCHES + seasonLabel) live in ./cohorts.js — a dependency-free
// module shared with the cron scheduler — and are imported here + re-exported below.
import { SEASONS, BATCHES, seasonLabel } from "./cohorts.js";
export { BATCHES } from "./cohorts.js";

/* ============================ PRODUCTION CONFIG ============================
 * Fill these in to go live. Empty values fall back to the safe demo flow,
 * so the app keeps working for testing before any accounts are connected.
 *   - stripeLinks: a Stripe Payment Link URL per batch id (Dashboard → Payment Links).
 *       Set each link's success URL to:  https://YOURDOMAIN/?enrolled={batchId}
 *   - calendlyUrl: your 15-min event link, e.g. https://calendly.com/you/intro
 *   - contactEmail / brandDomain: shown in the UI and emails.
 */
const CONFIG = {
  brandDomain: "buildyoung.com",
  contactEmail: "team@buildyoung.com",
  linkedinUrl: "https://www.linkedin.com/in/msunilgarg",
  calendlyUrl: "", // e.g. "https://calendly.com/sunil-buildyoung/15min"
  // One Stripe Payment Link per batch id (set each link's success URL to
  // https://YOURDOMAIN/?enrolled={batchId}). Filled per id below; empty = demo flow.
  stripeLinks: Object.fromEntries(BATCHES.map((b) => [b.id, ""])),
  // Email: set emailEnabled true once the /api/send-email function + provider key are live.
  emailEnabled: false,
  emailEndpoint: "/api/send-email",
};
// Fire-and-forget email send. No-ops gracefully in demo/local; UI toast still shows.
function sendEmail(to, subject, body) {
  if (!CONFIG.emailEnabled || !to) return;
  try {
    fetch(CONFIG.emailEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, body }),
    }).catch(() => {});
  } catch (e) { /* ignore */ }
}
const PENDING_KEY = "by:pending-enroll";

// Key + label come from the shared ASSET_META (single-sourced with the scheduler);
// the color + lucide icon are UI-only and layered on here, keyed by asset key.
const ASSET_UI = {
  stocks: { color: C.emerald, icon: TrendingUp },
  bonds: { color: C.turq, icon: Landmark },
  reits: { color: C.green, icon: Building2 },
  bullion: { color: C.goldLite, icon: Coins },
};
export const ASSETS = ASSET_META.map((a) => ({ ...a, ...ASSET_UI[a.key] }));

// The market-event SCHEDULE is server-only (api/_lib/marketSchedule.js) — see the import
// note up top. The client learns the current event via /api/market-event (fetchMarketEvent
// below), with a non-revealing placeholder fallback when offline (demo/tests).
//
// Non-revealing placeholder: a neutral "Markets are moving" event with zero-ish effects.
// It keeps the demo running offline WITHOUT shipping any real future event. The Weeks 1–2
// setup phase still reads as flat; from Week 3 on, the offline demo just shows this generic
// event (the live deployment shows the real one fetched from the endpoint).
const PLACEHOLDER_EVENT = { h: "Markets are moving", d: "Markets are open and your portfolio is live. The class will walk through what's driving prices this week.", e: { stocks: 0, bonds: 0, reits: 0, bullion: 0, sav: .01 } };
const FLAT_PLACEHOLDER = { h: "Markets are quiet", d: "You're still getting set up — the market hasn't started moving your portfolio yet. Your savings still earns a little.", e: { stocks: 0, bonds: 0, reits: 0, bullion: 0, sav: .01 } };

// Synchronous, schedule-free fallback used before/instead of a successful fetch. Weeks 1–2
// are genuinely flat; everything else is the neutral placeholder (never a real future event).
function placeholderEventFor(phase, week) {
  if (phase === "course" && week <= 2) return FLAT_PLACEHOLDER;
  return PLACEHOLDER_EVENT;
}

// Fetch the SINGLE current market event from the server. Returns the event ({h,d,e[,media]})
// or null on any failure (offline/demo/local/tests) so callers fall back gracefully.
async function fetchMarketEvent(phase, week, checkin) {
  if (typeof fetch !== "function") return null;
  try {
    const qs = phase === "course"
      ? `phase=course&week=${encodeURIComponent(week)}`
      : `phase=checkin&checkin=${encodeURIComponent(checkin)}`;
    const r = await fetch(`/api/market-event?${qs}`, { headers: { Accept: "application/json" } });
    if (!r.ok) return null;
    const data = await r.json();
    return data && data.event ? data.event : null;
  } catch (e) {
    return null;
  }
}

// Each week carries its lesson (t/s/act) and an optional `materials` list — the place the
// team adds weekly class content as it's built (verified, primary-source links only, per the
// statistics-integrity bar). A few are seeded as examples; the rest show "coming soon" in the
// Course hub until filled in.
const WEEKS = [
  { act: 1, t: "Set Up Your Paycheck", s: "W-4, 401(k) + match, gross vs. net.", action: "settings",
    materials: [{ label: "IRS — About Form W-4", url: "https://www.irs.gov/forms-pubs/about-form-w-4" }] },
  { act: 1, t: "Savings & Investing + Compounding", s: "Auto-fund accounts; pick your risk style and asset mix.", action: "allocation",
    materials: [
      { label: "Investor.gov — Compound Interest Calculator", url: "https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator" },
      { label: "Investor.gov — What is compound interest?", url: "https://www.investor.gov/additional-resources/information/youth/teachers-classroom-resources/what-compound-interest" },
    ] },
  { act: 1, t: "Macro Forces on Investments", s: "How inflation, rates and recessions move each asset class.", action: "macro" },
  { act: 2, t: "Big Purchases: The Framework", s: "Buy vs. rent, APR, good vs. bad debt, total cost of ownership.", action: "framework" },
  { act: 2, t: "Big Purchases: Making the Call", s: "Choose and finance your home and car.", action: "buy" },
  { act: 2, t: "Budgeting: Surprises & Temptations", s: "Bills autopay — handle an emergency and a spree.", action: "budget" },
  { act: 2, t: "Credit & Credit Scores", s: "Cards, interest, and how your score sets your rates.", action: "credit",
    materials: [
      { label: "CFPB — Credit reports and scores", url: "https://www.consumerfinance.gov/consumer-tools/credit-reports-and-scores/" },
      { label: "CFPB — Understand your credit score", url: "https://www.consumerfinance.gov/consumer-tools/credit-reports-and-scores/understand-your-credit-score/" },
    ] },
  { act: 2, t: "Portfolio Review: Same Start, Different Results", s: "Tally net worth and trace what drove the spread.", action: "review" },
  { act: 3, t: "Active Investing", s: "Review, diversify, rebalance.", action: "rebalance" },
  { act: 3, t: "Build Something: Earning in an AI World", s: "Be a builder, not just a consumer — turn a skill (and AI) into income.", action: "hustle" },
  { act: 3, t: "Beyond Stocks: Growing & Protecting Wealth", s: "Bullion, real estate, insurance — and a safety net.", action: "protect" },
  { act: 3, t: "Capstone: Net Worth & Plan", s: "Total it all up and tell your story.", action: "capstone" },
];
const ACTS = { 1: "Set Up Your Money", 2: "Major Decisions & Independence", 3: "Grow & Protect" };

// ============================ SIM ECONOMY ============================
// One place for every dollar figure, re-tuned to a realistic young-adult budget around a
// $10,000 paycheck per class. Keep purchases funds-gated against this so the "save toward a
// goal / live with the payments" lessons hold. Change PAY here and the rest stays in scale.
export const PAY = 10000;            // take-home paycheck earned each class
const TAX_RATE = 0.15;               // flat tax on the paycheck
export const LIVING = 3500;          // living costs per period (rent, food, utilities, phone)
export const HOME = { price: 400000, down: 20000, mortgage: 380000, payment: 2500 }; // 5% down
export const CAR = { price: 30000, down: 6000, loan: 24000, payment: 600 };          // 20% down
export const EMERGENCY = 2500;       // surprise car-repair (Week 6)
export const SPREE = 1500;           // shopping-spree temptation (Week 6)
export const INSURANCE = 1500;       // insurance policy (Act 3)
export const ALT_BUY = 5000;         // bullion / REIT lump buy (Act 3)
export const PE_BUY = 15000;         // private-equity lump buy (Act 3, illiquid)
export const HUSTLE_START = 2000;    // cost to launch the build (Week 10)
const HUSTLE_BASE = 1200, HUSTLE_VAR = 2600; // extra income per period once running
const CARD_DEBT_HEAVY = 15000;       // carried-balance threshold that dings the credit score

export const RISK_PRESETS = {
  conservative: { stocks: .35, bonds: .45, reits: .12, bullion: .08 },
  balanced: { stocks: .55, bonds: .25, reits: .12, bullion: .08 },
  aggressive: { stocks: .75, bonds: .08, reits: .12, bullion: .05 },
};

const MAIL_FROM = CONFIG.contactEmail;
function welcomeEmail(student) {
  const b = BATCHES.find((x) => x.id === student.batch) || BATCHES[0];
  const first = student.name.split(" ")[0];
  return {
    id: "w" + Date.now(), from: MAIL_FROM, when: "Just now", type: "welcome",
    subject: "Welcome to Build Young — your class details inside",
    body: `Hi ${first},

Welcome aboard! Your seat in the ${b.track} cohort is confirmed.

  •  When: ${b.day}
  •  Where: Live online over Zoom
  •  Your Zoom link (same one for every class): ${b.zoom}

Your username is your email (${student.email}) — use it to log in to your student portal anytime.

Week 1 is "Set Up Your Paycheck." Come ready to choose your 401(k) contribution and watch your first ${PAY.toLocaleString()} paycheck land. Everything runs inside your student dashboard.

See you in class,
The Build Young Team`,
  };
}
function followupEmail(s, week, batch) {
  const first = s.student.name.split(" ")[0];
  if (s.phase === "course") {
    const wk = WEEKS[week - 1];
    const last = week >= 12;
    const next = WEEKS[week];
    return {
      id: "f" + week + "_" + Date.now(), from: MAIL_FROM, when: "Just now", type: "followup",
      subject: last ? "Course complete — your check-ins are coming" : `Week ${week} recap + your next class`,
      body: last
        ? `Hi ${first},

You finished all 12 weeks of Build Young — your simulated net worth is ${fmt(netWorth(s))}. 

Next up are 6 monthly check-ins where you'll keep managing your portfolio through new market developments. We'll email you before each one.

${batch.day}  ·  Zoom: ${batch.zoom}

Proud of you,
The Team`
        : `Hi ${first},

Great work in Week ${week}: "${wk.t}." Your simulated net worth is now ${fmt(netWorth(s))}.

Your next session is Week ${week + 1}: "${next.t}"
${batch.day}  ·  Join on Zoom: ${batch.zoom}

See you there,
The Team`,
    };
  }
  return {
    id: "c" + s.checkin + "_" + Date.now(), from: MAIL_FROM, when: "Just now", type: "followup",
    subject: `Check-in ${s.checkin + 1} recap`,
    body: `Hi ${first},

Your portfolio is now worth ${fmt(netWorth(s))} (simulated). Markets keep moving — log in to review and rebalance before your next check-in.

${batch.day}  ·  Zoom: ${batch.zoom}

The Team`,
  };
}

// The MEDIA map (per-event analog/watch/question/resources) is SERVER-ONLY
// (api/_lib/marketSchedule.js). The client receives the current event's media inline from
// /api/market-event and builds the pre-class drip with buildMediaDrip (imported up top).

export const newState = (student) => ({
  student,
  started: false, // class hasn't begun yet — full refund available until first session
  week: 1,
  phase: "course",
  checkin: 0,
  done: false,
  settings: { retire401k: 0.05, savingsRate: 0.25, brokerageRate: 0.2, risk: "balanced" },
  alloc: { ...RISK_PRESETS.balanced },
  cash: 0,
  savings: 0,
  retirement: 0,
  holdings: { stocks: 0, bonds: 0, reits: 0, bullion: 0 },
  pe: 0,
  home: null,
  car: null,
  card: { open: false, balance: 0 },
  insured: false,
  creditScore: 660,
  hustle: false,
  history: [],
  feed: [],
  emails: [welcomeEmail(student)],
});

/* ============================ ENGINE ============================ */
export function holdingsTotal(s) {
  return ASSETS.reduce((a, x) => a + (s.holdings[x.key] || 0), 0);
}
export function netWorth(s) {
  const inv = holdingsTotal(s) + s.retirement + (s.pe || 0);
  const homeEq = s.home ? s.home.value - s.home.mortgage : 0;
  const carEq = s.car ? s.car.value - s.car.loan : 0;
  return s.cash + s.savings + inv + homeEq + carEq - s.card.balance;
}

// Week-6 budget choices, written as pure state mutators so they can be unit-tested.
// Both spend the same $500 — "treat" burns it on consumption; "invest" moves it into
// the brokerage split by the student's current allocation (net worth is preserved, only
// the form of the money changes). Keep these symmetrical: each must debit cash by SPREE.
export function takeSpree(n) {
  n.cash -= SPREE;
}
export function investInstead(n) {
  n.cash -= SPREE;
  ASSETS.forEach((a) => { n.holdings[a.key] += SPREE * (n.alloc[a.key] || 0); });
}

// process one period: pay, allocate, apply macro, pay bills
export function advance(prev, macro) {
  const s = JSON.parse(JSON.stringify(prev));
  const pay = PAY;
  const tax = pay * TAX_RATE;
  const k = pay * s.settings.retire401k;
  const match = pay * Math.min(s.settings.retire401k, 0.05);
  s.retirement += k + match;
  const net = pay - tax - k;
  const toSav = net * s.settings.savingsRate;
  const toBrk = net * s.settings.brokerageRate;
  s.savings += toSav;
  ASSETS.forEach((a) => { s.holdings[a.key] += toBrk * (s.alloc[a.key] || 0); });
  s.cash += net - toSav - toBrk;

  // hustle bonus
  if (s.hustle) { s.cash += HUSTLE_BASE + Math.round(Math.random() * HUSTLE_VAR); }

  // macro effects by asset class
  const e = macro.e;
  s.holdings.stocks *= 1 + e.stocks;
  s.holdings.bonds *= 1 + e.bonds;
  s.holdings.reits *= 1 + e.reits;
  s.holdings.bullion *= 1 + e.bullion;
  if (s.pe) s.pe *= 1 + 0.025 + e.stocks * 0.3; // private equity: long-horizon premium, partial equity correlation
  s.retirement *= 1 + (e.stocks * 0.7 + e.bonds * 0.3); // 401k blended
  s.savings *= 1 + e.sav;
  if (s.home) s.home.value *= 1 + e.reits * 0.6 + 0.004;

  // autopay bills (from week 6 onward, once owned)
  if (s.home) {
    s.cash -= s.home.payment;
    s.home.mortgage = Math.max(0, s.home.mortgage - s.home.payment * 0.35);
  }
  if (s.car) {
    s.cash -= s.car.payment;
    s.car.value *= 0.985; // depreciation
    s.car.loan = Math.max(0, s.car.loan - s.car.payment * 0.7);
  }
  s.cash -= LIVING; // living costs (rent/food/utilities/phone)

  // credit card interest
  if (s.card.balance > 0) s.card.balance *= 1.04;

  // overdraft guard -> draw from savings
  if (s.cash < 0 && s.savings > 0) {
    const pull = Math.min(s.savings, -s.cash);
    s.savings -= pull; s.cash += pull;
  }

  // credit score drift
  s.creditScore = Math.max(520, Math.min(820,
    s.creditScore + (s.card.balance > CARD_DEBT_HEAVY ? -8 : 6) + (s.cash < 0 ? -10 : 2)));

  s.feed.unshift({ when: s.phase === "course" ? `Week ${s.week}` : `Check-in ${s.checkin + 1}`, ...macro });
  s.history.push({ label: s.phase === "course" ? `W${s.week}` : `M${s.checkin + 1}`, nw: Math.round(netWorth(s)) });
  return s;
}

/* ============================ UI BITS ============================ */
const Card = ({ children, style, className = "" }) => (
  <div className={className} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 4, ...style }}>{children}</div>
);
// Build Young mark: three ascending blocks (building + growth) with a teal spark
const Mark = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 -10 58 68" style={{ verticalAlign: "-4px", marginRight: 4 }} aria-hidden="true">
    <rect x="0" y="34" width="16" height="22" rx="3" fill="#50a0e0" />
    <rect x="21" y="20" width="16" height="36" rx="3" fill="#0078d4" />
    <rect x="42" y="2" width="16" height="54" rx="3" fill="#0067b8" />
    <path d="M50 -8 l6 8 h-12 z" fill="#038387" />
  </svg>
);
const Pill = ({ children, bg = C.emerald, color = "#fff" }) => (
  <span style={{ background: bg, color, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 4, letterSpacing: ".04em", textTransform: "uppercase" }}>{children}</span>
);
// accessible click: makes a non-button element keyboard-operable (Enter / Space) + screen-reader friendly
const act = (fn) => ({ role: "button", tabIndex: 0, onClick: fn, onKeyDown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } } });
// Reusable themed backdrop — soft wash + the brand's ascending-blocks motif, low opacity.
const PageBackdrop = ({ tint = "#eaf3fb" }) => (
  <svg aria-hidden="true" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none" }}>
    <defs>
      <radialGradient id="pbWash" cx="50%" cy="0%" r="90%"><stop offset="0%" stopColor={tint} /><stop offset="55%" stopColor="#faf9f8" /><stop offset="100%" stopColor="#faf9f8" /></radialGradient>
    </defs>
    <rect width="1440" height="900" fill="url(#pbWash)" />
    <g opacity="0.05" fill="#0067b8">
      <rect x="70" y="700" width="40" height="110" rx="7" /><rect x="122" y="650" width="40" height="160" rx="7" /><rect x="174" y="585" width="40" height="225" rx="7" />
      <rect x="1268" y="120" width="34" height="80" rx="6" /><rect x="1312" y="78" width="34" height="122" rx="6" /><rect x="1356" y="28" width="34" height="172" rx="6" />
    </g>
  </svg>
);
const Stat = ({ label, value, sub, icon: Icon, color = C.ink }) => (
  <Card style={{ padding: 18 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 12, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</span>
      {Icon && <Icon size={16} color={color} />}
    </div>
    <div className="disp" style={{ fontSize: 28, fontWeight: 700, color, marginTop: 6 }}>{value}</div>
    {sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{sub}</div>}
  </Card>
);

// Conceptual "starting young compounds" graphic for the philosophy section
const CompoundGraphic = () => (
  <svg viewBox="0 0 760 300" style={{ width: "100%", height: "auto" }} role="img" aria-label="Chart showing that starting to invest younger ends far ahead of starting later">
    <defs>
      <linearGradient id="early" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0067b8" stopOpacity="0.22" /><stop offset="100%" stopColor="#0067b8" stopOpacity="0" /></linearGradient>
    </defs>
    {/* axes */}
    <line x1="60" y1="250" x2="720" y2="250" stroke={C.line} strokeWidth="1.5" />
    <line x1="60" y1="40" x2="60" y2="250" stroke={C.line} strokeWidth="1.5" />
    <text x="60" y="278" fontFamily="Inter, sans-serif" fontSize="12" fontWeight="700" fill={C.muted}>age 13</text>
    <text x="660" y="278" fontFamily="Inter, sans-serif" fontSize="12" fontWeight="700" fill={C.muted}>age 65</text>
    <text x="22" y="48" fontFamily="Inter, sans-serif" fontSize="12" fontWeight="700" fill={C.muted} transform="rotate(-90 22 48)">wealth</text>
    {/* started young */}
    <path d="M60,242 L180,222 L300,180 L420,128 L540,76 L660,40 L660,250 L60,250 Z" fill="url(#early)" />
    <polyline points="60,242 180,222 300,180 420,128 540,76 660,40" fill="none" stroke={C.emerald} strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />
    <circle cx="660" cy="40" r="5.5" fill="#fff" stroke={C.emerald} strokeWidth="3.5" />
    {/* started later */}
    <polyline points="60,247 180,246 300,238 420,214 540,178 660,140" fill="none" stroke={C.muted} strokeWidth="3" strokeDasharray="2 7" strokeLinecap="round" />
    <circle cx="660" cy="140" r="5" fill="#fff" stroke={C.muted} strokeWidth="3" />
    {/* the gap */}
    <line x1="690" y1="42" x2="690" y2="138" stroke={C.gold} strokeWidth="1.5" />
    <text x="700" y="86" fontFamily="Inter, sans-serif" fontSize="12.5" fontWeight="800" fill={C.gold}>the</text>
    <text x="700" y="102" fontFamily="Inter, sans-serif" fontSize="12.5" fontWeight="800" fill={C.gold}>head</text>
    <text x="700" y="118" fontFamily="Inter, sans-serif" fontSize="12.5" fontWeight="800" fill={C.gold}>start</text>
    {/* labels */}
    <g transform="translate(360,58)"><circle cx="0" cy="-4" r="5" fill={C.emerald} /><text x="12" y="0" fontFamily="Inter, sans-serif" fontSize="13.5" fontWeight="700" fill={C.ink}>Started young</text></g>
    <g transform="translate(330,232)"><circle cx="0" cy="-4" r="5" fill={C.muted} /><text x="12" y="0" fontFamily="Inter, sans-serif" fontSize="13.5" fontWeight="700" fill={C.muted}>Started 10 years later</text></g>
  </svg>
);

/* ============================ LANDING ============================ */
// On-brand decorative backdrop: soft wash + faint ascending bars
const HeroBackdrop = () => (
  <svg aria-hidden="true" viewBox="0 0 1440 600" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0 }}>
    <defs>
      <radialGradient id="wash" cx="50%" cy="0%" r="80%">
        <stop offset="0%" stopColor="#eaf3fb" />
        <stop offset="60%" stopColor="#faf9f8" />
        <stop offset="100%" stopColor="#faf9f8" />
      </radialGradient>
    </defs>
    <rect width="1440" height="600" fill="url(#wash)" />
    <g opacity="0.06" fill="#0067b8">
      <rect x="90" y="430" width="34" height="90" rx="6" />
      <rect x="134" y="390" width="34" height="130" rx="6" />
      <rect x="178" y="330" width="34" height="190" rx="6" />
      <rect x="1230" y="450" width="34" height="70" rx="6" />
      <rect x="1274" y="400" width="34" height="120" rx="6" />
      <rect x="1318" y="340" width="34" height="180" rx="6" />
    </g>
  </svg>
);

// A stylized peek at the student simulation — continuously cycles through weeks.
const HP_SNAPS = [
  { week: 5, nw: 41500, pts: "0,190 70,176 140,182 210,158 280,166 350,140 420,148 490,124 540,110", alloc: [0.45, 0.30, 0.15, 0.10] },
  { week: 8, nw: 68900, pts: "0,176 70,158 140,168 210,128 280,136 350,96 420,104 490,64 540,40", alloc: [0.55, 0.25, 0.12, 0.08] },
  { week: 12, nw: 96250, pts: "0,170 70,150 140,160 210,116 280,124 350,80 420,72 490,40 540,14", alloc: [0.62, 0.18, 0.12, 0.08] },
];
const HeroPreview = () => {
  const C2 = C;
  const circ = 2 * Math.PI * 56;
  const seg = (frac) => `${(circ * frac).toFixed(1)} ${(circ * (1 - frac)).toFixed(1)}`;
  const donutColors = [C2.emerald, C2.turq, C2.green, C2.pink];
  const [i, setI] = useState(0);
  const [nw, setNw] = useState(0);
  // rotate through snapshots forever
  useEffect(() => {
    const id = setInterval(() => setI((p) => (p + 1) % HP_SNAPS.length), 3600);
    return () => clearInterval(id);
  }, []);
  // count the net-worth number toward the current snapshot
  useEffect(() => {
    const target = HP_SNAPS[i].nw;
    let raf, start, from;
    const dur = 1300;
    const step = (t) => {
      if (start == null) { start = t; from = nw; }
      const p = Math.min(1, (t - start) / dur);
      setNw(Math.round(from + (target - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [i]); // eslint-disable-line
  const snap = HP_SNAPS[i];
  const last = snap.pts.split(" ").slice(-1)[0].split(",");
  const areaD = `M${snap.pts.split(" ").join(" L")} L540,210 L0,210 Z`;
  let acc = 0;
  return (
    <div className="rise" style={{ maxWidth: 760, margin: "44px auto 0" }}>
      <svg viewBox="0 0 920 430" style={{ width: "100%", height: "auto", filter: "drop-shadow(0 24px 50px rgba(0,103,184,.16))" }} role="img" aria-label="Build Young simulation dashboard preview">
        <rect x="2" y="2" width="916" height="426" rx="12" fill="#ffffff" stroke={C2.line} />
        <defs>
          <linearGradient id="bygrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={C2.emerald} /><stop offset="50%" stopColor={C2.turq} /><stop offset="100%" stopColor={C2.green} />
          </linearGradient>
        </defs>
        {/* top bar */}
        <g transform="translate(28,26)">
          <rect x="0" y="-4" width="16" height="22" rx="3" fill="#50a0e0" /><rect x="19" y="-12" width="16" height="30" rx="3" fill="#0078d4" /><rect x="38" y="-22" width="16" height="40" rx="3" fill="#0067b8" />
          <text x="70" y="14" fontFamily="Space Grotesk, sans-serif" fontSize="19" fontWeight="800" fill={C2.ink}>Build <tspan fill="url(#bygrad)">Young</tspan></text>
          <rect x="678" y="-8" width="186" height="30" rx="6" fill="#eaf3fb" />
          <text x="771" y="12" fontFamily="Inter, sans-serif" fontSize="13" fontWeight="700" fill={C2.emerald} textAnchor="middle"><tspan className="hp-live">●</tspan> Week {snap.week} — live now</text>
        </g>
        <line x1="2" y1="62" x2="918" y2="62" stroke={C2.line} />
        {/* net worth + chart */}
        <g transform="translate(40,92)">
          <text fontFamily="Inter, sans-serif" fontSize="14" fontWeight="700" fill={C2.muted}>YOUR NET WORTH</text>
          <text y="42" fontFamily="Inter, sans-serif" fontSize="44" fontWeight="800" fill={C2.ink}>${nw.toLocaleString()}</text>
          <g key={"chip" + i} className="hp-end" transform="translate(250,8)"><rect width="150" height="30" rx="15" fill="#e7f3ee" /><text x="75" y="20" fontFamily="Inter, sans-serif" fontSize="13.5" fontWeight="700" fill={C2.emerald} textAnchor="middle">▲ +{fmt(PAY)} paycheck</text></g>
          <defs>
            <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0067b8" stopOpacity="0.28" /><stop offset="100%" stopColor="#0067b8" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g transform="translate(0,70)">
            <path key={"a" + i} className="hp-area" d={areaD} fill="url(#area)" />
            <polyline key={"l" + i} className="hp-line" pathLength="1" points={snap.pts} fill="none" stroke={C2.emerald} strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />
            <circle key={"e" + i} className="hp-end" cx={last[0]} cy={last[1]} r="5.5" fill="#fff" stroke={C2.emerald} strokeWidth="3.5" />
          </g>
        </g>
        {/* allocation donut */}
        <g transform="translate(760,250)">
          <text x="0" y="-96" fontFamily="Inter, sans-serif" fontSize="13" fontWeight="700" fill={C2.muted} textAnchor="middle">ALLOCATION</text>
          <g key={"d" + i} className="hp-donut">
            <g transform="rotate(-90)" fill="none" strokeWidth="20">
              {snap.alloc.map((f, idx) => { const el = (<circle key={idx} r="56" stroke={donutColors[idx]} strokeDasharray={seg(f)} strokeDashoffset={-circ * acc} />); acc += f; return el; })}
            </g>
            <text y="-2" fontFamily="Inter, sans-serif" fontSize="20" fontWeight="800" fill={C2.ink} textAnchor="middle">4</text>
            <text y="16" fontFamily="Inter, sans-serif" fontSize="10.5" fontWeight="700" fill={C2.muted} textAnchor="middle">ASSETS</text>
          </g>
        </g>
      </svg>
    </div>
  );
};

function Landing({ onEnroll, onCall, onLegal }) {
  const [season, setSeason] = useState(SEASONS[0].key);
  return (
    <div style={{ position: "relative", zIndex: 2 }}>
      {/* nav */}
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 6vw", maxWidth: 1200, margin: "0 auto" }}>
        <div className="disp" style={{ fontWeight: 900, fontSize: 22, letterSpacing: "-.02em" }}>
          <Mark size={24} /> Build <span className="grad">Young</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <span className="nav-talk" {...act(onCall)} style={{ fontSize: 14, fontWeight: 600, color: C.ink2, cursor: "pointer" }}>Talk to Sunil</span>
          <button className="btn" onClick={onEnroll} style={{ background: C.ink, color: C.paper2, padding: "10px 20px", borderRadius: 4, fontSize: 14 }}>Enroll →</button>
        </div>
      </nav>

      {/* hero */}
      <header style={{ position: "relative", overflow: "hidden", padding: "40px 6vw 64px" }}>
        <HeroBackdrop />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
        <div className="rise" style={{ marginBottom: 18 }}><Pill bg={C.ink}>12 weeks · ages 13–18 · live cohorts</Pill></div>
        <h1 className="disp rise" style={{ fontSize: "clamp(38px,6.5vw,74px)", lineHeight: 1.02, fontWeight: 700, letterSpacing: "-.02em", margin: 0 }}>
          Raising <span className="grad">builders,</span><br />not consumers.
        </h1>
        <p className="disp rise" style={{ marginTop: 16, fontSize: 18, fontWeight: 700, color: C.gold, letterSpacing: ".01em" }}>Build Young — financial literacy, learned by living it.</p>
        <p className="rise" style={{ maxWidth: 620, margin: "26px auto 0", fontSize: 19, color: C.ink2, lineHeight: 1.5 }}>
          Build Young is a <b>live, instructor-led course</b> where teens don't just study money — they <b>build with it</b>, running a realistic simulation: earning a simulated paycheck each class, investing through real-world market swings, financing a home and a car, launching something of their own, and graduating having built a net worth from zero. <b>Financial literacy, learned by living it.</b> It's a hands-on sandbox — <b>no real money is ever involved</b> — just the real skills, practiced somewhere safe before the stakes are real.
        </p>
        <HeroPreview />
        <div className="rise" style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 32, flexWrap: "wrap" }}>
          <button className="btn" onClick={onEnroll} style={{ background: C.emerald, color: "#fff", padding: "15px 30px", borderRadius: 4, fontSize: 16 }}>Pick a batch & enroll <ArrowRight size={16} style={{ verticalAlign: "-2px" }} /></button>
          <button className="btn" onClick={onCall} style={{ background: "transparent", color: C.ink, padding: "15px 28px", borderRadius: 4, fontSize: 16, border: `1.5px solid ${C.ink}` }}>Talk to Sunil first</button>
          <a href="#curriculum" style={{ textDecoration: "none", alignSelf: "center" }}><span style={{ color: C.ink2, fontSize: 15, fontWeight: 600, borderBottom: `1.5px solid ${C.line}`, paddingBottom: 2 }}>See the 12 weeks</span></a>
        </div>
        <p className="rise" style={{ fontSize: 13.5, color: C.muted, marginTop: 14 }}>Not sure yet? Book a free 15-minute call with me — Sunil — before you decide.</p>
        <div className="rise" style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 26 }}>
          {[
            { icon: Video, t: "Live & instructor-led on Zoom" },
            { icon: Lock, t: "Simulated money — no real funds, ever" },
            { icon: GraduationCap, t: "Led by Sunil · ex-Microsoft" },
            { icon: Check, t: "Full refund before class starts" },
          ].map((x, i) => (
            <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: C.card, border: `1px solid ${C.line}`, borderRadius: 999, padding: "7px 14px", fontSize: 12.5, fontWeight: 600, color: C.ink2 }}>
              <x.icon size={14} color={C.emerald} /> {x.t}
            </div>
          ))}
        </div>
        <p className="rise" style={{ fontSize: 12, color: C.muted, marginTop: 12 }}>Financial education — not licensed financial advice.</p>
        </div>
      </header>

      {/* how it works */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 6vw" }}>
        <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto 26px" }}>
          <h2 className="disp" style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-.02em", margin: 0 }}>How it works</h2>
          <p style={{ color: C.muted, fontSize: 16, marginTop: 8, lineHeight: 1.5 }}>Getting money-savvy is the foundation — then your student uses it to build. Every week they earn it, invest it, make the big calls, build something of their own, and protect it.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
          {[
            { icon: Wallet, t: "Attendance is your paycheck", d: `Show up, earn ${fmt(PAY)}. Set your W-4 and 401(k) once — it runs the whole course.`, c: C.emerald },
            { icon: LineIcon, t: "Markets move like the real world", d: "Live macro events — rate hikes, booms, recessions — push each asset class up and down.", c: C.turq },
            { icon: Home, t: "Make the big decisions", d: "Buy and finance a home and a car. Live with the payments.", c: C.green },
            { icon: Shield, t: "Grow & protect it", d: "Diversify into bullion, real estate, and private equity, insure against loss, and total your net worth.", c: C.pink },
          ].map((x, i) => (
            <Card key={i} className="lift" style={{ padding: 22, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: x.c }} />
              <div style={{ width: 44, height: 44, borderRadius: 4, background: x.c + "1a", display: "grid", placeItems: "center", marginBottom: 12, marginTop: 4 }}><x.icon size={21} color={x.c} /></div>
              <div className="disp" style={{ fontWeight: 700, fontSize: 18 }}>{x.t}</div>
              <div style={{ color: C.muted, fontSize: 14, marginTop: 6, lineHeight: 1.45 }}>{x.d}</div>
            </Card>
          ))}
        </div>
      </section>

      {/* curriculum */}
      <section id="curriculum" style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 6vw 30px" }}>
        <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto 8px" }}>
          <h2 className="disp" style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-.02em", margin: 0 }}>The journey, in <span className="grad">three acts</span></h2>
          <p style={{ color: C.muted, fontSize: 16, marginTop: 8, lineHeight: 1.5 }}>Twelve weeks that lay the financial foundation — a first paycheck, smart money habits — then build on it, until your student is managing a real portfolio and building income of their own.</p>
        </div>
        {[1, 2, 3].map((act) => (
          <div key={act} style={{ marginTop: 26 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <Pill bg={act === 1 ? C.green : act === 2 ? C.pink : C.turq}>Act {act}</Pill>
              <span className="disp" style={{ fontSize: 20, fontWeight: 700 }}>{ACTS[act]}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))", gap: 12 }}>
              {WEEKS.map((w, i) => w.act === act && (
                <Card key={i} style={{ padding: 16 }}>
                  <div style={{ fontSize: 11, color: act === 1 ? C.green : act === 2 ? C.pink : C.turq, fontWeight: 700, letterSpacing: ".05em" }}>WEEK {i + 1}</div>
                  <div className="disp" style={{ fontWeight: 700, fontSize: 16, margin: "4px 0 6px" }}>{w.t}</div>
                  <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.4 }}>{w.s}</div>
                </Card>
              ))}
            </div>
          </div>
        ))}
        <p style={{ color: C.muted, marginTop: 22, fontSize: 14, maxWidth: 760, marginLeft: "auto", marginRight: "auto", textAlign: "center", lineHeight: 1.55 }}>In <b>Week 4</b>, high-school cohorts go deeper with a <b>Paying for College</b> unit — student loans, financial aid, and the true cost of college. After the 12 weeks, students keep going with <b>6 monthly check-ins</b> over the next six months — managing the <b>same simulated portfolio</b> they built in class as new market developments unfold.</p>
      </section>

      {/* philosophy + founder */}
      <section style={{ position: "relative", overflow: "hidden", background: C.paper2, borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}`, marginTop: 30 }}>
        {/* decorative motif */}
        <svg aria-hidden="true" viewBox="0 0 520 360" style={{ position: "absolute", top: 0, right: 0, height: "100%", maxWidth: "48%", opacity: 0.5, zIndex: 0 }} preserveAspectRatio="xMaxYMin meet">
          <defs>
            <radialGradient id="phiGlow" cx="78%" cy="18%" r="70%"><stop offset="0%" stopColor="#eaf3fb" /><stop offset="100%" stopColor="#f3f2f1" stopOpacity="0" /></radialGradient>
          </defs>
          <rect width="520" height="360" fill="url(#phiGlow)" />
          <g opacity="0.16">
            <circle cx="430" cy="92" r="60" fill="none" stroke="#0067b8" strokeWidth="2" />
            <circle cx="300" cy="150" r="34" fill="none" stroke="#5c2e91" strokeWidth="2" />
          </g>
          {/* ascending blocks + growth spark (brand motif) */}
          <g transform="translate(372,108)" opacity="0.9">
            <rect x="0"  y="70" width="26" height="44" rx="5" fill="#50a0e0" />
            <rect x="34" y="44" width="26" height="70" rx="5" fill="#0078d4" />
            <rect x="68" y="10" width="26" height="104" rx="5" fill="#0067b8" />
            <path d="M81 -8 l9 12 h-18 z" fill="#038387" />
          </g>
          {/* rising sparkline */}
          <polyline points="300,250 340,236 380,244 420,212 460,196 500,160" fill="none" stroke="#0067b8" strokeWidth="3" strokeOpacity="0.35" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1000, margin: "0 auto", padding: "56px 6vw 60px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#efe7f5", color: C.gold, fontSize: 12, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", padding: "6px 12px", borderRadius: 4, marginBottom: 14 }}><Sparkles size={13} /> The bigger picture</div>
            <h2 className="disp" style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-.02em", margin: 0 }}>More than <span className="grad-warm">money</span></h2>
            <div style={{ width: 64, height: 4, borderRadius: 2, margin: "12px auto 0", background: `linear-gradient(90deg, ${C.green}, ${C.turq}, ${C.pink})` }} />
          </div>
          <p style={{ fontSize: 21, lineHeight: 1.5, marginTop: 24, maxWidth: 760, marginLeft: "auto", marginRight: "auto", textAlign: "center", color: C.ink }}>
            <b className="disp">Raising builders, not consumers.</b> How money works — the thing that matters most in real life — isn't on any test. We teach it by letting our kids live it, so in a world changing faster than any classroom can keep up, their future rests on what they can build, not just what they were credentialed to do.
          </p>
          <p style={{ color: C.ink2, fontSize: 17.5, lineHeight: 1.6, marginTop: 18, maxWidth: 740, marginLeft: "auto", marginRight: "auto" }}>
            Being money-savvy is the foundation — but the goal is to <b>build</b> on it. Learned early, money skills shape who a kid becomes. A child saving toward something they want is practicing patience and self-control. One who lives with the consequences of a choice — a splurge that set back a goal, an emergency that tested their cushion — is building responsibility and resilience. And because money is one of the most avoided, anxiety-soaked topics in most homes, a kid who understands it can talk about it plainly — needs, trade-offs, even mistakes — without shame or pretense. That candor carries into everything: they ask sharper questions, they're far harder to mislead, and they make decisions from confidence instead of fear. Solid ground under their feet — so they can start building on it young.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginTop: 24 }}>
            {[
              { t: "Patience & discipline", d: "Saving and waiting for a goal trains self-control that outlasts any single purchase.", icon: Hourglass, c: C.green },
              { t: "Responsibility & resilience", d: "Owning real decisions — and recovering from the ones that don't work out — builds grit.", icon: Anchor, c: C.pink },
              { t: "Candor & confidence", d: "Kids who understand money speak about it honestly and openly, instead of avoiding it.", icon: MessageCircle, c: C.turq },
            ].map((x, i) => (
              <Card key={i} style={{ padding: 18, background: C.card }}>
                <div style={{ width: 40, height: 40, borderRadius: 4, background: x.c + "1a", display: "grid", placeItems: "center", marginBottom: 12 }}><x.icon size={20} color={x.c} /></div>
                <div className="disp" style={{ fontWeight: 700, fontSize: 16 }}>{x.t}</div>
                <div style={{ color: C.muted, fontSize: 14, marginTop: 6, lineHeight: 1.45 }}>{x.d}</div>
              </Card>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 28, alignItems: "center", marginTop: 30 }}>
            <Card style={{ padding: "22px 24px" }}>
              <div className="disp" style={{ fontWeight: 800, fontSize: 18 }}>Why starting young wins</div>
              <div style={{ color: C.muted, fontSize: 13.5, marginTop: 2, marginBottom: 8 }}>Same monthly savings — more time to compound. Illustrative.</div>
              <CompoundGraphic />
            </Card>
            <p style={{ color: C.ink2, fontSize: 16.5, lineHeight: 1.6 }}>
              Financial literacy is the foundation, not the finish line. Taught early, it doesn't just make kids better with money — it makes them steadier, more honest, and more in command of their own lives, and gives them the footing to build. In a world being reshaped by AI, that's the most durable lesson of all: <b style={{ color: C.ink }}>save what you earn — and learn to build what earns.</b>
            </p>
          </div>

          {/* founder */}
          <Card style={{ padding: 28, marginTop: 34, display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
            <img src={SUNIL_PHOTO} alt="Sunil Garg" style={{ width: 72, height: 72, borderRadius: 4, objectFit: "cover", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 260 }}>
              <div className="disp" style={{ fontSize: 20, fontWeight: 800 }}>Why this exists</div>
              <p style={{ color: C.ink2, fontSize: 16, lineHeight: 1.6, marginTop: 8 }}>
                I came to the United States with almost nothing — and with family back home depending on me to provide. I built my life from zero, supporting them while finding my own footing, and made it my own country. Two decades as a product leader at Microsoft later, I'd reached financial independence and was able to step away at 51. But here's the truth I can't stop thinking about: if I'd understood how money really works as a teenager, I'd have gotten there years sooner. That lost time is the whole reason this exists. I have two daughters, 15 and 11 — both at Eastside Catholic School in Sammamish, and both with a Starbucks habit I'm gently working on. I wanted them to understand how money really works before the world started making those decisions for them — so I built this for them. The two tracks grew out of watching them learn at different ages, and the simulation starts exactly where I did: at zero, with a paycheck and a choice about what to do with it. These days I build AI products for a living, and I'm certain of one thing: in a world being rewritten by AI, the kids who learn to build — not just consume — will own their futures. That's why I called it Build Young: the one advantage these kids have that no one can buy is time. Habits, character, and even a few invested dollars all compound.
              </p>
              <p style={{ color: C.ink2, fontSize: 16, lineHeight: 1.6, marginTop: 12 }}>
                Here's what I noticed when I went looking for something like this for my own kids. There's plenty of free material out there — banks and nonprofits have whole libraries of it. But it sits unwatched, because a video doesn't make a teenager show up. And the paid classes that are live? They mostly teach stock-picking — the flashy 10%, not the part that actually shapes a life.
              </p>
              <p style={{ color: C.ink2, fontSize: 16, lineHeight: 1.6, marginTop: 12 }}>
                So I built the thing I couldn't find. Not more content to ignore, but a live class with a real teacher, a small group, and a standing time each week — the things that turn “available” into “actually done.” Not investing trivia, but the whole picture: a paycheck, taxes, a budget that breaks and gets fixed, credit, a first big purchase, a portfolio — the full arc of a financial life. And not a one-off lesson, but one continuous simulation your kid carries for twelve weeks and six monthly check-ins, where the decisions compound and the mistakes are safe because the money isn't real yet.
              </p>
              <p style={{ color: C.ink2, fontSize: 16, lineHeight: 1.6, marginTop: 12 }}>
                That's the whole idea: money isn't a subject you study, it's a skill you practice. We're raising builders, not consumers — kids who reach adulthood having already lived it, in a world where what you can build matters more than what you were credentialed to do.
              </p>
              <p style={{ color: C.ink2, fontSize: 16, lineHeight: 1.6, marginTop: 12 }}>
                Start building young, and time does the rest.
              </p>
              <div style={{ fontWeight: 700, marginTop: 12 }}>Sunil Garg <span style={{ color: C.muted, fontWeight: 500 }}>· Founder</span></div>
              <div style={{ fontSize: 12.5, color: C.muted, marginTop: 4 }}>Ex-Microsoft · two decades in product · financial education, not licensed financial advice.</div>
              <a href={CONFIG.linkedinUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, color: C.emerald, fontWeight: 700, fontSize: 13.5, textDecoration: "none" }}><Linkedin size={15} /> Connect with me on LinkedIn</a>
            </div>
          </Card>
        </div>
      </section>

      {/* batches / pricing */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 6vw 70px" }}>
        <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
          <h2 className="disp" style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-.02em", margin: 0 }}>Upcoming batches</h2>
          <p style={{ color: C.ink2, fontSize: 15, marginTop: 8, lineHeight: 1.55 }}>Middle school meets <b>Mondays & Tuesdays</b>, high school <b>Wednesdays & Thursdays</b> — every cohort is <b>100% live online over Zoom</b>. We run three cohorts a year — pick the season and day that fit.</p>
          <p style={{ color: C.muted, fontSize: 14, marginTop: 8 }}>Not sure it's the right fit? <b>Cancel before your cohort starts for a full refund.</b> After it begins, withdraw through <b>Act 1 (the first 3 weeks)</b> for a prorated refund. After Act 1, tuition is non-refundable.</p>
          <p style={{ color: C.ink2, fontSize: 14, marginTop: 10, maxWidth: 640, marginLeft: "auto", marginRight: "auto", lineHeight: 1.55 }}><b style={{ color: C.green }}>Win your tuition back.</b> The student with the <b>highest portfolio value at the final (6th) monthly check-in</b> earns a <b>full tuition refund</b> — invest by whatever philosophy you believe in; the market is the same for everyone. <span style={{ color: C.muted }}>(Simulated portfolios; see Terms.)</span></p>
          <p style={{ fontSize: 14, marginTop: 6 }}>Still deciding? <span {...act(onCall)} style={{ color: C.emerald, fontWeight: 700, cursor: "pointer" }}>Book a free 15-minute call with Sunil →</span></p>
        </div>
        {/* season selector */}
        <div role="tablist" aria-label="Choose a season" style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 8, marginTop: 22 }}>
          {SEASONS.map((s) => {
            const on = season === s.key;
            return (
              <button key={s.key} role="tab" aria-selected={on} className="btn" onClick={() => setSeason(s.key)} style={{ padding: "9px 18px", borderRadius: 999, fontSize: 14.5, fontWeight: 700, background: on ? C.ink : C.card, color: on ? C.paper2 : C.ink2, border: `1.5px solid ${on ? C.ink : C.line}` }}>{s.label}</button>
            );
          })}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16, marginTop: 20 }}>
          {BATCHES.filter((b) => b.season === season).map((b) => {
            const acc = b.track === "High School" ? C.emerald : C.green;
            return (
            <Card key={b.id} className="lift" style={{ padding: 22, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: acc }} />
              <div style={{ marginTop: 4 }}><Pill bg={acc}>{b.track}</Pill></div>
              <div className="disp" style={{ fontSize: 24, fontWeight: 800, marginTop: 12 }}>Starts {b.start}</div>
              <div style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>{b.day}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: acc, fontSize: 13, fontWeight: 600, marginTop: 6 }}><Video size={14} /> Live online · Zoom</div>
              <div style={{ fontSize: 13, color: C.ink2, marginTop: 10, lineHeight: 1.45 }}>
                {b.track === "High School"
                  ? "The full 12-week program, with an in-depth Paying for College unit in Week 4 — student loans, financial aid, and the true cost of college."
                  : "The full 12-week program — paycheck, investing, buying and financing a home and a car, the complete simulation."}
              </div>
              <div style={{ borderTop: `1px solid ${C.line}`, marginTop: "auto", marginBottom: 12, paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span className="disp" style={{ fontSize: 30, fontWeight: 800 }}>${b.price}</span>
                <span style={{ fontSize: 13, color: b.seats < 8 ? C.rust : C.muted, fontWeight: 600 }}>{b.seats} seats left</span>
              </div>
              <button className="btn" onClick={() => onEnroll(b.id)} style={{ width: "100%", background: acc, color: "#fff", padding: "12px", borderRadius: 4, fontSize: 15 }}>Enroll in this batch</button>
            </Card>
            );
          })}
        </div>
      </section>

      <footer style={{ borderTop: `1px solid ${C.line}`, padding: "26px 6vw", textAlign: "center", color: C.muted, fontSize: 13 }}>
        <div>Build Young · Raising builders, not consumers</div>
        <div style={{ marginTop: 8, display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <span {...act(() => onLegal("privacy"))} style={{ color: C.muted, cursor: "pointer" }}>Privacy</span>
          <span {...act(() => onLegal("terms"))} style={{ color: C.muted, cursor: "pointer" }}>Terms</span>
          <a href={`mailto:${CONFIG.contactEmail}`} style={{ color: C.muted }}>{CONFIG.contactEmail}</a>
          <a href={CONFIG.linkedinUrl} target="_blank" rel="noopener noreferrer" style={{ color: C.muted, display: "inline-flex", alignItems: "center", gap: 5 }}><Linkedin size={13} /> Sunil on LinkedIn</a>
        </div>
        <div style={{ marginTop: 8, fontSize: 12 }}>Financial education, not licensed financial advice. Simulation figures are not real money.</div>
      </footer>
    </div>
  );
}

/* ============================ ENROLL ============================ */
// Source-cited "why this matters" stats — social proof for the enroll/call pages.
// Source-cited "why this matters" stats. Each links to its PRIMARY source — keep these
// honest and current; update the numbers AND links together if you refresh them.
const WHY_STATS = [
  { n: "73%", t: "of teens say they'd likely take a money-management course if it were offered to them", src: "Junior Achievement / Citizens · Wakefield Research, 2024", url: "https://www.prnewswire.com/news-releases/survey-money-worries-weigh-on-americas-teens-education-key-path-to-financial-wellness-302110920.html" },
  { n: "42%", t: "report having actually taken a class in school on how to manage money", src: "Junior Achievement / Citizens · Wakefield Research, 2024", url: "https://www.prnewswire.com/news-releases/survey-money-worries-weigh-on-americas-teens-education-key-path-to-financial-wellness-302110920.html" },
  { n: "65%", t: "of teens believe their future happiness depends on how much money they make", src: "Junior Achievement / Citizens · Wakefield Research, 2024", url: "https://www.prnewswire.com/news-releases/survey-money-worries-weigh-on-americas-teens-education-key-path-to-financial-wellness-302110920.html" },
  { n: "And it works", t: "teens from states that require personal-finance education go on to higher savings rates and net worth as a share of earnings", src: "U.S. Dept. of the Treasury", url: "https://www.financialeducatorscouncil.org/financial-literacy-statistics/", proof: true },
];
function WhyStrip() {
  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 14 }}>Why this matters</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
        {WHY_STATS.map((s, i) => {
          const c = [C.emerald, C.turq, C.gold, C.green][i % 4];
          return (
            <div key={i} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 8, padding: "16px 18px", borderTop: `3px solid ${c}` }}>
              <div className="disp" style={{ fontSize: s.proof ? 20 : 30, fontWeight: 800, color: c, lineHeight: 1.05 }}>{s.n}</div>
              <div style={{ fontSize: 13, color: C.ink2, marginTop: 8, lineHeight: 1.45 }}>{s.t}</div>
              <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", fontSize: 10.5, color: C.muted, marginTop: 8, textDecoration: "underline", textDecorationColor: C.line }}>{s.src} ↗</a>
            </div>
          );
        })}
      </div>
      <p style={{ textAlign: "center", fontSize: 11.5, color: C.muted, marginTop: 12, lineHeight: 1.5 }}>School isn't filling the gap — Build Young does, before the stakes are real.</p>
    </div>
  );
}

function Enroll({ preselect, onDone, onBack, onCall }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [batch, setBatch] = useState(preselect || BATCHES[0].id);
  const b = BATCHES.find((x) => x.id === batch);
  const canContinue = name.trim() && validEmail(email);
  const acc = b.track === "High School" ? C.emerald : C.green;
  const inputS = { width: "100%", padding: "12px 14px", borderRadius: 4, border: `1.5px solid ${C.line}`, background: C.paper2, fontSize: 15, marginTop: 6 };
  const label = { fontSize: 13, fontWeight: 700, color: C.ink2 };
  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <PageBackdrop tint="#e7f3ee" />
      <div style={{ position: "relative", zIndex: 2, maxWidth: step === 1 ? 880 : 540, margin: "0 auto", padding: "26px 5vw 60px", transition: "max-width .2s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div className="disp" style={{ fontWeight: 900, fontSize: 18 }}><Mark size={20} /> Build Young</div>
        <button className="btn" onClick={() => (step > 1 ? setStep(step - 1) : onBack())} style={{ background: "transparent", color: C.muted, fontSize: 14 }}>← Back</button>
      </div>
      <Card style={{ padding: 28 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {[1, 2, 3].map((n) => <div key={n} style={{ height: 5, flex: 1, borderRadius: 4, background: step >= n ? C.emerald : C.line }} />)}
        </div>

        {step === 1 && (
          <div className="rise">
            <h2 className="disp" style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Reserve your seat</h2>
            <p style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>Choose a batch and tell us who's joining. Takes about a minute.</p>
            {onCall && (
              <div {...act(onCall)} style={{ display: "flex", alignItems: "center", gap: 8, background: "#eaf3fb", border: `1px solid ${C.emeraldLite}`, borderRadius: 4, padding: "10px 12px", marginTop: 14, cursor: "pointer" }}>
                <Video size={15} color={C.emerald} /><span style={{ fontSize: 12.5, color: C.ink2 }}>Want to talk first? <b style={{ color: C.emerald }}>Book a free 15-minute call with Sunil →</b></span>
              </div>
            )}
            <div className="enroll-grid" style={{ marginTop: 18 }}>
              {/* form column */}
              <div>
                <div><div style={label}>Batch</div>
                  <select aria-label="Batch" value={batch} onChange={(e) => setBatch(e.target.value)} style={inputS}>
                    {SEASONS.map((s) => (
                      <optgroup key={s.key} label={s.label}>
                        {BATCHES.filter((x) => x.season === s.key).map((x) => (
                          <option key={x.id} value={x.id}>{x.track} — {x.day.split(" · ")[0]} (starts {x.start})</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div style={{ marginTop: 14 }}><div style={label}>Student name</div><input aria-label="Student name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Rivera" style={inputS} /></div>
                <div style={{ marginTop: 14 }}><div style={label}>Email <span style={{ color: C.muted, fontWeight: 500 }}>— this is your username</span></div><input aria-label="Email (your username)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" style={inputS} /></div>
                <button className="btn" disabled={!canContinue} onClick={() => setStep(2)} style={{ width: "100%", marginTop: 18, background: canContinue ? C.emerald : C.line, color: "#fff", padding: 14, borderRadius: 4, fontSize: 16, cursor: canContinue ? "pointer" : "not-allowed" }}>Continue to payment →</button>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 12, color: C.muted, fontSize: 12.5 }}>
                  <Lock size={13} /> Secure checkout · no charge until the next step
                </div>
              </div>
              {/* summary column */}
              <aside style={{ background: C.paper2, border: `1px solid ${C.line}`, borderRadius: 8, overflow: "hidden" }}>
                <div style={{ height: 4, background: acc }} />
                <div style={{ padding: "16px 18px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: ".05em" }}>YOUR ENROLLMENT</div>
                  <div className="disp" style={{ fontWeight: 800, fontSize: 17, marginTop: 4 }}>{seasonLabel(b.season)} · {b.track}</div>
                  <div style={{ fontSize: 13, color: C.ink2, marginTop: 2 }}>Starts {b.start}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: acc, fontSize: 12.5, fontWeight: 600, marginTop: 6 }}><Video size={13} /> {b.day} · live on Zoom</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderTop: `1px solid ${C.line}`, marginTop: 14, paddingTop: 12 }}>
                    <span style={{ fontSize: 13, color: C.muted }}>Tuition</span>
                    <span className="disp" style={{ fontSize: 26, fontWeight: 800 }}>${b.price}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
                    <b style={{ color: C.ink2 }}>Full refund</b> if you cancel before {b.start}. After classes begin, a <b style={{ color: C.ink2 }}>prorated refund</b> is available through Act 1 (Week 3); non-refundable after.
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 8, fontWeight: 700, letterSpacing: ".04em" }}>WHAT YOU GET FROM ME</div>
                  <div style={{ marginTop: 8, display: "grid", gap: 7 }}>
                    {[
                      "12 live 90-min classes, taught by me",
                      "6 monthly check-ins after the course",
                      "Your own student dashboard",
                      "My hands-on market simulation",
                      ...(b.track === "High School" ? ["My Paying-for-College unit"] : []),
                    ].map((t, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, color: C.ink2 }}>
                        <Check size={14} color={acc} style={{ flexShrink: 0, marginTop: 1 }} /> {t}
                      </div>
                    ))}
                  </div>
                  <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 12, paddingTop: 12, display: "grid", gap: 7 }}>
                    {[
                      { icon: Video, t: "100% live online over Zoom" },
                      { icon: Lock, t: "Simulated money — no real funds" },
                      { icon: GraduationCap, t: "Capped at 15 students" },
                    ].map((x, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: C.muted, fontWeight: 600 }}>
                        <x.icon size={13} color={C.muted} /> {x.t}
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
            <WhyStrip />
          </div>
        )}

        {step === 2 && (() => {
          const stripeLink = CONFIG.stripeLinks[batch];
          if (stripeLink) {
            return (
              <div className="rise">
                <h2 className="disp" style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Checkout</h2>
                <div style={{ background: C.paper, borderRadius: 4, padding: 14, marginTop: 14, display: "flex", justifyContent: "space-between" }}>
                  <div><div style={{ fontWeight: 700 }}>{b.track} cohort</div><div style={{ fontSize: 13, color: C.muted }}>Starts {b.start}</div></div>
                  <div className="disp" style={{ fontSize: 24, fontWeight: 800 }}>${b.price}</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", background: "#eef3f0", border: `1px solid ${C.line}`, borderRadius: 4, padding: "10px 12px", marginTop: 14 }}>
                  <Lock size={15} color={C.emerald} /><span style={{ fontSize: 12.5, color: C.ink2 }}>Secure payment processed by <b>Stripe</b>. You'll be returned here once payment completes.</span>
                </div>
                <button className="btn" onClick={() => {
                  try { window.localStorage.setItem(PENDING_KEY, JSON.stringify({ name, email, batch, track: b.track })); } catch (e) {}
                  const sep = stripeLink.includes("?") ? "&" : "?";
                  window.location.href = `${stripeLink}${sep}prefilled_email=${encodeURIComponent(email)}`;
                }} style={{ width: "100%", marginTop: 22, background: C.emerald, color: "#fff", padding: 14, borderRadius: 4, fontSize: 16 }}>Pay ${b.price} securely →</button>
              </div>
            );
          }
          return (
          <div className="rise">
            <h2 className="disp" style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Checkout</h2>
            <div style={{ background: C.paper, borderRadius: 4, padding: 14, marginTop: 14, display: "flex", justifyContent: "space-between" }}>
              <div><div style={{ fontWeight: 700 }}>{b.track} cohort</div><div style={{ fontSize: 13, color: C.muted }}>Starts {b.start}</div></div>
              <div className="disp" style={{ fontSize: 24, fontWeight: 800 }}>${b.price}</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", background: "#fbeede", border: `1px solid ${C.goldLite}`, borderRadius: 4, padding: "10px 12px", marginTop: 14 }}>
              <Lock size={15} color={C.gold} /><span style={{ fontSize: 12.5, color: C.ink2 }}><b>Demo checkout.</b> No real card is charged or stored. Connect a Stripe Payment Link in config to take real payments here.</span>
            </div>
            <div style={{ marginTop: 14 }}><div style={label}>Card number</div><input aria-label="Card number" placeholder="4242 4242 4242 4242" style={inputS} /></div>
            <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
              <div style={{ flex: 1 }}><div style={label}>Expiry</div><input aria-label="Card expiry" placeholder="12/28" style={inputS} /></div>
              <div style={{ flex: 1 }}><div style={label}>CVC</div><input aria-label="Card CVC" placeholder="123" style={inputS} /></div>
            </div>
            <button className="btn" onClick={() => setStep(3)} style={{ width: "100%", marginTop: 22, background: C.ink, color: C.paper2, padding: 14, borderRadius: 4, fontSize: 16 }}>Pay ${b.price} (demo) →</button>
          </div>
          );
        })()}

        {step === 3 && (
          <div className="rise" style={{ textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: 4, background: C.emerald, display: "grid", placeItems: "center", margin: "8px auto 16px" }}><Check size={32} color="#fff" /></div>
            <h2 className="disp" style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>You're enrolled, {name.split(" ")[0]}!</h2>
            <p style={{ color: C.muted, fontSize: 14, marginTop: 6 }}>Your seat in the {b.track} cohort ({b.day}) is reserved. Your class <b>Zoom link</b> is waiting in your dashboard — the same link works for every class.</p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", background: "#eef3f0", border: `1px solid ${C.line}`, borderRadius: 4, padding: "9px 12px", marginTop: 12 }}>
              <Mail size={15} color={C.emerald} /><span style={{ fontSize: 12.5, color: C.ink2 }}>A welcome email has been sent to <b>{email}</b>.</span>
            </div>
            <button className="btn" onClick={() => onDone({ name, email, batch, track: b.track })} style={{ width: "100%", marginTop: 22, background: C.emerald, color: "#fff", padding: 14, borderRadius: 4, fontSize: 16 }}>Open my dashboard →</button>
          </div>
        )}
      </Card>
      </div>
    </div>
  );
}

/* ============================ BOOK A CALL ============================ */
const CALL_SLOTS = ["Mon · 5:00 PM PT", "Tue · 5:00 PM PT", "Wed · 5:00 PM PT", "Thu · 5:00 PM PT", "Fri · 5:00 PM PT", "Sat · 5:00 PM PT"];

function BookCall({ onBack, onHome, onEnroll }) {
  const [done, setDone] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [slot, setSlot] = useState(null);
  const inputS = { width: "100%", padding: "12px 14px", borderRadius: 4, border: `1.5px solid ${C.line}`, background: C.paper2, fontSize: 15, marginTop: 6 };
  const label = { fontSize: 13, fontWeight: 700, color: C.ink2 };
  const A = C.turq;
  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <PageBackdrop tint="#e3f1f1" />
      <div style={{ position: "relative", zIndex: 2, maxWidth: done ? 540 : 860, margin: "0 auto", padding: "26px 5vw 60px", transition: "max-width .2s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div className="disp" style={{ fontWeight: 900, fontSize: 18 }}><Mark size={20} /> Build Young</div>
        <button className="btn" onClick={onBack} style={{ background: "transparent", color: C.muted, fontSize: 14 }}>← Back</button>
      </div>
      <Card style={{ padding: 28 }}>
        {!done ? (
          <div className="rise">
            <Pill bg={A}>Free · 15 minutes · over Zoom</Pill>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
              <img src={SUNIL_PHOTO} alt="Sunil Garg" style={{ width: 56, height: 56, borderRadius: 6, objectFit: "cover" }} />
              <div><div style={{ fontWeight: 700, fontSize: 15 }}>Sunil Garg</div><div style={{ fontSize: 12.5, color: C.muted }}>Founder, Build Young · ex-Microsoft (20 years)</div></div>
            </div>
            <h2 className="disp" style={{ fontSize: 27, fontWeight: 800, margin: "14px 0 0" }}>Talk to me first</h2>
            <p style={{ color: C.ink2, fontSize: 14.5, lineHeight: 1.55, marginTop: 8, maxWidth: 560 }}>
              Before you sign up for anything, let's talk. I do a free 15-minute call with every family — bring your questions, meet me, and decide whether Build Young is right for your kid. No pitch, no pressure. <span style={{ color: C.muted }}>— Sunil</span>
            </p>
            <div className="enroll-grid" style={{ marginTop: 20 }}>
              {/* scheduler column */}
              <div>
                {CONFIG.calendlyUrl ? (
                  <a className="btn" href={CONFIG.calendlyUrl} target="_blank" rel="noopener noreferrer" style={{ display: "block", textAlign: "center", textDecoration: "none", background: A, color: "#fff", padding: 14, borderRadius: 4, fontSize: 16, fontWeight: 600 }}>Pick a time on my calendar →</a>
                ) : (
                  <>
                    <div style={label}>Pick a time <span style={{ color: C.muted, fontWeight: 500 }}>(Pacific)</span></div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                      {CALL_SLOTS.map((sl) => (
                        <button key={sl} className="btn" onClick={() => setSlot(sl)} style={{ padding: "11px 10px", borderRadius: 4, fontSize: 14, fontWeight: 600, textAlign: "center", background: slot === sl ? A : C.paper2, color: slot === sl ? "#fff" : C.ink, border: `1.5px solid ${slot === sl ? A : C.line}` }}>{sl}</button>
                      ))}
                    </div>
                    <div style={{ marginTop: 16 }}><div style={label}>Your name</div><input aria-label="Your name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Rivera" style={inputS} /></div>
                    <div style={{ marginTop: 14 }}><div style={label}>Email</div><input aria-label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" style={inputS} /></div>
                    <button className="btn" disabled={!(slot && name.trim() && validEmail(email))} onClick={() => setDone(true)} style={{ width: "100%", marginTop: 20, background: (slot && name.trim() && validEmail(email)) ? A : C.line, color: "#fff", padding: 14, borderRadius: 4, fontSize: 16, cursor: (slot && name.trim() && validEmail(email)) ? "pointer" : "not-allowed" }}>Book my call →</button>
                    <p style={{ color: C.muted, fontSize: 12, textAlign: "center", marginTop: 10 }}>Already sure? You can <span {...act(onEnroll)} style={{ color: C.emerald, fontWeight: 700, cursor: "pointer" }}>enroll directly</span> instead.</p>
                  </>
                )}
              </div>
              {/* what-to-expect aside */}
              <aside style={{ background: C.paper2, border: `1px solid ${C.line}`, borderRadius: 8, overflow: "hidden", alignSelf: "start" }}>
                <div style={{ height: 4, background: A }} />
                <div style={{ padding: "16px 18px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: ".05em" }}>WHAT YOU'LL GET FROM ME</div>
                  <div style={{ marginTop: 10, display: "grid", gap: 9 }}>
                    {[
                      "I'll answer anything — money, the format, your kid",
                      "We'll figure out together if it's the right fit",
                      "You'll meet me face to face on Zoom",
                      "No pitch, no pressure — you have my word",
                    ].map((t, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, color: C.ink2 }}>
                        <Check size={14} color={A} style={{ flexShrink: 0, marginTop: 1 }} /> {t}
                      </div>
                    ))}
                  </div>
                  <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 14, paddingTop: 12, fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>
                    I'm <b style={{ color: C.ink2 }}>Sunil</b> — I spent 20 years in product at Microsoft, I'm a dad of two teens, and I built this for my own kids first.
                    <a href={CONFIG.linkedinUrl} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8, color: A, fontWeight: 700, textDecoration: "none" }}><Linkedin size={13} /> See my LinkedIn</a>
                  </div>
                  <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 12, paddingTop: 12, display: "grid", gap: 7 }}>
                    {[
                      { icon: Check, t: "100% free — no obligation" },
                      { icon: Video, t: "15 minutes, over Zoom" },
                    ].map((x, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: C.muted, fontWeight: 600 }}>
                        <x.icon size={13} color={C.muted} /> {x.t}
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
            <WhyStrip />
          </div>
        ) : (
          <div className="rise" style={{ textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: 4, background: A, display: "grid", placeItems: "center", margin: "8px auto 16px" }}><Video size={30} color="#fff" /></div>
            <h2 className="disp" style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>You're booked, {name.split(" ")[0]}!</h2>
            <p style={{ color: C.ink2, fontSize: 14.5, marginTop: 8 }}>Our 15-minute call is set for <b>{slot}</b>. I'm looking forward to meeting you. <span style={{ color: C.muted }}>— Sunil</span></p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", background: "#eef3f0", border: `1px solid ${C.line}`, borderRadius: 4, padding: "9px 12px", marginTop: 12 }}>
              <Mail size={15} color={C.emerald} /><span style={{ fontSize: 12.5, color: C.ink2 }}>A calendar invite and Zoom link are on the way to <b>{email}</b>.</span>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button className="btn" onClick={onHome} style={{ flex: 1, background: C.paper2, color: C.ink, border: `1px solid ${C.line}`, padding: 13, borderRadius: 4, fontSize: 15 }}>Back home</button>
              <button className="btn" onClick={onEnroll} style={{ flex: 1, background: C.emerald, color: "#fff", padding: 13, borderRadius: 4, fontSize: 15 }}>I'm ready — enroll</button>
            </div>
          </div>
        )}
      </Card>
      </div>
    </div>
  );
}

/* ============================ PLATFORM ============================ */
function Platform({ state, setState, onExit }) {
  const [tab, setTab] = useState("dash");
  const [toast, setToast] = useState(null);
  const [withdraw, setWithdraw] = useState(false); // false | 'confirm' | 'done'
  const ping = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3600); };
  const s = state;
  const batch = BATCHES.find((b) => b.id === s.student.batch) || BATCHES[0];
  const notStarted = !s.started; // before the first session → full refund
  const canWithdraw = notStarted || (s.phase === "course" && s.week <= 3); // pre-start, or Act 1
  const refund = notStarted ? batch.price : Math.round((batch.price * (12 - s.week)) / 12);
  const nw = netWorth(s);
  // compare to the PREVIOUS recorded period (the latest entry is the current one)
  const last = s.history.length > 1 ? s.history[s.history.length - 2].nw : 0;
  const wk = WEEKS[s.week - 1];

  // The CURRENT market event. The full schedule is server-only (anti-gaming), so we fetch
  // the single current event from /api/market-event. Until it resolves — or whenever the
  // fetch fails (offline/demo/tests) — we use a schedule-free, non-revealing placeholder so
  // the dashboard always has something to show and `advance()` always has its `.e` effects.
  // Keyed on the exact {phase,week,checkin} render snapshot, so the value `advance()` uses
  // matches what's displayed (preserves the original double-click semantics: two rapid
  // clicks both apply this same event via the functional updater — no lost update).
  const [macroNow, setMacroNow] = useState(() => placeholderEventFor(s.phase, s.week));
  useEffect(() => {
    let live = true;
    setMacroNow(placeholderEventFor(s.phase, s.week)); // reset to a safe value on step change
    fetchMarketEvent(s.phase, s.week, s.checkin).then((ev) => {
      if (live && ev) setMacroNow(ev);
    });
    return () => { live = false; };
  }, [s.phase, s.week, s.checkin]);

  const pieData = ASSETS.map((a) => ({ name: a.label, value: Math.max(0, Math.round(s.holdings[a.key])), color: a.color }))
    .filter((d) => d.value > 0);

  const doAdvance = async () => {
    // Compute where this advance lands so we can pre-fetch the NEXT step's pre-class media
    // (the drip is for the week the student arrives at). Server-only schedule → fetch it;
    // on failure the drip is simply empty (the placeholder event has no authored media),
    // which is the correct "non-revealing" behavior offline.
    let nextPhase = s.phase, nextWeek = s.week, nextCheckin = s.checkin;
    if (s.phase === "course") {
      if (s.week >= 12) { nextPhase = "checkin"; nextWeek = 12; }
      else nextWeek = s.week + 1;
    } else {
      nextCheckin = s.checkin + 1;
    }
    const nextEvent = await fetchMarketEvent(nextPhase, nextWeek, nextCheckin);
    const nextMedia = nextEvent && nextEvent.media ? nextEvent.media : null;
    const macroForAdvance = macroNow; // snapshot the event applied to THIS advance

    let toSend = [];
    setState((p) => {
      let ns = advance(p, macroForAdvance);
      ns.started = true; // first session attended — class has begun
      const mail = followupEmail(ns, ns.week, batch);
      if (mail) ns.emails = [mail, ...(ns.emails || [])];
      if (ns.phase === "course") {
        if (ns.week >= 12) { ns.phase = "checkin"; ns.week = 12; ns.done = false; }
        else ns.week += 1;
      } else {
        ns.checkin += 1;
        if (ns.checkin >= 6) ns.done = true;
      }
      // Simulated pre-class media for the week we just arrived at (Weeks 3–12), built from the
      // event's media fetched above. In the click-driven sim the whole 3-email drip lands at
      // once; in production it's delivered one email per real day (−3/−2/−1) by the daily cron
      // in api/cron/market-news.js. Offline/demo: no media fetched → no drip (non-revealing).
      const media = (nextEvent && nextMedia) ? buildMediaDrip(nextEvent, nextMedia, ns) : [];
      if (media.length) ns.emails = [...media, ...(ns.emails || [])];
      toSend = [...(mail ? [mail] : []), ...media];
      return ns;
    });
    const who = s.student.email;
    const bodyFor = (m) => m.resources && m.resources.length
      ? `${m.body}\n\nResources:\n${m.resources.map((r) => `• ${r.label}: ${r.url}`).join("\n")}`
      : m.body;
    toSend.forEach((m) => sendEmail(who, m.subject, bodyFor(m)));
    const gotMedia = toSend.some((m) => m.type === "media");
    const base = s.phase === "course"
      ? (s.week >= 12 ? `Course-complete email sent to ${who}` : `Week ${s.week} recap sent to ${who}`)
      : `Check-in ${s.checkin + 1} email sent to ${who}`;
    ping(gotMedia ? `${base} (plus a 3-day market-news drip)` : base);
    setTab("dash");
  };

  const tabs = [
    { id: "dash", label: "Dashboard", icon: LineIcon },
    { id: "week", label: s.phase === "course" ? "This Week" : "Check-in", icon: GraduationCap },
    { id: "course", label: "Course", icon: BookOpen },
    { id: "port", label: "Portfolio", icon: PiggyBank },
    { id: "macro", label: "Markets", icon: Newspaper },
  ];

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <PageBackdrop tint="#eef2f6" />
      <div style={{ position: "relative", zIndex: 2, maxWidth: 1080, margin: "0 auto", padding: "18px 4vw 80px" }}>
      {toast && (
        <div style={{ position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)", zIndex: 50, background: C.ink, color: "#fff", padding: "12px 18px", borderRadius: 4, fontSize: 13.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 9, boxShadow: "0 14px 34px -14px rgba(0,0,0,.55)" }}>
          <Mail size={15} color={C.emeraldLite} /> {toast}
        </div>
      )}
      {withdraw && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(36,36,36,.45)", display: "grid", placeItems: "center", padding: 20 }}>
          <Card style={{ padding: 26, maxWidth: 420, width: "100%" }}>
            {withdraw === "confirm" ? (
              <>
                <div className="disp" style={{ fontSize: 20, fontWeight: 800 }}>{notStarted ? "Cancel your enrollment?" : "Withdraw from the program?"}</div>
                <p style={{ color: C.ink2, fontSize: 14, lineHeight: 1.55, marginTop: 8 }}>
                  {notStarted
                    ? <>Your cohort hasn't started yet, so you'll receive a <b>full refund of {fmt(refund)}</b> — no questions asked. This frees up your seat for someone else.</>
                    : <>You've attended {s.week} of 12 sessions. You'll receive a prorated refund of <b>{fmt(refund)}</b> for the {12 - s.week} sessions remaining. Refunds are available only through Act 1 (Week 3), so this can't be reversed.</>}
                </p>
                <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                  <button className="btn" onClick={() => setWithdraw(false)} style={{ flex: 1, background: C.paper2, color: C.ink, border: `1px solid ${C.line}`, padding: 12, borderRadius: 4, fontSize: 14 }}>Cancel</button>
                  <button className="btn" onClick={() => setWithdraw("done")} style={{ flex: 1, background: C.rust, color: "#fff", padding: 12, borderRadius: 4, fontSize: 14 }}>Confirm withdrawal</button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 56, height: 56, borderRadius: 4, background: C.emerald, display: "grid", placeItems: "center", margin: "4px auto 14px" }}><Check size={28} color="#fff" /></div>
                <div className="disp" style={{ fontSize: 20, fontWeight: 800 }}>Withdrawal complete</div>
                <p style={{ color: C.ink2, fontSize: 14, lineHeight: 1.55, marginTop: 8 }}>A {notStarted ? "full" : "prorated"} refund of <b>{fmt(refund)}</b> has been issued to {s.student.email} <span style={{ color: C.muted }}>(demo)</span>. We're sorry to see you go.</p>
                <button className="btn" onClick={onExit} style={{ width: "100%", marginTop: 18, background: C.ink, color: C.paper2, padding: 12, borderRadius: 4, fontSize: 14 }}>Return home</button>
              </div>
            )}
          </Card>
        </div>
      )}
      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div className="disp" style={{ fontWeight: 900, fontSize: 20 }}><Mark size={22} /> Build Young</div>
          <div style={{ fontSize: 13, color: C.muted }}>{s.student.name} · {s.student.track} cohort</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Pill bg={C.turq}>{s.phase === "course" ? `Week ${s.week} of 12` : s.done ? "Graduated" : `Check-in ${s.checkin + 1} of 6`}</Pill>
          <button className="btn" onClick={onExit} style={{ background: "transparent", border: `1.5px solid ${C.line}`, color: C.muted, padding: "7px 12px", borderRadius: 4, fontSize: 13 }}>Exit</button>
        </div>
      </div>

      {/* tabs */}
      <div style={{ display: "flex", gap: 6, margin: "18px 0", background: C.paper2, padding: 6, borderRadius: 4, border: `1px solid ${C.line}`, overflowX: "auto" }}>
        {tabs.map((t) => (
          <button key={t.id} type="button" className="tab btn" onClick={() => setTab(t.id)} aria-pressed={tab === t.id} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 4, whiteSpace: "nowrap", border: "none", background: tab === t.id ? C.ink : "transparent", color: tab === t.id ? C.paper2 : C.ink2, fontWeight: 700, fontSize: 14 }}>
            <t.icon size={15} />{t.label}
          </button>
        ))}
      </div>

      {tab === "dash" && (
        <div className="rise">
          <Card style={{ padding: 18, marginBottom: 12, background: C.ink, border: "none", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 4, background: "rgba(255,255,255,.12)", display: "grid", placeItems: "center" }}><Video size={20} color="#fff" /></div>
              <div>
                <div style={{ fontSize: 11, color: C.goldLite, fontWeight: 700, letterSpacing: ".06em" }}>YOUR LIVE CLASS · {batch.track.toUpperCase()}</div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{batch.day}</div>
                <div style={{ color: "rgba(255,255,255,.6)", fontSize: 12.5 }}>Same Zoom link for every class & check-in</div>
              </div>
            </div>
            <a href={batch.zoom} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
              <button className="btn" style={{ background: C.emeraldLite, color: "#fff", padding: "12px 20px", borderRadius: 4, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}><Video size={16} /> Join class on Zoom</button>
            </a>
          </Card>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
            <Stat label="Net Worth" value={fmt(nw)} icon={Sparkles} color={C.emerald} sub={s.history.length > 1 ? `${fmt(nw - last)} since last · simulated` : "Simulated money"} />
            <Stat label="Cash" value={fmt(s.cash)} icon={Wallet} />
            <Stat label="Savings" value={fmt(s.savings)} icon={PiggyBank} />
            <Stat label="Investments" value={fmt(holdingsTotal(s) + s.retirement + (s.pe || 0))} icon={TrendingUp} color={C.emerald} />
          </div>

          <Card style={{ padding: 20, marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, color: C.turq, fontWeight: 700, letterSpacing: ".05em" }}>{s.phase === "course" ? `WEEK ${s.week}` : `CHECK-IN ${s.checkin + 1}`}</div>
                <div className="disp" style={{ fontSize: 22, fontWeight: 800 }}>{s.phase === "course" ? wk.t : "Manage your portfolio"}</div>
              </div>
              {!s.done && <button className="btn" onClick={() => setTab("week")} style={{ background: C.emerald, color: "#fff", padding: "11px 18px", borderRadius: 4, fontSize: 14 }}>Open →</button>}
            </div>
            <div style={{ marginTop: 14, padding: 14, background: C.paper, borderRadius: 4, display: "flex", gap: 10, alignItems: "flex-start" }}>
              <Newspaper size={18} color={C.turq} style={{ flexShrink: 0, marginTop: 2 }} />
              <div><b>{macroNow.h}.</b> <span style={{ color: C.ink2 }}>{macroNow.d}</span></div>
            </div>
          </Card>

          {s.history.length > 1 && (
            <Card style={{ padding: 20, marginTop: 14 }}>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>Net worth over time</div>
              <React.Suspense fallback={<div style={{ height: 180, display: "grid", placeItems: "center", color: C.muted, fontSize: 13 }}>Loading chart…</div>}>
                <Charts kind="line" data={s.history} color={C.emerald} mutedColor={C.muted} fmt={fmt} />
              </React.Suspense>
            </Card>
          )}

          {canWithdraw && (
            <Card style={{ padding: 16, marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div style={{ fontSize: 13, color: C.muted, maxWidth: 560 }}>
                {notStarted
                  ? <>Changed your mind before the first class? Cancel any time before your cohort starts for a <b style={{ color: C.ink }}>full refund of {fmt(refund)}</b> — no questions asked.</>
                  : <>Changed your mind? You can withdraw for a <b style={{ color: C.ink }}>prorated refund</b> any time through the end of Act 1 (Week 3). You'd get back <b style={{ color: C.ink }}>{fmt(refund)}</b> for the {12 - s.week} sessions you haven't attended.</>}
              </div>
              <button className="btn" onClick={() => setWithdraw("confirm")} style={{ background: "transparent", border: `1px solid ${C.line}`, color: C.muted, padding: "9px 14px", borderRadius: 4, fontSize: 13 }}>{notStarted ? "Cancel enrollment" : "Withdraw"}</button>
            </Card>
          )}
          {!canWithdraw && s.started && s.phase === "course" && s.week > 3 && (
            <Card style={{ padding: 14, marginTop: 14 }}>
              <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>
                The refund window closed at the end of Act 1 (Week 3). Past that point, tuition is non-refundable — but you keep full access through all 12 weeks and every monthly check-in.
              </div>
            </Card>
          )}
        </div>
      )}
      {tab === "week" && <WeekPanel s={s} setState={setState} macroNow={macroNow} onAdvance={doAdvance} batch={batch} />}
      {tab === "course" && <CoursePanel s={s} batch={batch} />}
      {tab === "port" && <PortfolioPanel s={s} setState={setState} pieData={pieData} nw={nw} />}
      {tab === "macro" && (
        <div className="rise">
          <Card style={{ padding: 20 }}>
            <div className="disp" style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Market developments</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>Each event moves the asset classes differently — exactly why diversification matters.</div>
            {s.feed.length === 0 && <div style={{ color: C.muted }}>No market history yet — advance your first week to begin.</div>}
            {s.feed.map((f, i) => (
              <div key={i} style={{ borderTop: i ? `1px solid ${C.line}` : "none", padding: "14px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <b>{f.h}</b><span style={{ fontSize: 12, color: C.muted }}>{f.when}</span>
                </div>
                <div style={{ fontSize: 13.5, color: C.ink2, margin: "4px 0 8px" }}>{f.d}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {ASSETS.map((a) => {
                    const v = f.e[a.key]; const up = v >= 0;
                    return <span key={a.key} style={{ fontSize: 12, fontWeight: 700, color: up ? C.emerald : C.rust, background: C.paper, padding: "4px 9px", borderRadius: 4 }}>{a.label} {pct(v)}</span>;
                  })}
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}
      </div>
    </div>
  );
}
// A single resource as a pill link (opens in a new tab, safely).
function ResLink({ r, icon: Icon = Newspaper }) {
  return (
    <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: C.emerald, background: C.paper, border: `1px solid ${C.line}`, borderRadius: 999, padding: "6px 12px", textDecoration: "none", lineHeight: 1.3 }}>
      <Icon size={12} style={{ flexShrink: 0 }} /> {r.label} ↗
    </a>
  );
}

/* ---- Course hub: every week's materials + the resources we email, for review/catch-up ---- */
function CoursePanel({ s, batch }) {
  const offCourse = s.phase !== "course"; // in check-ins / graduated, the 12 weeks are all done
  const currentWeek = offCourse ? 12 : s.week;
  const [open, setOpen] = useState(() => new Set([currentWeek]));
  const toggle = (n) => setOpen((prev) => {
    const nx = new Set(prev);
    nx.has(n) ? nx.delete(n) : nx.add(n);
    return nx;
  });

  // The per-week market-event resources are server-only (the schedule isn't in the bundle).
  // Fetch them for UNLOCKED weeks only (current + past — never future), one /api/market-event
  // call per week, cached by week number. Offline/demo: fetch returns null → no resources
  // shown (the class materials still render). This only ever surfaces past/current weeks, so
  // it reveals nothing the student isn't already entitled to.
  const [weekRes, setWeekRes] = useState({}); // { [week]: resources[] }
  const unlockedThrough = offCourse ? 12 : currentWeek;
  useEffect(() => {
    let live = true;
    for (let week = 1; week <= unlockedThrough; week++) {
      if (weekRes[week] !== undefined) continue; // already fetched/cached
      const wk = week; // capture
      fetchMarketEvent("course", wk, 0).then((ev) => {
        if (!live) return;
        const res = ev && ev.media && ev.media.resources ? ev.media.resources : [];
        setWeekRes((prev) => (prev[wk] !== undefined ? prev : { ...prev, [wk]: res }));
      });
    }
    return () => { live = false; };
  }, [unlockedThrough]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="rise">
      <Card style={{ padding: 20, marginBottom: 12 }}>
        <div className="disp" style={{ fontSize: 20, fontWeight: 800 }}>Your course, week by week</div>
        <div style={{ fontSize: 13.5, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
          Missed a class or want to review? It's all here. Each week unlocks as you reach it, with its class materials and the same market-event resources we email you — so you can catch up, revise, and dig deeper any time.
        </div>
        {batch && (
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: C.ink2, flexWrap: "wrap" }}>
            <Video size={14} color={C.emerald} /> Missed a session? Same class Zoom link every week:
            <a href={batch.zoom} target="_blank" rel="noopener noreferrer" style={{ color: C.emerald, fontWeight: 700, textDecoration: "none" }}>Join / rewatch ↗</a>
          </div>
        )}
      </Card>
      {[1, 2, 3].map((act) => (
        <div key={act}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "14px 2px 8px" }}>
            <Pill bg={act === 1 ? C.green : act === 2 ? C.pink : C.turq}>Act {act}</Pill>
            <span className="disp" style={{ fontSize: 15, fontWeight: 700, color: C.ink2 }}>{ACTS[act]}</span>
          </div>
          {WEEKS.map((w, i) => {
            const week = i + 1;
            if (w.act !== act) return null;
            const unlocked = offCourse || week <= currentWeek;
            const status = !unlocked ? "Upcoming" : (week === currentWeek && !offCourse ? "This week" : "Completed");
            const statusColor = status === "This week" ? C.emerald : status === "Completed" ? C.turq : C.muted;
            const resources = unlocked ? (weekRes[week] || []) : [];
            const materials = unlocked ? (w.materials || []) : [];
            const isOpen = open.has(week);
            return (
              <Card key={week} style={{ padding: 0, marginBottom: 10, overflow: "hidden", opacity: unlocked ? 1 : 0.65 }}>
                <button type="button" className="btn" onClick={() => unlocked && toggle(week)} aria-expanded={isOpen} disabled={!unlocked}
                  style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", padding: "13px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, cursor: unlocked ? "pointer" : "not-allowed" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    {!unlocked && <Lock size={13} color={C.muted} style={{ flexShrink: 0 }} />}
                    <span style={{ minWidth: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: statusColor, letterSpacing: ".04em" }}>WEEK {week} · {status.toUpperCase()}</span>
                      <span className="disp" style={{ display: "block", fontSize: 16, fontWeight: 700, color: C.ink }}>{w.t}</span>
                    </span>
                  </span>
                  {unlocked && <span aria-hidden="true" style={{ color: C.muted, fontSize: 20, flexShrink: 0, lineHeight: 1 }}>{isOpen ? "–" : "+"}</span>}
                </button>
                {unlocked && isOpen && (
                  <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${C.line}` }}>
                    <div style={{ fontSize: 13.5, color: C.ink2, lineHeight: 1.5, margin: "12px 0" }}>{w.s}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: ".05em", textTransform: "uppercase", marginBottom: 8 }}>Class materials</div>
                    {materials.length ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {materials.map((r, j) => <ResLink key={j} r={r} icon={BookOpen} />)}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12.5, color: C.muted, fontStyle: "italic" }}>Lesson materials coming soon.</div>
                    )}
                    {resources.length > 0 && (
                      <>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: ".05em", textTransform: "uppercase", margin: "16px 0 8px" }}>This week's market event — research it</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {resources.map((r, j) => <ResLink key={j} r={r} icon={Newspaper} />)}
                        </div>
                      </>
                    )}
                  </div>
                )}
                {!unlocked && (
                  <div style={{ padding: "0 16px 13px 38px", fontSize: 12.5, color: C.muted }}>Unlocks when you reach Week {week}.</div>
                )}
              </Card>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function PortfolioPanel({ s, setState, pieData, nw }) {
  const rebalance = (preset) => setState((p) => {
    const ns = JSON.parse(JSON.stringify(p));
    ns.settings.risk = preset; ns.alloc = { ...RISK_PRESETS[preset] };
    const tot = ASSETS.reduce((a, x) => a + ns.holdings[x.key], 0);
    ASSETS.forEach((x) => { ns.holdings[x.key] = tot * RISK_PRESETS[preset][x.key]; });
    return ns;
  });
  const rows = [
    { l: "Cash (checking)", v: s.cash, c: C.ink },
    { l: "Savings", v: s.savings, c: C.emerald },
    { l: "401(k) retirement", v: s.retirement, c: C.emerald },
    ...ASSETS.map((a) => ({ l: a.label + " (brokerage)", v: s.holdings[a.key], c: a.color })),
    ...(s.pe > 0 ? [{ l: "Private equity (locked up)", v: s.pe, c: C.pink }] : []),
    ...(s.home ? [{ l: "Home equity", v: s.home.value - s.home.mortgage, c: C.gold }] : []),
    ...(s.car ? [{ l: "Car equity", v: s.car.value - s.car.loan, c: C.turq }] : []),
    ...(s.card.balance > 0 ? [{ l: "Credit card debt", v: -s.card.balance, c: C.rust }] : []),
  ];
  return (
    <div className="rise">
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
        {pieData.length > 0 && (
          <Card style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Brokerage allocation</div>
            <React.Suspense fallback={<div style={{ height: 200, display: "grid", placeItems: "center", color: C.muted, fontSize: 13 }}>Loading chart…</div>}>
              <Charts kind="pie" data={pieData} mutedColor={C.muted} fmt={fmt} />
            </React.Suspense>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              {pieData.map((d, i) => <span key={i} style={{ fontSize: 12, color: C.ink2 }}><span style={{ display: "inline-block", width: 10, height: 10, background: d.color, borderRadius: 3, marginRight: 5 }} />{d.name}</span>)}
            </div>
            <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 14, paddingTop: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Rebalance to a risk style</div>
              <div style={{ display: "flex", gap: 8 }}>
                {Object.keys(RISK_PRESETS).map((r) => (
                  <button key={r} className="btn" onClick={() => rebalance(r)} style={{ flex: 1, textTransform: "capitalize", background: s.settings.risk === r ? C.emerald : C.paper, color: s.settings.risk === r ? "#fff" : C.ink, padding: "9px", borderRadius: 4, border: `1px solid ${C.line}`, fontSize: 13 }}>{r}</button>
                ))}
              </div>
            </div>
          </Card>
        )}
        <Card style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Holdings</div>
          {rows.map((r, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderTop: i ? `1px solid ${C.line}` : "none" }}>
              <span style={{ color: C.ink2 }}><span style={{ display: "inline-block", width: 8, height: 8, background: r.c, borderRadius: 2, marginRight: 8 }} />{r.l}</span>
              <span style={{ fontWeight: 700, color: r.v < 0 ? C.rust : C.ink }}>{fmt(r.v)}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 0", marginTop: 6, borderTop: `2px solid ${C.ink}` }}>
            <span className="disp" style={{ fontWeight: 800 }}>Net worth</span>
            <span className="disp" style={{ fontWeight: 800, color: C.emerald }}>{fmt(nw)}</span>
          </div>
        </Card>
        <Card style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: C.muted, fontSize: 13, fontWeight: 600 }}>Credit score</span>
            <span style={{ fontWeight: 800, color: s.creditScore > 700 ? C.emerald : s.creditScore > 620 ? C.gold : C.rust }}>{s.creditScore}</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---- the weekly action panel ---- */
function WeekPanel({ s, setState, macroNow, onAdvance, batch }) {
  const wk = WEEKS[s.week - 1];
  const action = s.phase === "course" ? wk.action : "checkin";
  const set = (fn) => setState((p) => { const ns = JSON.parse(JSON.stringify(p)); fn(ns); return ns; });

  const Wrap = ({ children, title, blurb }) => (
    <Card style={{ padding: 22 }}>
      {s.phase === "course" && <div style={{ fontSize: 12, color: wk.act === 1 ? C.green : wk.act === 2 ? C.pink : C.turq, fontWeight: 700, letterSpacing: ".05em" }}>WEEK {s.week} · ACT {wk.act}</div>}
      <div className="disp" style={{ fontSize: 24, fontWeight: 800, margin: "4px 0 6px" }}>{title}</div>
      <div style={{ color: C.muted, fontSize: 14, marginBottom: 18, lineHeight: 1.45 }}>{blurb}</div>
      {children}
    </Card>
  );
  const btn = { background: C.emerald, color: "#fff", padding: "11px 16px", borderRadius: 4, fontSize: 14 };
  const sliderRow = (label, val, setFn, min, max, step, suffix = "%") => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 600 }}><span>{label}</span><span style={{ color: C.emerald }}>{Math.round(val * 100)}{suffix}</span></div>
      <input type="range" aria-label={label} aria-valuetext={`${Math.round(val * 100)}${suffix}`} min={min} max={max} step={step} value={val} onChange={(e) => setFn(parseFloat(e.target.value))} style={{ width: "100%", accentColor: C.emerald }} />
    </div>
  );

  return (
    <div className="rise">
      {batch && (
        <a href={batch.zoom} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: C.paper2, border: `1px solid ${C.line}`, borderRadius: 4, padding: "12px 16px", marginBottom: 12 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13.5, fontWeight: 600, color: C.ink2 }}><Video size={16} color={C.emerald} /> {s.phase === "course" ? `Week ${s.week} class` : "Check-in"} is live on Zoom · {batch.day}</span>
            <span className="btn" style={{ background: C.emerald, color: "#fff", padding: "8px 14px", borderRadius: 4, fontSize: 13 }}>Join →</span>
          </div>
        </a>
      )}
      {action === "settings" && (
        <Wrap title="Set Up Your Paycheck" blurb={`Every class pays ${fmt(PAY)}. A flat 15% goes to taxes. Choose your 401(k) contribution — your employer matches dollar-for-dollar up to 5%. These become your standing settings for the whole course.`}>
          {sliderRow("401(k) contribution", s.settings.retire401k, (v) => set((n) => n.settings.retire401k = v), 0, 0.1, 0.01)}
          <div style={{ background: C.paper, borderRadius: 4, padding: 12, fontSize: 13, color: C.ink2 }}>
            On a {fmt(PAY)} paycheck: ~{fmt(PAY * s.settings.retire401k)} to your 401(k), plus a {fmt(PAY * Math.min(s.settings.retire401k, 0.05))} employer match — free money.
          </div>
        </Wrap>
      )}

      {action === "allocation" && (
        <Wrap title="Savings & Investing" blurb="Decide how much of each paycheck flows automatically into savings and your brokerage, and pick an investing style. Starting now means decades of compounding.">
          {sliderRow("Auto-save to savings", s.settings.savingsRate, (v) => set((n) => n.settings.savingsRate = v), 0, 0.5, 0.05)}
          {sliderRow("Auto-invest to brokerage", s.settings.brokerageRate, (v) => set((n) => n.settings.brokerageRate = v), 0, 0.5, 0.05)}
          <div style={{ fontSize: 13, fontWeight: 700, margin: "6px 0 8px" }}>Investing style</div>
          <div style={{ display: "flex", gap: 8 }}>
            {Object.keys(RISK_PRESETS).map((r) => (
              <button key={r} className="btn" onClick={() => set((n) => { n.settings.risk = r; n.alloc = { ...RISK_PRESETS[r] }; })} style={{ flex: 1, textTransform: "capitalize", background: s.settings.risk === r ? C.emerald : C.paper, color: s.settings.risk === r ? "#fff" : C.ink, padding: 10, borderRadius: 4, border: `1px solid ${C.line}`, fontSize: 13 }}>{r}</button>
            ))}
          </div>
          <div style={{ marginTop: 12, fontSize: 12.5, color: C.muted }}>{s.settings.risk} mix → {ASSETS.map((a) => `${Math.round(s.alloc[a.key] * 100)}% ${a.label.toLowerCase()}`).join(" · ")}. Aggressive leans stocks; conservative leans bonds. Diversifying across all four cushions any single shock.</div>
        </Wrap>
      )}

      {action === "macro" && (
        <Wrap title="How Macro Moves Your Money" blurb="Inflation, interest rates and recessions push each asset class in different directions. Watch this week's development hit your portfolio when you advance.">
          <div style={{ background: C.paper, borderRadius: 4, padding: 14, marginBottom: 8 }}>
            <b>{macroNow.h}.</b> <span style={{ color: C.ink2 }}>{macroNow.d}</span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              {ASSETS.map((a) => { const v = macroNow.e[a.key]; return <span key={a.key} style={{ fontSize: 12, fontWeight: 700, color: v >= 0 ? C.emerald : C.rust, background: C.card, padding: "4px 9px", borderRadius: 4 }}>{a.label} {pct(v)}</span>; })}
            </div>
          </div>
          <div style={{ fontSize: 13, color: C.muted }}>Notice how bonds and bullion often move opposite stocks — that's the whole case for spreading your money around.</div>
        </Wrap>
      )}

      {action === "framework" && (
        <Wrap title="Big Purchases: The Framework" blurb="Before you buy, learn the rules. A mortgage can be 'good' debt (a home may grow in value); a car loan is usually 'bad' debt (cars lose value). Always weigh the total cost of ownership, not just the sticker.">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ background: C.paper, borderRadius: 4, padding: 14 }}><Home size={18} color={C.gold} /><div style={{ fontWeight: 700, marginTop: 6 }}>Home</div><div style={{ fontSize: 13, color: C.ink2 }}>Down payment + mortgage. Can appreciate. Often "good" debt.</div></div>
            <div style={{ background: C.paper, borderRadius: 4, padding: 14 }}><Car size={18} color={C.turq} /><div style={{ fontWeight: 700, marginTop: 6 }}>Car</div><div style={{ fontSize: 13, color: C.ink2 }}>Depreciates from day one. Add fuel, insurance, repairs.</div></div>
          </div>
          <div style={{ marginTop: 12, fontSize: 13, color: C.muted }}>Next week you'll actually choose and finance both — so plan how much of your savings to use as a down payment.</div>
        </Wrap>
      )}

      {action === "buy" && (
        <Wrap title="Big Purchases: Making the Call" blurb="Use your savings for down payments and finance the rest. The monthly payments will autopay from your account for the rest of the course.">
          <div style={{ display: "grid", gap: 12 }}>
            <BuyCard icon={Home} color={C.gold} title={`Starter home — ${fmt(HOME.price)}`} detail={`5% down (${fmt(HOME.down)}) · ~${fmt(HOME.payment)}/mo mortgage`} owned={!!s.home}
              onBuy={() => set((n) => { n.savings -= HOME.down; n.home = { value: HOME.price, mortgage: HOME.mortgage, payment: HOME.payment }; })} disabled={s.savings < HOME.down} />
            <BuyCard icon={Car} color={C.turq} title={`Used car — ${fmt(CAR.price)}`} detail={`20% down (${fmt(CAR.down)}) · ~${fmt(CAR.payment)}/mo loan`} owned={!!s.car}
              onBuy={() => set((n) => { n.savings -= CAR.down; n.car = { value: CAR.price, loan: CAR.loan, payment: CAR.payment }; })} disabled={s.savings < CAR.down} />
          </div>
          {s.savings < HOME.down && !s.home && <div style={{ marginTop: 10, fontSize: 13, color: C.rust }}>Not enough saved for the home down payment yet — keep advancing weeks, or buy just the car for now.</div>}
        </Wrap>
      )}

      {action === "budget" && (
        <Wrap title="Surprises & Temptations" blurb="Your bills now autopay in the background. This week two things hit at once: a surprise emergency and the urge to splurge. Your choices change your balances.">
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ background: C.paper, borderRadius: 4, padding: 14 }}>
              <div style={{ display: "flex", gap: 8 }}><AlertTriangle size={18} color={C.rust} /><b>Emergency: {fmt(EMERGENCY)} car repair</b></div>
              <div style={{ fontSize: 13, color: C.ink2, margin: "6px 0 10px" }}>Cover it from savings (smart) or put it on a credit card (costly).</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn" onClick={() => set((n) => n.savings -= EMERGENCY)} style={{ ...btn, background: C.emerald }}>Pay from savings</button>
                <button className="btn" onClick={() => set((n) => { n.card.open = true; n.card.balance += EMERGENCY; })} style={{ ...btn, background: C.paper, color: C.ink, border: `1px solid ${C.line}` }}>Put on credit</button>
              </div>
            </div>
            <div style={{ background: C.paper, borderRadius: 4, padding: 14 }}>
              <div style={{ display: "flex", gap: 8 }}><ShoppingBag size={18} color={C.gold} /><b>Temptation: {fmt(SPREE)} shopping spree</b></div>
              <div style={{ fontSize: 13, color: C.ink2, margin: "6px 0 10px" }}>That same {fmt(SPREE)} invested could be worth far more later.</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn" onClick={() => set(takeSpree)} style={{ ...btn, background: C.gold }}>Treat myself</button>
                <button className="btn" onClick={() => set(investInstead)} style={{ ...btn, background: C.emerald }}>Invest it instead</button>
              </div>
            </div>
          </div>
        </Wrap>
      )}

      {action === "credit" && (
        <Wrap title="Credit & Credit Scores" blurb="A credit card builds your score when used well — and wrecks it when balances pile up. Your score sets the rates you'd get on loans.">
          {!s.card.open
            ? <button className="btn" onClick={() => set((n) => n.card.open = true)} style={btn}>Open my first credit card</button>
            : <div style={{ background: C.paper, borderRadius: 4, padding: 14 }}>
              <div>Card balance: <b>{fmt(s.card.balance)}</b> · Score: <b style={{ color: s.creditScore > 700 ? C.emerald : C.gold }}>{s.creditScore}</b></div>
              {s.card.balance > 0 && <button className="btn" onClick={() => set((n) => { const pay = Math.min(n.cash, n.card.balance); n.cash -= pay; n.card.balance -= pay; })} style={{ ...btn, marginTop: 10 }}>Pay it off in full</button>}
              <div style={{ fontSize: 13, color: C.muted, marginTop: 10 }}>Paying in full every cycle is what builds a strong score — and carried balances charge ~4% interest each period here.</div>
            </div>}
        </Wrap>
      )}

      {action === "review" && (
        <Wrap title="Same Start, Different Results" blurb={`Everyone began with identical ${fmt(PAY)} paychecks. Here's what your choices built so far — and there's still time to adjust before the final stretch.`}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Stat label="Net worth" value={fmt(netWorth(s))} color={C.emerald} />
            <Stat label="Invested" value={fmt(holdingsTotal(s) + s.retirement)} />
            <Stat label="Savings" value={fmt(s.savings)} />
            <Stat label="Credit score" value={s.creditScore} />
          </div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 12 }}>The biggest drivers of the spread: how much you invested early, your risk style through the market swings, and whether you carried debt. Tweak your settings in the Portfolio tab if needed.</div>
        </Wrap>
      )}

      {action === "rebalance" && (
        <Wrap title="Active Investing" blurb="You've been invested since Week 2 through every market move. Review and rebalance your mix in the Portfolio tab — then let it ride.">
          <div style={{ fontSize: 14, color: C.ink2 }}>Head to the <b>Portfolio</b> tab to see your allocation and rebalance to conservative, balanced, or aggressive. Diversified portfolios tend to ride out shocks better than concentrated ones.</div>
        </Wrap>
      )}

      {action === "hustle" && (
        <Wrap title="Build Something — Market Day" blurb="AI is changing how the world earns — the builders and owners capture the value, not the consumers. Use a skill (with AI as a tool) to build something people will pay for, on top of your paycheck.">
          {!s.hustle
            ? <button className="btn" onClick={() => set((n) => { n.hustle = true; n.cash -= HUSTLE_START; })} style={btn} disabled={s.cash < HUSTLE_START}>Launch your build (−{fmt(HUSTLE_START)} to start)</button>
            : <div style={{ background: C.paper, borderRadius: 4, padding: 14, color: C.ink2 }}>Your build is up and running — it adds extra income each time you advance. Nice work.</div>}
        </Wrap>
      )}

      {action === "protect" && (
        <Wrap title="Grow & Protect" blurb="Round out your portfolio with alternatives — and protect what you've built with insurance and an emergency fund.">
          <div style={{ display: "grid", gap: 10 }}>
            <BuyCard icon={Coins} color={C.goldLite} title={`Buy ${fmt(ALT_BUY)} in bullion`} detail="Gold — an inflation hedge" owned={false}
              onBuy={() => set((n) => { n.cash -= ALT_BUY; n.holdings.bullion += ALT_BUY; })} disabled={s.cash < ALT_BUY} cta="Buy" />
            <BuyCard icon={Building2} color={C.green} title={`Buy ${fmt(ALT_BUY)} in a REIT`} detail="Income real estate, fully liquid" owned={false}
              onBuy={() => set((n) => { n.cash -= ALT_BUY; n.holdings.reits += ALT_BUY; })} disabled={s.cash < ALT_BUY} cta="Buy" />
            <BuyCard icon={Briefcase} color={C.pink} title={`Buy ${fmt(PE_BUY)} in private equity`} detail="Private companies — high return, but illiquid & locked up" owned={false}
              onBuy={() => set((n) => { n.cash -= PE_BUY; n.pe = (n.pe || 0) + PE_BUY; })} disabled={s.cash < PE_BUY} cta="Invest" />
            <BuyCard icon={Shield} color={C.emerald} title="Insurance policy" detail="Protects against major losses" owned={s.insured} cta="Insure"
              onBuy={() => set((n) => { n.insured = true; n.cash -= INSURANCE; })} disabled={s.cash < INSURANCE} />
          </div>
          <div style={{ fontSize: 13, color: s.insured ? C.emerald : C.muted, marginTop: 10 }}>{s.insured ? "You're insured — a major setback won't wipe you out." : "Without insurance, a big emergency comes straight out of your pocket."}</div>
        </Wrap>
      )}

      {action === "capstone" && (
        <Wrap title="Capstone: Your Net Worth" blurb="You started with nothing but a paycheck. Here's the life you built.">
          <Stat label="Final net worth" value={fmt(netWorth(s))} color={C.emerald} icon={Sparkles} />
          <div style={{ marginTop: 12, padding: 14, background: "#e7f3ee", border: `1px solid ${C.green}`, borderRadius: 4, display: "flex", gap: 10, alignItems: "flex-start" }}>
            <Sparkles size={18} color={C.green} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 13.5, color: C.ink2, lineHeight: 1.5 }}>
              <b style={{ color: C.green }}>You're in the running for the tuition prize.</b> The student with the highest portfolio value at the <b>final (6th) monthly check-in</b> earns their <b>tuition refunded</b> — so the 6 check-ins still count. Keep growing it. <span style={{ color: C.muted }}>Simulated; winner confirmed by Sunil at the close. See Terms.</span>
            </div>
          </div>
          <div style={{ fontSize: 14, color: C.ink2, marginTop: 12 }}>From here you move into 6 monthly check-ins — the markets keep moving, and you keep managing your portfolio. Advance to begin.</div>
        </Wrap>
      )}

      {action === "checkin" && (
        <Wrap title={s.done ? "You've graduated 🎓" : `Check-in ${s.checkin + 1} of 6`} blurb={s.done ? "Six months of independent investing, done. Your portfolio reflects every decision you made." : `Showing up still earns your ${fmt(PAY)} salary. A new market development is unfolding — rebalance in the Portfolio tab if you want, then advance to collect your pay and apply it.`}>
          {!s.done && <div style={{ background: C.paper, borderRadius: 4, padding: 14 }}><b>{macroNow.h}.</b> <span style={{ color: C.ink2 }}>{macroNow.d}</span></div>}
          {s.done && <Stat label="Net worth after one year independent" value={fmt(netWorth(s))} color={C.emerald} icon={Sparkles} />}
        </Wrap>
      )}

      {!s.done && (
        <button className="btn" onClick={onAdvance} style={{ width: "100%", marginTop: 14, background: C.ink, color: C.paper2, padding: 15, borderRadius: 4, fontSize: 16 }}>
          {s.phase === "course" ? (s.week >= 12 ? "Finish course → begin check-ins" : `Collect ${fmt(PAY)} & advance to Week ${s.week + 1}`) : `Collect ${fmt(PAY)} salary & continue`} <ArrowRight size={16} style={{ verticalAlign: "-2px" }} />
        </button>
      )}
    </div>
  );
}

function BuyCard({ icon: Icon, color, title, detail, owned, onBuy, disabled, cta = "Buy & finance" }) {
  return (
    <div style={{ background: C.paper, borderRadius: 4, padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: 4, background: C.card, display: "grid", placeItems: "center", flexShrink: 0 }}><Icon size={20} color={color} /></div>
      <div style={{ flex: 1 }}><div style={{ fontWeight: 700 }}>{title}</div><div style={{ fontSize: 12.5, color: C.muted }}>{detail}</div></div>
      {owned ? <Pill bg={C.emerald}>Owned</Pill>
        : <button className="btn" onClick={onBuy} disabled={disabled} style={{ background: disabled ? C.line : C.emerald, color: "#fff", padding: "9px 14px", borderRadius: 4, fontSize: 13 }}>{cta}</button>}
    </div>
  );
}

/* ============================ ROOT ============================ */
/* ============================ LEGAL (in-app, works everywhere) ============================ */
const LEGAL = {
  privacy: {
    title: "Privacy Policy",
    sections: [
      ["Who we are", `Build Young provides live, online money-skills classes for teenagers. You can reach us at ${CONFIG.contactEmail}.`],
      ["Eligibility — ages 13 and up", "Build Young is intended for students aged 13 and older. We do not knowingly create accounts for, or collect personal information from, children under 13. If you believe a child under 13 has provided us information, contact us and we will delete it."],
      ["What we collect", "To enroll a student and run the class, we collect the enrolling adult's name and email, the student's first name or chosen display name, the selected class, and payment confirmation (processed by our payment provider — we do not store full card numbers). During class activities, the student interacts with a learning simulation; the figures shown are simulated and are not real financial accounts."],
      ["How we use it", "We use this information to deliver the class, send class logistics and reminders, process enrollment and refunds, and improve the program. We send a confirmation email at enrollment and follow-ups tied to class sessions."],
      ["What we do not do", "We do not sell or rent personal information. We do not share it for third-party targeted advertising. We do not use student information to train artificial-intelligence models."],
      ["Sharing with service providers", "We rely on vetted providers to operate — for example payment processing, scheduling, video conferencing, and email delivery. They receive only what they need to perform their service and are bound to protect it."],
      ["Your choices", "You may request a copy of, correction to, or deletion of your information by emailing us. You can unsubscribe from non-essential email at any time."],
      ["Data retention & security", "We keep information only as long as needed for the purposes above and apply reasonable safeguards to protect it."],
      ["Changes", "We may update this policy and will post the new date above."],
    ],
  },
  terms: {
    title: "Terms of Service",
    sections: [
      ["The program", "Build Young offers live, online money-skills classes — 12 weekly sessions plus monthly check-ins — delivered over video conference. Class activities use a learning simulation."],
      ["Eligibility", "Students must be at least 13 years old. An adult (parent or guardian) completes enrollment and payment on the student's behalf."],
      ["Education, not financial advice", "Build Young is financial education. It is not licensed financial, investment, tax, or legal advice. All money, accounts, prices, and returns shown in the simulation are simulated; no real funds are ever involved."],
      ["Payment", "Tuition is shown at enrollment and charged through our payment provider at the price listed for the selected cohort."],
      ["Refund policy", "Cancel any time before your cohort's first session for a full refund. Once the program has started, you may withdraw for a prorated refund through the end of Act 1 (the first three weeks) — the refund equals the tuition multiplied by the fraction of sessions not yet held. After Act 1, tuition is non-refundable."],
      ["Tuition prize", "Each cohort, the enrolled student whose simulated portfolio has the highest value at the final (sixth) monthly check-in — i.e. at the close of the full program — is awarded a refund of their tuition. Standings are based solely on the in-program simulation; all figures are simulated and no real investing occurs. One award per cohort; in the event of a tie or a data discrepancy, Build Young determines the winner in good faith, and its decision is final. The award is the tuition amount paid for that cohort and is issued after the program concludes. No advantage is conferred by investing style — every student faces the same simulated market. Build Young may modify or discontinue the prize for future cohorts; the terms in effect at your enrollment apply. (This is a draft; the prize is a contest involving minors and must be reviewed by counsel for applicable contest/sweepstakes rules before launch.)"],
      ["Conduct", "We ask students and families to be respectful in live sessions. We may remove anyone whose conduct disrupts the class, consistent with the refund policy above."],
      ["Changes & contact", `We may update these terms and will post the new date above. Questions: ${CONFIG.contactEmail}.`],
    ],
  },
};
function LegalModal({ kind, onClose }) {
  const doc = LEGAL[kind];
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (!doc) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(36,36,36,.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "5vh 16px", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} className="rise" style={{ background: "#fff", borderRadius: 10, maxWidth: 720, width: "100%", padding: "28px 30px 34px", boxShadow: "0 30px 70px -20px rgba(0,0,0,.4)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <h2 className="disp" style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.02em", margin: 0 }}>{doc.title}</h2>
          <button className="btn" onClick={onClose} aria-label="Close" style={{ background: C.paper2, border: `1px solid ${C.line}`, borderRadius: 4, width: 32, height: 32, fontSize: 18, color: C.muted, flexShrink: 0 }}>×</button>
        </div>
        <div style={{ fontSize: 12.5, color: C.muted, marginTop: 4 }}>Last updated: [set before launch]</div>
        <div style={{ background: "#fbeede", border: `1px solid ${C.goldLite}`, borderRadius: 4, padding: "11px 13px", fontSize: 13, color: C.ink2, marginTop: 14 }}>
          <b>Draft template — not legal advice.</b> Have an attorney review and finalize this before launch.
        </div>
        {doc.sections.map(([h, p], i) => (
          <div key={i} style={{ marginTop: 20 }}>
            <h3 className="disp" style={{ fontSize: 17, fontWeight: 700, margin: "0 0 5px" }}>{h}</h3>
            <p style={{ fontSize: 14.5, color: C.ink2, lineHeight: 1.6, margin: 0 }}>{p}</p>
          </div>
        ))}
        <button className="btn" onClick={onClose} style={{ marginTop: 26, background: C.ink, color: C.paper2, padding: "11px 22px", borderRadius: 4, fontSize: 14 }}>Close</button>
      </div>
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState("home"); // home | enroll | call | app
  const [history, setHistory] = useState([]); // stack of routes we navigated from
  const [preselect, setPreselect] = useState(null);
  const [state, setState] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [legal, setLegal] = useState(null); // null | "privacy" | "terms"
  // remember scroll position per route so Back lands where you left off
  const pendingScroll = useRef(null); // px to restore after next render (null = scroll to top)
  const scrollTo = (y) => { try { window.scrollTo(0, y); } catch (e) {} };
  // single-flight lock: a route transition takes one frame; ignore re-fires within it
  // (prevents double-click races — history desync, double-enroll, duplicate emails).
  const navLock = useRef(false);
  const guard = (fn) => {
    if (navLock.current) return;
    navLock.current = true;
    try { fn(); } finally { requestAnimationFrame(() => { navLock.current = false; }); }
  };
  // navigate forward, remembering where we came from + our scroll position
  const nav = (to) => guard(() => {
    const y = typeof window !== "undefined" ? window.scrollY || window.pageYOffset || 0 : 0;
    setHistory((h) => [...h, { route, scroll: y }]);
    pendingScroll.current = 0; // new page starts at the top
    setRoute(to);
  });
  const goBack = () => guard(() => {
    const prev = history.length ? history[history.length - 1] : { route: "home", scroll: 0 };
    pendingScroll.current = prev.scroll || 0; // restore where we were
    setRoute(prev.route);
    setHistory((h) => h.slice(0, -1));
  });
  const goHome = () => guard(() => { pendingScroll.current = 0; setHistory([]); setRoute("home"); });
  // apply the pending scroll after the route's content has rendered
  useLayoutEffect(() => {
    if (pendingScroll.current == null) return;
    const y = pendingScroll.current;
    pendingScroll.current = null;
    // one rAF lets the (taller) page lay out before we restore position
    requestAnimationFrame(() => requestAnimationFrame(() => scrollTo(y)));
  }, [route]);

  // load persisted state — and handle Stripe payment return (?enrolled=batchId)
  const didLoad = useRef(false);
  useEffect(() => {
    if (didLoad.current) return; // run once even under StrictMode double-invoke
    didLoad.current = true;
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const paidBatch = params.get("enrolled");
        if (paidBatch) {
          let pending = null;
          try { pending = JSON.parse(window.localStorage.getItem(PENDING_KEY) || "null"); } catch (e) {}
          const b = BATCHES.find((x) => x.id === paidBatch);
          if (b) {
            const student = pending && pending.batch === paidBatch
              ? pending
              : { name: "", email: "", batch: paidBatch, track: b.track };
            try { window.localStorage.removeItem(PENDING_KEY); } catch (e) {}
            window.history.replaceState({}, "", window.location.pathname);
            // mirror the demo flow: send the welcome email on a real (Stripe) enrollment too
            const w = welcomeEmail(student);
            sendEmail(student.email, w.subject, w.body);
            setState(newState(student)); setRoute("app"); setLoaded(true);
            return;
          }
        }
        if (typeof window !== "undefined" && window.storage) {
          const r = await window.storage.get("by:state");
          if (r && r.value) { setState(JSON.parse(r.value)); setRoute("app"); }
        }
      } catch (e) { /* no saved state */ }
      setLoaded(true);
    })();
  }, []);

  // persist state
  useEffect(() => {
    if (!loaded || !state) return;
    try { if (window.storage) window.storage.set("by:state", JSON.stringify(state)); } catch (e) { }
  }, [state, loaded]);

  const startEnroll = (batchId) => { setPreselect(typeof batchId === "string" ? batchId : null); nav("enroll"); };
  const startCall = () => nav("call");
  const finishEnroll = (student) => guard(() => {
    const w = welcomeEmail(student);
    sendEmail(student.email, w.subject, w.body);
    pendingScroll.current = 0; setHistory([]); setState(newState(student)); setRoute("app");
  });
  const exitApp = () => guard(() => {
    try { if (window.storage) window.storage.delete("by:state"); } catch (e) { }
    pendingScroll.current = 0; setHistory([]); setState(null); setRoute("home");
  });

  return (
    <div className="flp" style={{ minHeight: "100vh", background: C.paper }}>
      <style>{FONTS}</style>
      <div style={{ background: C.ink, color: C.paper2, textAlign: "center", fontSize: 12.5, fontWeight: 600, lineHeight: 1.5, padding: "8px 16px", position: "relative", zIndex: 3 }}>
        <Coins size={13} color={C.goldLite} style={{ verticalAlign: "-2px", marginRight: 5 }} /> Learning simulation — every dollar shown is <b style={{ whiteSpace: "nowrap" }}>simulated money,</b> not real currency. No real funds are ever involved.
      </div>
      {route === "home" && <Landing onEnroll={startEnroll} onCall={startCall} onLegal={setLegal} />}
      {route === "enroll" && <Enroll preselect={preselect} onDone={finishEnroll} onBack={goBack} onCall={startCall} />}
      {route === "call" && <BookCall onBack={goBack} onHome={goHome} onEnroll={() => startEnroll()} />}
      {route === "app" && state && <Platform state={state} setState={setState} onExit={exitApp} />}
      {legal && <LegalModal kind={legal} onClose={() => setLegal(null)} />}
    </div>
  );
}
