import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from "react";
import {
  TrendingUp, TrendingDown, Home, Car, Wallet, PiggyBank, LineChart as LineIcon,
  Shield, Coins, Building2, GraduationCap, ArrowRight, Check, Lock, Newspaper,
  CircleDollarSign, Sparkles, AlertTriangle, ShoppingBag, Landmark, Video, Mail, Briefcase,
  Anchor, Linkedin, BookOpen, Download, Users, Activity, Award, Calendar, Clock, Flag,
} from "lucide-react";
// Client-safe market-media bits live in a dependency-free module (no React/lucide) so the
// serverless cron + the server-only schedule module can share the SAME builders. The FUTURE
// market SCHEDULE (FLAT_MACRO/MACRO/CHECKIN_MACRO/marketEventFor) + the MEDIA map are NOT
// imported here on purpose — they're server-only (api/_lib/marketSchedule.js) so they never
// ship in the client bundle (anti-gaming for the tuition prize; see CLAUDE.md). At advance
// time the dashboard fetches the SINGLE current event from /api/market-event and falls back
// to a non-revealing placeholder when offline (demo/tests). App.jsx layers React/lucide bits
// (ASSETS icons, WEEKS subtitles) on top.
import { pct, ASSET_META, buildMediaDrip, WEEK_PREP } from "./marketMedia.js";
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
@keyframes by-quote{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.by-quote{animation:by-quote .5s ease both;}
@media (prefers-reduced-motion: reduce){.by-quote{animation:none;}}
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
import { SEASONS, BATCHES, seasonLabel, CHECKINS } from "./cohorts.js";
export { BATCHES, CHECKINS } from "./cohorts.js";
import { SITE_DEFAULTS, SETTINGS_FIELDS } from "./site.js";
import { certName, certVerifyUrl, linkedInAddUrl, certDate, CERT_ORG } from "./cert.js";
import { SCENARIO_GROUPS, scenarioLabel } from "./scenarios.js";
// Funnel analytics: stage definitions + conversion/curve/revenue math (single source of truth).
import { STAGES, summarize, segments, toCSV, toDataRoom, ratePct, TRACKS, engagement } from "./funnel.js";

// Live cohort catalog: the public site hydrates this from /api/cohorts on load (founder-editable
// in the dashboard), defaulting to the code `BATCHES`. Components read it via useCohorts(); App
// owns the fetch. Keeping the code list as the default means tests/demo work with zero config.
const CohortsContext = React.createContext(BATCHES);
const useCohorts = () => React.useContext(CohortsContext);
// Funnel event props for a cohort, resolved against the LIVE catalog (no PII).
const cohortMetaFrom = (batches, batchId) => {
  const b = (batches || []).find((x) => x.id === batchId);
  return b
    ? { batchId: b.id, season: b.season, track: b.track, priceCents: Math.round((b.price || 0) * 100) }
    : { batchId: batchId || null, season: null, track: null, priceCents: 0 };
};

/* ============================ PRODUCTION CONFIG ============================
 * Fill these in to go live. Empty values fall back to the safe demo flow,
 * so the app keeps working for testing before any accounts are connected.
 *   - Stripe Payment Links now live PER COHORT (`stripeLink` in the catalog, editable in the
 *       founder dashboard). Each link's success URL is  https://YOURDOMAIN/?enrolled={batchId}.
 *   - calendlyUrl: your 15-min event link, e.g. https://calendly.com/you/intro
 *   - contactEmail / brandDomain: shown in the UI and emails.
 */
export const CONFIG = {
  brandDomain: "build-young.com",
  // Founder-editable RUNTIME settings (booking link, contact email, LinkedIn). These defaults are
  // single-sourced in src/site.js; on load App hydrates them from /api/cohorts (KV-backed) so a
  // founder can change them live from the console — no redeploy. See SettingsEditor.
  ...SITE_DEFAULTS,
  // Email: set emailEnabled true once the /api/send-email function + provider key are live.
  emailEnabled: true,
  emailEndpoint: "/api/send-email",
  // Auth: flip true once the KV store + AUTH_SECRET are configured (and Stripe, so real
  // enrollments provision accounts). When true, the dashboard requires login and the sim state
  // lives server-side (cross-device) instead of in localStorage. When false, the app keeps the
  // self-contained localStorage demo flow — no login, per-device state. See api/_lib/auth.js.
  authEnabled: true,
  // DEV / AUTHORING: unlock every course week (each shows its full activity) so the course can be
  // built + previewed without advancing the simulation. Set false before launch so weeks lock
  // again and unlock as the student reaches them.
  previewAllWeeks: true,
};
// Auth/state API client. Same-origin fetches carry the HttpOnly session cookie automatically.
async function postJson(url, body) {
  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, ...data };
  } catch (e) {
    return { ok: false, status: 0, error: "Network error — please try again." };
  }
}
const AUTH = {
  async me() { try { const r = await fetch("/api/auth/me"); return r.ok ? (await r.json()).user : null; } catch { return null; } },
  login: (email, password) => postJson("/api/auth/login", { email, password }),
  setPassword: (token, password) => postJson("/api/auth/set-password", { token, password }),
  requestReset: (email) => postJson("/api/auth/request-reset", { email }),
  async logout() { try { await fetch("/api/auth/logout", { method: "POST" }); } catch { /* ignore */ } },
  async getState() { try { const r = await fetch("/api/state"); return r.ok ? (await r.json()).state : null; } catch { return null; } },
  async getCert() { try { const r = await fetch("/api/state"); return r.ok ? (await r.json()).cert : null; } catch { return null; } },
  async putState(state) { try { await fetch("/api/state", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state }) }); } catch { /* ignore */ } },
};
// Fire-and-forget email send. No-ops gracefully in demo/local; UI toast still shows. On any
// failure it logs the exact reason to the console (`[email] …`) instead of swallowing it — so a
// silent non-delivery (missing key, bad recipient, provider rejection) is diagnosable, not a
// mystery.
function sendEmail(to, subject, body) {
  if (!CONFIG.emailEnabled) { console.warn("[email] not sent — CONFIG.emailEnabled is false"); return; }
  if (!to) { console.warn("[email] not sent — no recipient (student.email is empty)"); return; }
  try {
    fetch(CONFIG.emailEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, body }),
    }).then(async (r) => {
      if (!r.ok) console.warn(`[email] send failed (HTTP ${r.status}) to ${to}:`, await r.text().catch(() => ""));
    }).catch((e) => { console.warn("[email] network error:", e); });
  } catch (e) { console.warn("[email] error:", e); }
}
const PENDING_KEY = "by:pending-enroll";
const PENDING_COOKIE = "by_pending_enroll";

// The pending enrollment ({name,email,batch,track}) has to survive the round-trip out to Stripe
// and back to the ?enrolled= return — that's how we show "we emailed <you>" on the confirmation.
// localStorage is per-ORIGIN, so it's lost if the Stripe redirect lands on a different subdomain
// than where enroll ran (e.g. apex build-young.com → www.build-young.com). So we ALSO drop a
// cookie scoped to the registrable domain (.build-young.com), which both subdomains can read.
// Both are best-effort and cleared once consumed.
function domainAttr() {
  try {
    const host = location.hostname;
    if (!host.includes(".") || /^\d+(\.\d+){3}$/.test(host)) return ""; // localhost / IP → host-only
    const base = host.split(".").slice(-2).join("."); // build-young.com
    return `; domain=.${base}`;
  } catch (e) { return ""; }
}
function setPendingEnroll(rec) {
  try { window.localStorage.setItem(PENDING_KEY, JSON.stringify(rec)); } catch (e) {}
  try {
    const secure = location.protocol === "https:" ? "; secure" : "";
    document.cookie = `${PENDING_COOKIE}=${encodeURIComponent(JSON.stringify(rec))}; path=/; max-age=1800; samesite=lax${domainAttr()}${secure}`;
  } catch (e) {}
}
function readPendingEnroll() {
  try { const v = JSON.parse(window.localStorage.getItem(PENDING_KEY) || "null"); if (v) return v; } catch (e) {}
  try {
    const m = document.cookie.match(new RegExp(`(?:^|; )${PENDING_COOKIE}=([^;]*)`));
    if (m) return JSON.parse(decodeURIComponent(m[1]));
  } catch (e) {}
  return null;
}
function clearPendingEnroll() {
  try { window.localStorage.removeItem(PENDING_KEY); } catch (e) {}
  try { document.cookie = `${PENDING_COOKIE}=; path=/; max-age=0; samesite=lax${domainAttr()}`; } catch (e) {}
}

// ---- Funnel analytics: fire-and-forget aggregate events to /api/track (see src/funnel.js) ----
// Never throws, never blocks the UI, and is a no-op in tests. sendBeacon is preferred so the
// event survives a navigation/redirect (e.g. handing off to Stripe). NO PII is ever sent.
function track(event, props = {}) {
  try {
    if (typeof window === "undefined") return;
    if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.MODE === "test") return;
    const clean = {};
    for (const k in props) if (props[k] !== undefined && props[k] !== null) clean[k] = props[k];
    const body = JSON.stringify({ event, props: clean });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/funnel", new Blob([body], { type: "application/json" }));
    else fetch("/api/funnel", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  } catch (e) { /* analytics must never break the app */ }
}
// The visit's traffic source: the external referrer's host, or "direct" (no referrer / same-site).
// Aggregate-only — a hostname, never a full URL/path, so no query strings or PII leak through.
function visitSource() {
  try {
    const ref = typeof document !== "undefined" ? document.referrer : "";
    if (!ref) return "direct";
    const h = new URL(ref).hostname.replace(/^www\./, "");
    if (typeof location !== "undefined" && h === location.hostname.replace(/^www\./, "")) return "direct";
    return h || "direct";
  } catch (e) { return "direct"; }
}
// Fire `visited` once per browser session (top of funnel — don't re-count re-renders/SPA nav).
function trackVisitOnce() {
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      if (window.sessionStorage.getItem("by_visited")) return;
      window.sessionStorage.setItem("by_visited", "1");
    }
  } catch (e) { /* ignore */ }
  track("visited", { source: visitSource() });
}
// Whether a "Talk to Sunil" call was booked earlier this session — tags the call→enroll branch.
let _callBookedThisSession = false;
// The 12 weeks' homework text. Defaults to the code WEEK_PREP; App hydrates it from /api/cohorts
// (founder-editable) on load so the in-app completion email matches the real reminder email.
let HOMEWORK = WEEK_PREP;

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
// THREE ACTS: Act 1 · 0→1 (Weeks 1–7) — go from nothing to a launched, earning product. Act 2 ·
// 1→100 (Weeks 8–10) — grow first customers into a real business. Act 3 · MANAGE (Week 11) +
// the Capstone (Week 12) — manage the money your product earns. Build/grow lesson content is the
// per-week activity (weekActivity); the finance weeks have interactive sim panels.
const WEEKS = [
  // ─── Act 1 · 0 → 1 (Weeks 1–7): find a problem → write the spec → build it in 4 layers
  // (Wk3 core product · Wk4 accounts & data · Wk5 payments · Wk6 production-ready) → Wk7 go live ───
  { act: 1, t: "Find a Problem Worth Solving", s: "Spot a real need people would pay to fix — your product starts here.", action: "build", comingSoon: true },
  { act: 1, t: "Shape the Idea — write your spec", s: "Turn the need into a clear spec: what it is, what it does, how it works.", action: "build", comingSoon: true },
  { act: 1, t: "Build the Core Product", s: "Hand Claude your spec and build the core product — the main thing it does — then ship it live.", action: "build", comingSoon: true },
  { act: 1, t: "Make It Yours", s: "Add sign-in and save each user's data, so it's personal and remembers them.", action: "build", comingSoon: true },
  { act: 1, t: "Get Paid", s: "Add real payments so your product can charge for the value it delivers.", action: "build", comingSoon: true },
  { act: 1, t: "Make It Real", s: "Emails, being findable, and keeping data safe — everything that makes it ready for real users.", action: "build", comingSoon: true },
  { act: 1, t: "Go Live", s: "Point a real web address at it, switch on live payments, and run your launch checklist — your product is open for business.", action: "build", comingSoon: true },
  // ─── Act 2 · 1 → 100 (Weeks 8–10): grow it — funnel → metrics & scaling → product-led growth ───
  { act: 2, t: "The Funnel", s: "Build the funnel into your product: how people find it, try it, and come back — the path to the success you defined in Week 1.", action: "build", comingSoon: true },
  { act: 2, t: "Metrics & Scaling", s: "Track active users (DAU/MAU) and retention to see what's working and find the one thing holding growth back — your product's real health check.", action: "build", comingSoon: true },
  { act: 2, t: "Product-Led Growth", s: "Build growth INTO the product — make it so good (and shareable) it spreads itself.", action: "build", comingSoon: true },
  // ─── Act 3 · MANAGE (Week 11) + Capstone (Week 12): manage the money your product earns ───
  { act: 3, t: "Money: The Basics", s: "Your one money class — the basics of what to do with what you earn: pay yourself first, invest so it compounds, and a first big purchase done right.", action: "money",
    materials: [
      { label: "Investor.gov — Compound Interest Calculator", url: "https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator" },
      { label: "Investor.gov — What is compound interest?", url: "https://www.investor.gov/additional-resources/information/youth/teachers-classroom-resources/what-compound-interest" },
    ] },
  { act: 3, t: "Capstone: What You Built & What It's Worth", s: "Total it all up — the product you made and the net worth it earned.", action: "capstone" },
];
const ACTS = { 1: "0 → 1 · Build & launch the product", 2: "1 → 100 · Grow it into a business", 3: "Manage what you've earned" };

// ============================ SIM ECONOMY ============================
// One place for every dollar figure, re-tuned to a realistic young-adult budget around a
// $10,000 paycheck per class. Keep purchases funds-gated against this so the "save toward a
// goal / live with the payments" lessons hold. Change PAY here and the rest stays in scale.
// Income comes from the student's PRODUCT, not a flat paycheck. Build + launch + grow (weeks 1–10,
// Acts 1–2): you find a problem, build the product, take it live, and grow it — revenue ramps from
// zero to steady. Manage act (weeks 11–12): the established product earns a steady income you now
// learn to manage (investing, big purchases). INCOME[courseWeek-1] is the business revenue that period.
export const INCOME = [0, 0, 0, 3000, 6000, 9000, 10000, 10000, 10000, 10000, 10000, 10000];
export const STEADY_INCOME = 10000;  // per-period business income once the product is established
export const PAY = STEADY_INCOME;    // back-compat alias (steady business income, not a paycheck)
const TAX_RATE = 0.15;               // tax on business income (self-employment / business tax)
const FINANCE_FIRST_WEEK = 11;       // weeks 1–10 = Build (1–7) + Grow (8–10); 11–12 = Manage (money)
// CHECKINS now lives in cohorts.js (single source) and is imported + re-exported above.
export const CHECKIN_TIME = "5:00–6:00 PM PST"; // 60-minute follow-up check-in (the week after the course)
// The check-in is ONE MONTH after the cohort's final (Week 12) class, kept on the cohort's
// usual weekday (the same weekday it started/meets). Returns a label like
// "Mon, Dec 28, 2026 · 5:00–6:00 PM PST", or "" if the start is unparseable.
export function checkinDateLabel(batch) {
  const start = batch && batch.start ? new Date(batch.start) : null;
  if (!start || isNaN(start.getTime())) return "";
  // The follow-up check-in is the WEEK AFTER the 12-week course (Week 12 ≈ start + 11 weeks), so it
  // lands one week later — start + 12 weeks — naturally on the cohort's usual weekday. Keeping it
  // close (not a month out) keeps students engaged.
  const d = new Date(start.getTime() + 12 * 7 * 24 * 60 * 60 * 1000);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) + " · " + CHECKIN_TIME;
}
// The student's NEXT live session, as a CONCRETE date, so the dashboard banner reads
// "Mon, Sep 7, 2026 · 5:00–6:30 PM PST" rather than just the recurring weekday — making it
// clear it's the upcoming class. During the course, week N's class is start + (N-1)*7 days;
// once in the follow-up phase we reuse checkinDateLabel. The time-of-day is lifted from the
// cohort's `day` label ("Mondays · 5:00–6:30 PM PST"). Falls back to batch.day if start is
// unparseable (mirrors checkinDateLabel's guard).
export function nextClassLabel(batch, phase, week) {
  if (!batch) return "";
  if (phase !== "course") return checkinDateLabel(batch) || batch.day;
  const start = new Date(batch.start);
  if (isNaN(start.getTime())) return batch.day;
  const d = new Date(start.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
  const time = (batch.day.split("·")[1] || "").trim(); // "5:00–6:30 PM PST"
  const date = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  return time ? `${date} · ${time}` : date;
}
// Date-only label (no time) for a course week's class, e.g. "Wed, Sep 23, 2026". Used by the
// cancel/withdraw banner to state the EXACT refund deadlines. Week 1 == batch.start; week N is
// +7 days each. Returns "" if start is unparseable so callers can omit the date gracefully.
export function classDateLabel(batch, week) {
  const start = batch && batch.start ? new Date(batch.start) : null;
  if (!start || isNaN(start.getTime())) return "";
  const d = new Date(start.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}
// Real-world timing of the cohort's FIRST class vs. today — so a student who enrolls weeks early
// sees "starts in 5 weeks · Mon, Sep 7, 2026" instead of a misleading "Week 1 of 12". `beforeStart`
// drives the pre-start Overview landing + the header pill. `now` is injectable for tests.
export function cohortStartInfo(batch, now = new Date()) {
  const start = batch && batch.start ? new Date(batch.start) : null;
  if (!start || isNaN(start.getTime())) return { days: null, beforeStart: false, shortDate: "", longDate: "", phrase: "" };
  const days = Math.ceil((start.getTime() - now.getTime()) / 86400000);
  const shortDate = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const longDate = start.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  let phrase;
  if (days > 13) phrase = `starts in ${Math.round(days / 7)} weeks`;
  else if (days > 1) phrase = `starts in ${days} days`;
  else if (days === 1) phrase = "starts tomorrow";
  else if (days === 0) phrase = "starts today";
  else phrase = "in progress";
  return { days, beforeStart: days > 0, shortDate, longDate, phrase };
}

// --- Founder teaching schedule (pure date math) ---------------------------------------------
// Cohorts meet twice a week on a day-pair (e.g. Mon & Wed): session 1 of week N is
// start + (N−1)*7 days; session 2 is +2 days. So the whole-day offset from `start` tells us
// everything: offset%7===0 → session 1, ===2 → session 2; week = floor(offset/7)+1.
const dayNum = (d) => Math.round(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000);
// Does this cohort meet on `day`? → { week, session } or null (before start / after week 12 / off-day).
export function classMeetingOn(batch, day = new Date()) {
  const start = batch && batch.start ? new Date(batch.start) : null;
  if (!start || isNaN(start.getTime())) return null;
  const offset = dayNum(day) - dayNum(start);
  if (offset < 0) return null;
  const slot = offset % 7;
  if (slot !== 0 && slot !== 2) return null;
  const week = Math.floor(offset / 7) + 1;
  if (week < 1 || week > 12) return null;
  return { week, session: slot === 0 ? 1 : 2 };
}
// The cohort's date for week N, session 1 or 2 (a Date), for "next class" lookups.
export function sessionDate(batch, week, session) {
  const start = batch && batch.start ? new Date(batch.start) : null;
  if (!start || isNaN(start.getTime()) || week < 1 || week > 12) return null;
  const base = dayNum(start) + (week - 1) * 7 + (session === 2 ? 2 : 0);
  return new Date(base * 86400000);
}
// Enrollment closes the day before a cohort starts: the LAST day to enroll is start − 1 day, so on
// the start date (and after) enrollment is closed. `now` is injectable for tests. Unparseable start
// → never auto-closes (founder can still close manually via the `full` flag).
export function enrollClosed(batch, now = new Date()) {
  const start = batch && batch.start ? new Date(batch.start) : null;
  if (!start || isNaN(start.getTime())) return false;
  return dayNum(now) >= dayNum(start);
}
// A cohort is unavailable to enroll in if it's sold out (`full`, founder-set) OR past its
// enrollment cutoff (the day before it starts). Single source of truth for the landing card +
// the enroll screen so they can't disagree.
export function cohortClosed(batch, now = new Date()) {
  return !!(batch && batch.full) || enrollClosed(batch, now);
}
// The next class strictly on/after `day` → { week, session, date } or null if the course is done.
export function nextClass(batch, day = new Date()) {
  const today = dayNum(day);
  for (let w = 1; w <= 12; w++) {
    for (const sess of [1, 2]) {
      const d = sessionDate(batch, w, sess);
      if (d && dayNum(d) >= today) return { week: w, session: sess, date: d };
    }
  }
  return null;
}
// The time-of-day portion of a cohort's `day` label ("Mondays & Wednesdays · 5:00–6:30 PM PST").
export function cohortTime(batch) {
  const parts = String((batch && batch.day) || "").split("·");
  return parts.length > 1 ? parts.slice(1).join("·").trim() : "";
}
// The weekday-pair portion of a cohort's `day` label (before the "·").
export function cohortDays(batch) {
  return String((batch && batch.day) || "").split("·")[0].trim();
}

// income for a given period: the build's revenue curve in the course, steady once established
export function incomeFor(phase, week) {
  if (phase !== "course") return STEADY_INCOME; // check-ins: the build is established
  return INCOME[week - 1] || 0;
}
export const LIVING = 3500;          // living costs per period — only once you're independent (finance act)
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

Week 1 is "Find a Problem Worth Solving" — the start of building a product you believe people would pay for. In the simulation, that product is what earns your income in the weeks ahead, and then you'll learn to make it grow. Everything runs inside your student dashboard.

One more thing to aim for: the BUILDER PRIZE. The first builder in your cohort to land a real paying customer — within a year of today — gets their tuition refunded (a real sale, with proof, plus a short video about what you built). The whole point of Build Young, rewarded. See the Terms for details.

See you in class,
The Build Young Team`,
  };
}
function followupEmail(s, week, batch) {
  const first = s.student.name.split(" ")[0];
  const wk = WEEKS[week - 1];
  const last = week >= 12; // finishing Week 12 = course complete (no separate check-in)
  const next = WEEKS[week];
  return {
    id: "f" + week + "_" + Date.now(), from: MAIL_FROM, when: "Just now", type: "followup",
    subject: last ? "Course complete — you did it 🎓" : `Week ${week} recap + your next class`,
    body: last
      ? `Hi ${first},

You finished all 12 weeks of Build Young — your simulated net worth is ${fmt(netWorth(s))}.

You built something real and learned to manage what it earns. Your certificate of completion is waiting in your dashboard — download it and add it to LinkedIn.

Proud of you,
The Team`
      : `Hi ${first},

Great work in Week ${week}: "${wk.t}." Your simulated net worth is now ${fmt(netWorth(s))}.

Your next session is Week ${week + 1}: "${next.t}"
${batch.day}  ·  Join on Zoom: ${batch.zoom}
${HOMEWORK[week] ? `\nHomework — to prepare for next week:\n${HOMEWORK[week]}\n` : ""}
See you there,
The Team`,
  };
}
// Refund/cancellation confirmation — sent when a student confirms a withdrawal. Full refund if
// the cohort hasn't started; prorated (for the unattended sessions) within the first week.
// Why a family cancels — preset options (the `value` is aggregate-safe for the funnel; the
// optional free-text note goes only to the founder's email, never the analytics stream).
export const CANCEL_REASONS = [
  { value: "cost", label: "Cost — too expensive" },
  { value: "schedule", label: "Schedule or timing doesn't work" },
  { value: "fit", label: "Not the right fit" },
  { value: "other_program", label: "Going with another program" },
  { value: "interest", label: "Lost interest" },
  { value: "other", label: "Other" },
];
export const cancelReasonLabel = (v) => (CANCEL_REASONS.find((r) => r.value === v) || {}).label || "";

export function withdrawalEmail(s, batch, refund, notStarted, reasonText) {
  const first = s.student.name.split(" ")[0] || "there";
  // week increments on each advance, so sessions held = week − 1 once started; the rest are
  // "not yet held" (the prorated refund basis — matches the Terms).
  const attended = notStarted ? 0 : s.week - 1;
  const unheld = 12 - attended;
  return {
    id: "x" + Date.now(), from: MAIL_FROM, when: "Just now", type: "withdrawal",
    subject: notStarted ? "Your Build Young enrollment is canceled" : "Your Build Young withdrawal is confirmed",
    body: notStarted
      ? `Hi ${first},

We've canceled your enrollment in the ${batch.track} cohort, as requested. A full refund of ${fmt(refund)} is on its way back to your original payment method — refunds typically land within 5–10 business days.

  •  Cohort: ${batch.track} — ${batch.day}
  •  Refund: ${fmt(refund)} (full)${reasonText ? `\n  •  Reason: ${reasonText}` : ""}

No hard feelings — your seat is freed up for someone else, and you're welcome back anytime. Just reply to this email if anything looks off.

Take care,
The Build Young Team`
      : `Hi ${first},

We've processed your withdrawal from the ${batch.track} cohort. A prorated refund of ${fmt(refund)} — covering the ${unheld} sessions not yet held — is on its way back to your original payment method, typically within 5–10 business days.

  •  Cohort: ${batch.track} — ${batch.day}
  •  Attended: ${attended} of 12 sessions
  •  Refund: ${fmt(refund)} (prorated)${reasonText ? `\n  •  Reason: ${reasonText}` : ""}

Thanks for giving it a try — you're welcome back anytime. Just reply to this email if anything looks off.

Take care,
The Build Young Team`,
  };
}
// The refund a student gets if they cancel now. Full price before the cohort starts; otherwise
// prorated by SESSIONS NOT YET HELD (the Terms basis). `week` increments on each advance, so
// sessions held = week − 1 once started. The 3-week eligibility window is enforced separately
// by `canWithdraw` in Platform — this just computes the amount.
export function refundFor(batch, started, week) {
  if (!started) return batch.price;
  const unheld = 12 - (week - 1); // sessions not yet held
  return Math.round((batch.price * unheld) / 12);
}
// The prorated-refund window: a cancellation is only allowed during the first N weeks of class
// (plus any time before the cohort starts). Change this one number to move the window.
export const REFUND_WEEKS = 1;
// Human label for the window, singular-aware ("first week" vs "first N weeks"). Copy uses this.
export const REFUND_WINDOW = REFUND_WEEKS === 1 ? "first week" : `first ${REFUND_WEEKS} weeks`;
// Single source of truth for whether cancellation/withdrawal is offered right now. Pre-start →
// always (full refund); once started → only through the first REFUND_WEEKS course weeks.
export function canWithdrawNow(s) {
  if (!s.started) return true;
  return s.phase === "course" && s.week <= REFUND_WEEKS;
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

// process one period: earn (from the build), allocate, apply macro, pay bills
export function advance(prev, macro) {
  const s = JSON.parse(JSON.stringify(prev));
  // Income comes from the student's BUILD (no employer paycheck). It ramps during the build
  // act and is steady once established. Business income is taxed; there is no employer 401(k)
  // match — a self-made builder pays themselves (retirement contribution, no match).
  const pay = incomeFor(s.phase, s.week);
  const tax = pay * TAX_RATE;
  const k = pay * s.settings.retire401k;     // self-directed retirement ("pay yourself first")
  s.retirement += k;                          // no employer match
  const net = pay - tax - k;
  const toSav = net * s.settings.savingsRate;
  const toBrk = net * s.settings.brokerageRate;
  s.savings += toSav;
  ASSETS.forEach((a) => { s.holdings[a.key] += toBrk * (s.alloc[a.key] || 0); });
  s.cash += net - toSav - toBrk;

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
  // living costs kick in once you're independent (finance act onward) — during the build act
  // you're still getting your venture off the ground.
  if (s.phase !== "course" || s.week >= FINANCE_FIRST_WEEK) s.cash -= LIVING;

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

// A stylized peek at the student simulation — cycles through the FINANCE-act weeks (8/10/12),
// when there's actually income from the build, a portfolio, and the $10k steady build income.
// (Weeks 1–10 are build + grow: pre-investment, nothing invested yet — so we don't show them.)
const HP_SNAPS = [
  { week: 8, nw: 24800, pts: "0,196 70,184 140,188 210,170 280,176 350,156 420,162 490,142 540,130", alloc: [0.45, 0.30, 0.15, 0.10] },
  { week: 10, nw: 48200, pts: "0,184 70,166 140,176 210,140 280,148 350,112 420,120 490,84 540,66", alloc: [0.55, 0.25, 0.12, 0.08] },
  { week: 12, nw: 74900, pts: "0,170 70,150 140,160 210,116 280,124 350,80 420,72 490,40 540,14", alloc: [0.62, 0.18, 0.12, 0.08] },
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
          {/* logo — matches the real <Mark/>: 3 ascending blocks (22/36/54 scaled) + teal spark, bottom-aligned at y=18 */}
          <rect x="0" y="4" width="15" height="14" rx="3" fill="#50a0e0" /><rect x="19" y="-5" width="15" height="23" rx="3" fill="#0078d4" /><rect x="38" y="-16" width="15" height="34" rx="3" fill="#0067b8" />
          <path d="M44.5 -23 l5 7 h-10 z" fill="#038387" />
          <text x="70" y="14" fontFamily="Space Grotesk, sans-serif" fontSize="19" fontWeight="800" fill={C2.ink}>Build <tspan fill="url(#bygrad)">Young</tspan></text>
          <rect x="678" y="-8" width="186" height="30" rx="6" fill="#eaf3fb" />
          <text x="771" y="12" fontFamily="Inter, sans-serif" fontSize="13" fontWeight="700" fill={C2.emerald} textAnchor="middle"><tspan className="hp-live">●</tspan> Week {snap.week} — live now</text>
        </g>
        <line x1="2" y1="62" x2="918" y2="62" stroke={C2.line} />
        {/* net worth + chart */}
        <g transform="translate(40,92)">
          <text fontFamily="Inter, sans-serif" fontSize="14" fontWeight="700" fill={C2.muted}>YOUR NET WORTH</text>
          <text y="42" fontFamily="Inter, sans-serif" fontSize="44" fontWeight="800" fill={C2.ink}>${nw.toLocaleString()}</text>
          <g key={"chip" + i} className="hp-end" transform="translate(250,8)"><rect width="150" height="30" rx="15" fill="#e7f3ee" /><text x="75" y="20" fontFamily="Inter, sans-serif" fontSize="13.5" fontWeight="700" fill={C2.emerald} textAnchor="middle">▲ +{fmt(STEADY_INCOME)} from your product</text></g>
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

// Illustrative testimonials shown ONLY as a preview when the showcase is enabled but no real
// (consented) student feedback has come in yet — so the founder can see the layout. Clearly
// captioned as samples on the page; they're replaced automatically by real submissions.
const SAMPLE_TESTIMONIALS = [
  { name: "Maya, 16", feedback: "I built a flashcards app for my class and watched a friend actually use it. I never thought I could make something real.", link: "" },
  { name: "Devin, 15", feedback: "Shipping my first website was the best feeling. And money finally makes sense — I get taxes and saving now.", link: "" },
  { name: "Aria, 17", feedback: "I made a tool for my swim team to track our times. My parents were shocked it was online and actually working!", link: "" },
  { name: "Leo, 14", feedback: "I learned to tell AI what 'good' looks like. By the end I had a real product and understood how a business makes money.", link: "" },
];

// Public testimonials / student-showcase — an auto-rotating carousel that sits right at the top of
// the landing page (social proof first), showing one quote at a time with a "n / total" counter.
// Renders real consented submissions (from /api/cohorts); otherwise falls back to clearly-labeled
// SAMPLE_TESTIMONIALS for preview. Respects prefers-reduced-motion. Gated by CONFIG.showcaseEnabled.
function Testimonials({ items = [] }) {
  const [idx, setIdx] = useState(0);
  const real = (Array.isArray(items) ? items : []).filter((t) => t && t.feedback);
  const usingSamples = real.length === 0;
  const list = usingSamples ? SAMPLE_TESTIMONIALS : real;
  const n = list.length;
  useEffect(() => {
    if (n <= 1) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % n), 5000);
    return () => clearInterval(id);
  }, [n]);
  if (!n) return null;
  const cur = idx % n;
  const t = list[cur];
  return (
    <section style={{ padding: "34px 6vw 38px", background: `linear-gradient(180deg, #e9f2fb 0%, #eef6f4 100%)`, borderBottom: `1px solid ${C.line}` }}>
      <div style={{ maxWidth: 860, margin: "0 auto", textAlign: "center" }}>
        <div style={{ marginBottom: 16 }}>
          <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: C.emerald }}>What our <span className="grad">builders</span> made</span>
          {usingSamples && <span style={{ fontSize: 11, color: C.gold, fontWeight: 700, marginLeft: 8 }}>· sample preview</span>}
        </div>
        {/* key={cur} re-mounts on each change so the fade-in animation replays */}
        <div key={cur} className="by-quote" style={{ minHeight: 96, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
          <div aria-hidden="true" style={{ fontFamily: "Georgia, serif", fontSize: 44, lineHeight: 0.2, color: C.turq, fontWeight: 800, marginBottom: 18 }}>“</div>
          <p className="disp" style={{ fontSize: "clamp(20px,2.6vw,27px)", color: C.ink, lineHeight: 1.35, margin: 0, fontWeight: 700, maxWidth: 760, letterSpacing: "-.01em" }}>
            {t.feedback}
          </p>
          <div className="disp" style={{ fontSize: 14.5, fontWeight: 800, color: C.emerald, marginTop: 14 }}>
            — {t.name || "A Build Young builder"}
            {t.link && <> · <a href={t.link} target="_blank" rel="noopener noreferrer" style={{ color: C.turq, fontWeight: 700, textDecoration: "none" }}>See their product ↗</a></>}
          </div>
        </div>
        {/* count + dots */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, fontVariantNumeric: "tabular-nums" }}>{cur + 1} / {n}</span>
          {n > 1 && n <= 20 && (
            <span style={{ display: "inline-flex", gap: 6 }}>
              {list.map((_, i) => (
                <button key={i} type="button" aria-label={`Show testimonial ${i + 1}`} onClick={() => setIdx(i)}
                  style={{ width: 7, height: 7, borderRadius: 999, border: "none", padding: 0, cursor: "pointer", background: i === cur ? C.emerald : C.line }} />
              ))}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

function Landing({ onEnroll, onCall, onLegal, onLogin, onDashboard, dashLabel, testimonials = [] }) {
  const BATCHES = useCohorts(); // live catalog (hydrated from /api/cohorts; defaults to code)
  const [season, setSeason] = useState(SEASONS[0].key);
  const [careers, setCareers] = useState(false); // "teach with us" interest modal
  return (
    <div style={{ position: "relative", zIndex: 2 }}>
      {/* nav */}
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 6vw", maxWidth: 1200, margin: "0 auto" }}>
        <div className="disp" {...act(() => { try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (e) { window.scrollTo(0, 0); } })} aria-label="Build Young — back to top" style={{ fontWeight: 900, fontSize: 22, letterSpacing: "-.02em", cursor: "pointer" }}>
          <Mark size={24} /> Build <span className="grad">Young</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <span className="nav-talk" {...act(onCall)} style={{ fontSize: 14, fontWeight: 600, color: C.ink2, cursor: "pointer" }}>Talk to Sunil</span>
          <span className="nav-talk" {...act(() => setCareers(true))} style={{ fontSize: 14, fontWeight: 600, color: C.ink2, cursor: "pointer" }}>Careers</span>
          {onDashboard
            ? <span {...act(onDashboard)} style={{ fontSize: 14, fontWeight: 700, color: C.emerald, cursor: "pointer" }}>{dashLabel || "My dashboard"} →</span>
            : (onLogin && <span {...act(onLogin)} style={{ fontSize: 14, fontWeight: 600, color: C.ink2, cursor: "pointer" }}>Log in</span>)}
          {/* Already enrolled / signed in → no Enroll CTA (they'd go to their dashboard instead). */}
          {!onDashboard && <button className="btn" onClick={onEnroll} style={{ background: C.ink, color: C.paper2, padding: "10px 20px", borderRadius: 4, fontSize: 14 }}>Enroll →</button>}
        </div>
      </nav>

      {/* testimonials carousel — right at the top (gated by the founder showcase toggle) */}
      {CONFIG.showcaseEnabled && <Testimonials items={testimonials} />}

      {/* hero */}
      <header style={{ position: "relative", overflow: "hidden", padding: "40px 6vw 64px" }}>
        <HeroBackdrop />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
        <div className="rise" style={{ marginBottom: 18 }}><Pill bg={C.ink}>12 weeks · ages 15–18 · live cohorts</Pill></div>
        <h1 className="disp rise" style={{ fontSize: "clamp(38px,6.5vw,74px)", lineHeight: 1.02, fontWeight: 700, letterSpacing: "-.02em", margin: 0 }}>
          Raising <span className="grad">builders,</span><br />not consumers.
        </h1>
        <p className="disp rise" style={{ marginTop: 16, fontSize: 18, fontWeight: 700, color: C.gold, letterSpacing: ".01em" }}>Build Young — build a real product, then grow it into a business.</p>
        <p className="rise" style={{ maxWidth: 620, margin: "26px auto 0", fontSize: 19, color: C.ink2, lineHeight: 1.5 }}>
          Build Young is a <b>live, instructor-led course</b> where teens <b>build a product they believe people would pay for</b> — a small app, tool, or service, made with AI — then <b>grow it into a real business</b>, thinking like <b>founders</b> the whole way. It's a hands-on sandbox: they build something real, put it in front of people, and learn what it takes to make it work — <b>no real money is ever involved</b>, just the real skills, practiced somewhere safe before the stakes are real.
        </p>
        <HeroPreview />
        <div className="rise" style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 32, flexWrap: "wrap" }}>
          {onDashboard
            ? <button className="btn" onClick={onDashboard} style={{ background: C.emerald, color: "#fff", padding: "15px 30px", borderRadius: 4, fontSize: 16 }}>Go to {dashLabel ? dashLabel.toLowerCase() : "my dashboard"} <ArrowRight size={16} style={{ verticalAlign: "-2px" }} /></button>
            : <button className="btn" onClick={onEnroll} style={{ background: C.emerald, color: "#fff", padding: "15px 30px", borderRadius: 4, fontSize: 16 }}>Pick a batch & enroll <ArrowRight size={16} style={{ verticalAlign: "-2px" }} /></button>}
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
          <p style={{ color: C.muted, fontSize: 16, marginTop: 8, lineHeight: 1.5 }}>It all runs in one live, hands-on simulation — your student makes the real calls each week and lives with what happens. <b>No slideware, no lectures, no busywork:</b> they build, ship, see what works, and improve as they go — the way real work actually gets done. Here's what that looks like.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
          {[
            { icon: Sparkles, t: "Build something people need", d: "Build a real product, app, or service with AI that solves a real problem — learning the one skill AI can't replace: taste, knowing what good looks like.", c: C.gold },
            { icon: Flag, t: "Take it live", d: "Ship it on the real internet — a web address, sign-ins, and payments — so a stranger can sign up, use it, and pay.", c: C.emerald },
            { icon: TrendingUp, t: "Grow it into a business", d: "Build a funnel, track what's working (active users + retention), and bake growth right into the product so it spreads.", c: C.green },
            { icon: Wallet, t: "Your product earns the income", d: "No paycheck handed to you — the product you built is where the income comes from. Create value first; the money follows.", c: C.turq },
            { icon: PiggyBank, t: "Then manage what you earn", d: "One class on the money basics: pay yourself first, invest so it compounds, and make a first big purchase without wrecking your budget.", c: C.pink },
            { icon: GraduationCap, t: "Graduate with something real", d: "You finish with a product you actually shipped, a certificate (built with Claude Code), and your own numbers to show for it.", c: C.emerald },
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
      <section id="curriculum" style={{ maxWidth: 1100, margin: "0 auto", padding: "44px 6vw 22px" }}>
        <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto 8px" }}>
          <h2 className="disp" style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-.02em", margin: 0 }}>The journey, in <span className="grad">three acts</span></h2>
          <p style={{ color: C.muted, fontSize: 16, marginTop: 8, lineHeight: 1.5 }}>Twelve weeks, three acts: <b>0 → 1</b> (find a problem, write a spec, build it in four layers, then go live — Weeks 1–7), <b>1 → 100</b> (funnel, metrics, and product-led growth — Weeks 8–10), and <b>manage what you've earned</b> (Week 11), finishing with a capstone. Here's every week.</p>
        </div>
        {Object.keys(ACTS).map(Number).map((act) => (
          <div key={act} style={{ marginTop: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <Pill bg={act === 1 ? C.green : act === 2 ? C.pink : C.turq}>Act {act}</Pill>
              <span className="disp" style={{ fontSize: 20, fontWeight: 700 }}>{ACTS[act]}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 10 }}>
              {WEEKS.map((w, i) => w.act === act && (
                <Card key={i} style={{ padding: "11px 13px" }}>
                  <div style={{ fontSize: 10.5, color: act === 1 ? C.green : act === 2 ? C.pink : C.turq, fontWeight: 700, letterSpacing: ".05em" }}>WEEK {i + 1}</div>
                  <div className="disp" style={{ fontWeight: 700, fontSize: 15, margin: "2px 0 4px" }}>{w.t}</div>
                  <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{w.s}</div>
                </Card>
              ))}
            </div>
          </div>
        ))}
        <p style={{ color: C.muted, marginTop: 22, fontSize: 14, maxWidth: 760, marginLeft: "auto", marginRight: "auto", textAlign: "center", lineHeight: 1.55 }}>Twelve weeks, twice a week — same standing time — building a <b>business and portfolio</b> from zero, then finishing with a <b>capstone</b> of what you made and what it's worth.</p>
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
            <b className="disp">Raising builders, not consumers.</b> AI just collapsed the barrier to building — what once took a team and a budget, a motivated teenager can now do alone. So the edge isn't a credential; it's <b>taste</b> — knowing what's worth making — and starting early. We teach it by letting them live it: they build, they earn, then they grow what they've made.
          </p>
          <p style={{ color: C.ink2, fontSize: 17.5, lineHeight: 1.6, marginTop: 18, maxWidth: 740, marginLeft: "auto", marginRight: "auto" }}>
            It's not only about the money — it's who a kid becomes in the doing. Making something real, putting it in front of people, living with the wins and the flops shapes a person in ways no lecture can. And a kid who has actually earned and managed money talks about it without shame — and decides from confidence, not fear.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginTop: 24 }}>
            {[
              { t: "Initiative", d: "Shipping something real — not waiting to be told what to do — is a muscle most kids never get to train.", icon: Sparkles, c: C.green },
              { t: "Resilience", d: "A product that flops, a price no one pays — recovering and trying again is where the grit comes from.", icon: Anchor, c: C.pink },
              { t: "Ownership", d: "You made it, so you own the upside. That changes how a kid sees money — and themselves.", icon: Briefcase, c: C.turq },
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
              The chart shows money compounding — but the bigger thing compounding is the skill itself. A teenager who learns to make things people value, in the era when AI is rewriting every career, isn't just getting a financial head start; they're building the judgment and the habit of shipping years before their peers. <b style={{ color: C.ink }}>That head start is the whole reason to start young.</b>
            </p>
          </div>

          {/* founder */}
          <Card style={{ padding: 28, marginTop: 34, display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
            <img src={SUNIL_PHOTO} alt="Sunil Garg" style={{ width: 72, height: 72, borderRadius: 4, objectFit: "cover", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 260 }}>
              <div className="disp" style={{ fontSize: 20, fontWeight: 800 }}>Why this exists</div>
              <p style={{ color: C.ink2, fontSize: 16, lineHeight: 1.6, marginTop: 8 }}>
                I came to the United States with almost nothing — and with family back home depending on me to provide. My wife and I built our lives from zero, supporting them while finding our footing, and made this our own country. Two decades as a product leader at Microsoft later, I'd reached financial independence and was able to step away. But here's the truth I can't stop thinking about: if I'd understood how money works — and how to build something of my own — when I was a teenager, I'd have gotten there years sooner. That lost time is the whole reason this exists. I have two daughters, 15 and 11 — both at Eastside Catholic School in Sammamish, and both with a Starbucks habit I'm gently working on. My wife teaches at Issaquah Montessori School, so between the two of us this house takes how kids learn seriously. I wanted them to learn this before the world started making those decisions for them.
              </p>
              <p style={{ color: C.ink2, fontSize: 16, lineHeight: 1.6, marginTop: 12 }}>
                These days I build AI products for a living, so I've watched this shift up close — and I wanted my daughters on the right side of it. So I went looking for a class that taught both: how to build something real, and how to handle the money it earns. There's plenty of free material out there; banks and nonprofits have whole libraries of it. But it sits unwatched, because a video doesn't make a teenager show up. The paid classes that are live mostly teach stock-picking — the flashy 10%, not the part that actually shapes a life. And not one of them teaches building. So I made one.
              </p>
              <p style={{ color: C.ink2, fontSize: 16, lineHeight: 1.6, marginTop: 12 }}>
                It's the thing I couldn't find: a live class, a small group, a standing weekly time — what turns “available” into “actually done.” It starts where almost none do — actually <b>building something of your own</b> with AI, that people would pay for — then turns practical: taxes, budgeting, investing, big purchases. One continuous twelve-week simulation where the decisions compound and the mistakes are safe, because the money isn't real yet.
              </p>
              <p style={{ color: C.ink2, fontSize: 16, lineHeight: 1.6, marginTop: 12 }}>
                That's the whole idea: money isn't a subject you study, it's a skill you practice — and so is building. We're raising builders, not consumers — kids who reach adulthood having already lived it. I called it Build Young because the one advantage they have that no one can buy is time, and it compounds — habits, character, taste, and even a few invested dollars all grow with it.
              </p>
              <p style={{ color: C.ink2, fontSize: 16, lineHeight: 1.6, marginTop: 12 }}>
                Start building young, and time does the rest.
              </p>
              <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 18, paddingTop: 14 }}>
                <div className="disp" style={{ fontWeight: 800, fontSize: 16 }}>Sunil Garg</div>
                <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2, letterSpacing: ".01em" }}>Founder · Ex-Microsoft · two decades in product</div>
                <a href={CONFIG.linkedinUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: 12, color: C.emerald, fontWeight: 700, fontSize: 13.5, textDecoration: "none" }}><Linkedin size={16} /> Connect on LinkedIn</a>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* batches / pricing */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 6vw 70px" }}>
        <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
          <h2 className="disp" style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-.02em", margin: 0 }}>Upcoming batches</h2>
          <p style={{ color: C.ink2, fontSize: 15, marginTop: 8, lineHeight: 1.55 }}>The <b>Builders</b> program is for ages <b>15–18</b>, meeting <b>twice a week</b> (~3 hrs) — choose <b>Mondays & Wednesdays</b> or <b>Tuesdays & Thursdays</b> — <b>100% live online over Zoom</b>. Pick the season and days that fit.</p>
          <p style={{ color: C.muted, fontSize: 14, marginTop: 8, lineHeight: 1.55 }}>Not sure it's the right fit? <span {...act(onCall)} style={{ color: C.emerald, fontWeight: 700, cursor: "pointer" }}>Talk to me first — book a free 15-minute call →</span> And if you change your mind, <b>cancel before your cohort starts for a full refund</b>; after it begins, withdraw through the <b>first week</b> for a prorated refund; non-refundable after.</p>
          <div style={{ marginTop: 18, maxWidth: 660, marginLeft: "auto", marginRight: "auto", background: "#eef3f0", border: `1px solid ${C.green}`, borderRadius: 8, padding: "14px 18px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", color: C.green }}><Award size={14} /> Earn your tuition back</div>
            <p style={{ color: C.ink2, fontSize: 14, marginTop: 8, lineHeight: 1.55 }}>The <b>first builder in each cohort to land a real paying customer</b> — within a year of enrolling — gets their <b>tuition refunded</b>. A real sale, with proof — then a <b>2-minute video</b> about what you built (with a parent's OK). The whole point of Build Young, rewarded. <span style={{ color: C.muted }}>(One per cohort; <span {...act(() => onLegal("terms"))} style={{ textDecoration: "underline", cursor: "pointer" }}>see Terms</span>.)</span></p>
          </div>
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
            const acc = b.id.includes("mw") ? C.emerald : C.green;
            const closed = cohortClosed(b);
            return (
            <Card key={b.id} className="lift" style={{ padding: 22, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: acc }} />
              <div style={{ marginTop: 4 }}><Pill bg={acc}>{b.track} · ages 15–18</Pill></div>
              <div className="disp" style={{ fontSize: 24, fontWeight: 800, marginTop: 12 }}>Starts {b.start}</div>
              <div style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>{b.day}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: acc, fontSize: 13, fontWeight: 600, marginTop: 6 }}><Video size={14} /> Live online · Zoom · ~3 hrs/week</div>
              <div style={{ fontSize: 13, color: C.ink2, marginTop: 10, lineHeight: 1.45 }}>
                The full 12-week program — build a product you believe people would pay for, then manage what you earn: taxes, saving, investing through real markets, and big purchases. In an AI world, the edge isn't a degree; it's what you can build.
              </div>
              <div style={{ borderTop: `1px solid ${C.line}`, marginTop: "auto", marginBottom: 12, paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span className="disp" style={{ fontSize: 30, fontWeight: 800 }}>${b.price}</span>
                <span style={{ fontSize: 13, color: closed ? C.rust : (b.seats < 5 ? C.rust : C.muted), fontWeight: 600 }}>{closed ? "Enrollment full" : `${b.seats} seats left`}</span>
              </div>
              <button className="btn" onClick={() => onEnroll(b.id)} style={{ width: "100%", background: closed ? C.line : acc, color: "#fff", padding: "12px", borderRadius: 4, fontSize: 15 }}>{closed ? "Join the next cohort →" : "Enroll in this batch"}</button>
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
          <span {...act(() => setCareers(true))} style={{ color: C.muted, cursor: "pointer" }}>Careers</span>
          <a href={`mailto:${CONFIG.contactEmail}`} style={{ color: C.muted }}>{CONFIG.contactEmail}</a>
          <a href={CONFIG.linkedinUrl} target="_blank" rel="noopener noreferrer" style={{ color: C.muted, display: "inline-flex", alignItems: "center", gap: 5 }}><Linkedin size={13} /> Sunil on LinkedIn</a>
        </div>
        <div style={{ marginTop: 8, fontSize: 12 }}>Financial education, not licensed financial advice. Simulation figures are not real money.</div>
      </footer>

      {careers && <CareersModal onClose={() => setCareers(false)} />}
    </div>
  );
}

// "Teach with us" — a simple interest modal for prospective live tutors. We just ask for an email
// + LinkedIn (both required) and POST to /api/funnel?resource=tutor, which emails it to the founder
// and stores it. Mail-client-independent (no mailto) so it works for everyone. Calm modal style.
function CareersModal({ onClose }) {
  const [email, setEmail] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | done
  const [err, setErr] = useState("");
  const liOk = /linkedin\.com\//i.test(linkedin.trim());
  const canSend = validEmail(email) && liOk && status !== "sending";

  const submit = async () => {
    if (!canSend) return;
    setStatus("sending"); setErr("");
    const r = await postJson("/api/funnel?resource=tutor", { email: email.trim(), linkedin: linkedin.trim() });
    if (r.ok) setStatus("done");
    else { setStatus("idle"); setErr(r.error || "Couldn't submit just now — please try again."); }
  };

  const li = { display: "flex", gap: 9, alignItems: "flex-start", fontSize: 14, color: C.ink2, lineHeight: 1.5, padding: "5px 0" };
  const labelStyle = { fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 5 };
  const inputStyle = { width: "100%", boxSizing: "border-box", fontSize: 14, padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper2, fontFamily: "inherit", color: C.ink };
  return (
    <div role="dialog" aria-modal="true" aria-label="Teach with Build Young" onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(36,36,36,.5)", display: "grid", placeItems: "center", padding: 20 }}>
      <Card onClick={(e) => e.stopPropagation()} style={{ padding: 28, maxWidth: 520, width: "100%", maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#efe7f5", color: C.gold, fontSize: 11.5, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", padding: "5px 11px", borderRadius: 4 }}><GraduationCap size={13} /> Careers · Teach with us</div>
        <h2 className="disp" style={{ fontSize: 24, fontWeight: 800, margin: "14px 0 0" }}>Become a Build Young tutor</h2>

        {status === "done" ? (
          <>
            <p style={{ fontSize: 15, color: C.ink2, lineHeight: 1.6, marginTop: 12 }}>
              <Check size={17} color={C.green} style={{ verticalAlign: "-3px", marginRight: 6 }} />
              Thanks — we've got your details and Sunil will be in touch. 🙌
            </p>
            <button className="btn" onClick={onClose} style={{ marginTop: 16, background: C.ink, color: C.paper2, padding: "11px 20px", borderRadius: 4, fontSize: 14, fontWeight: 700 }}>Close</button>
          </>
        ) : (
          <>
            <p style={{ fontSize: 15, color: C.ink2, lineHeight: 1.6, marginTop: 10 }}>
              We run small, live cohorts where teens build a real product with AI and learn how money works. As we grow, we're looking for instructors who can lead a group live over Zoom — twice a week, ~90 minutes a session, over the 12-week course.
            </p>
            <div style={{ marginTop: 8, marginBottom: 16 }}>
              <div style={li}><Check size={17} color={C.green} style={{ flexShrink: 0, marginTop: 1 }} /><span>You've <b>built things</b> yourself — a product, startup, or side project (bonus if you build with AI).</span></div>
              <div style={li}><Check size={17} color={C.green} style={{ flexShrink: 0, marginTop: 1 }} /><span>You genuinely like <b>working with teens</b> and can make hard ideas feel simple.</span></div>
              <div style={li}><Check size={17} color={C.green} style={{ flexShrink: 0, marginTop: 1 }} /><span>You can commit to a <b>standing weekly time</b> for a cohort, live on Zoom.</span></div>
            </div>
            <label style={{ display: "block", marginBottom: 12 }}>
              <span style={labelStyle}>Your email</span>
              <input type="email" aria-label="Your email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} />
            </label>
            <label style={{ display: "block", marginBottom: 6 }}>
              <span style={labelStyle}>LinkedIn profile <span style={{ color: C.pink }}>*</span></span>
              <input type="url" aria-label="LinkedIn profile URL" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://www.linkedin.com/in/your-profile" style={inputStyle} />
            </label>
            {err && <div style={{ fontSize: 13, color: C.pink, marginTop: 6 }}>{err}</div>}
            <p style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5, margin: "12px 0 16px" }}>
              We work with minors, so live instructors go through a background check. We'll only use your details to follow up.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn" onClick={submit} disabled={!canSend} style={{ background: canSend ? C.emerald : C.line, color: "#fff", padding: "12px 20px", borderRadius: 4, fontSize: 14.5, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8, cursor: canSend ? "pointer" : "not-allowed" }}><Mail size={16} /> {status === "sending" ? "Sending…" : "Express interest"}</button>
              <button className="btn" onClick={onClose} style={{ background: "transparent", border: `1px solid ${C.line}`, color: C.muted, padding: "12px 18px", borderRadius: 4, fontSize: 14 }}>Maybe later</button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

/* ============================ ENROLL ============================ */
// Source-cited "why this matters" stats — social proof for the enroll/call pages.
// Source-cited "why this matters" stats. Each links to its PRIMARY source — keep these
// honest and current; update the numbers AND links together if you refresh them.
const WHY_STATS = [
  { n: "62%", t: "of teens would consider a side hustle, starting a business, or launching a nonprofit as part of their career", src: "Junior Achievement / Citizens, 2025", url: "https://www.citizensbank.com/about-us/community/citizens-impact/citizens-junior-achievement-survey-teens-about-future-of-work.aspx" },
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

function Enroll({ preselect, onDone, onBack, onCall, onHome }) {
  const BATCHES = useCohorts(); // live catalog
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [age15, setAge15] = useState(false); // COPPA age gate — confirm the student is 15+
  const [batch, setBatch] = useState(preselect || BATCHES[0].id);
  const [notified, setNotified] = useState(false); // captured interest for a full cohort
  const b = BATCHES.find((x) => x.id === batch) || BATCHES[0];
  const closed = cohortClosed(b); // sold out, or past the enrollment cutoff (day before start)
  const canContinue = name.trim() && validEmail(email) && age15 && !closed;
  const canNotify = name.trim() && validEmail(email);
  // A full cohort doesn't take a waitlist (no mid-course additions) — we capture interest for the
  // NEXT cohort instead, so the founder sees real overflow demand.
  const submitInterest = async () => {
    try { await fetch("/api/funnel?resource=interest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, batchId: b.id, season: b.season, track: b.track }) }); } catch (e) {}
    setNotified(true);
  };
  const acc = b.id.includes("mw") ? C.emerald : C.green;
  const inputS = { width: "100%", padding: "12px 14px", borderRadius: 4, border: `1.5px solid ${C.line}`, background: C.paper2, fontSize: 15, marginTop: 6 };
  const label = { fontSize: 13, fontWeight: 700, color: C.ink2 };
  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <PageBackdrop tint="#e7f3ee" />
      <div style={{ position: "relative", zIndex: 2, maxWidth: step === 1 ? 880 : 540, margin: "0 auto", padding: "26px 5vw 60px", transition: "max-width .2s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div className="disp" {...act(() => onHome && onHome())} aria-label="Build Young — home" style={{ fontWeight: 900, fontSize: 18, cursor: "pointer" }}><Mark size={20} /> Build Young</div>
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
                  <select aria-label="Batch" value={batch} onChange={(e) => { setBatch(e.target.value); setNotified(false); }} style={inputS}>
                    {SEASONS.map((s) => (
                      <optgroup key={s.key} label={s.label}>
                        {BATCHES.filter((x) => x.season === s.key).map((x) => (
                          <option key={x.id} value={x.id}>{x.day.split(" · ")[0]} (starts {x.start}){cohortClosed(x) ? " — ENROLLMENT FULL" : ""}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div style={{ marginTop: 14 }}><div style={label}>Student name</div><input aria-label="Student name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Rivera" style={inputS} /></div>
                <div style={{ marginTop: 14 }}><div style={label}>Email <span style={{ color: C.muted, fontWeight: 500 }}>— this is your username</span></div><input aria-label="Email (your username)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" style={inputS} /></div>
                {closed ? (
                  notified ? (
                    <div style={{ marginTop: 16, padding: 14, background: "#e7f3ee", border: `1px solid ${C.green}`, borderRadius: 4, fontSize: 13.5, color: C.ink2, lineHeight: 1.5 }}>
                      <b style={{ color: C.green }}>You're on the list ✓</b> We'll email you the moment a new {b.track} cohort opens. Thanks for your interest!
                    </div>
                  ) : (<>
                    <div style={{ marginTop: 16, padding: 12, background: "#fbeede", border: `1px solid ${C.goldLite}`, borderRadius: 4, fontSize: 13, color: C.ink2, lineHeight: 1.5 }}>
                      {b.full
                        ? <>Enrollment for this cohort is <b>full</b>.</>
                        : <>Enrollment for this cohort has <b>closed</b> — it starts {b.start}.</>}{" "}
                      Leave your name + email and we'll tell you the moment the next cohort opens. <span style={{ color: C.muted }}>(No waitlist — students don't join mid-course.)</span>
                    </div>
                    <button className="btn" disabled={!canNotify} onClick={submitInterest} style={{ width: "100%", marginTop: 14, background: canNotify ? C.emerald : C.line, color: "#fff", padding: 14, borderRadius: 4, fontSize: 16, cursor: canNotify ? "pointer" : "not-allowed" }}>Notify me about the next cohort →</button>
                  </>)
                ) : (<>
                  <label style={{ display: "flex", gap: 9, alignItems: "flex-start", marginTop: 14, fontSize: 13, color: C.ink2, cursor: "pointer", lineHeight: 1.45 }}>
                    <input type="checkbox" checked={age15} onChange={(e) => setAge15(e.target.checked)} style={{ marginTop: 2, width: 16, height: 16, accentColor: C.emerald, flexShrink: 0 }} />
                    <span>I'm the parent/guardian enrolling, and I confirm the student is <b>15 or older</b>. <span style={{ color: C.muted }}>Build Young is for ages 15–18.</span></span>
                  </label>
                  <div style={{ marginTop: 12, fontSize: 12, color: C.muted, lineHeight: 1.5, background: C.paper, borderRadius: 6, padding: "9px 12px" }}>
                    <b style={{ color: C.ink2 }}>A note on costs:</b> beyond tuition, your child will need <b>Claude Pro</b> (about <b>$20/month</b>) — the AI that builds the app alongside them — for the build weeks; a free account won't keep up. Everything else we use (GitHub, Vercel) is <b>free</b>. Later, a custom web address (domain) is <b>optional</b> and runs about <b>$10–20/year</b> if you want one.
                  </div>
                  <button className="btn" disabled={!canContinue} onClick={() => setStep(2)} style={{ width: "100%", marginTop: 18, background: canContinue ? C.emerald : C.line, color: "#fff", padding: 14, borderRadius: 4, fontSize: 16, cursor: canContinue ? "pointer" : "not-allowed" }}>Continue to payment →</button>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 12, color: C.muted, fontSize: 12.5 }}>
                    <Lock size={13} /> Secure checkout · no charge until the next step
                  </div>
                </>)}
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
                    <b style={{ color: C.ink2 }}>Full refund</b> if you cancel before {b.start}. After classes begin, a <b style={{ color: C.ink2 }}>prorated refund</b> is available through the first week; non-refundable after.
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 8, fontWeight: 700, letterSpacing: ".04em" }}>WHAT YOU GET FROM ME</div>
                  <div style={{ marginTop: 8, display: "grid", gap: 7 }}>
                    {[
                      "12 weeks of live classes — 2 sessions a week (~3 hrs), taught by me",
                      "Your own student dashboard",
                      "Build a real product, then manage what it earns",
                      "A certificate of completion you can add to LinkedIn",
                      "A shot at the builder prize — land a real paying customer in a year, get your tuition back",
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
                      { icon: GraduationCap, t: "Capped at 10 students" },
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
          const stripeLink = b && b.stripeLink;
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
                  setPendingEnroll({ name, email, batch, track: b.track });
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
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, textAlign: "left", background: "#eef3f0", border: `1px solid ${C.green}`, borderRadius: 6, padding: "10px 13px", marginTop: 10 }}>
              <Award size={16} color={C.green} style={{ flexShrink: 0, marginTop: 1 }} /><span style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.5 }}><b style={{ color: C.green }}>One to aim for — the builder prize.</b> The first builder in your cohort to land a real paying customer within a year gets their <b>tuition refunded</b> (real sale + a short video). <span style={{ color: C.muted }}>See Terms.</span></span>
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
        <div className="disp" {...act(() => onHome && onHome())} aria-label="Build Young — home" style={{ fontWeight: 900, fontSize: 18, cursor: "pointer" }}><Mark size={20} /> Build Young</div>
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
                    <button className="btn" disabled={!(slot && name.trim() && validEmail(email))} onClick={() => { _callBookedThisSession = true; track("call_booked", {}); setDone(true); }} style={{ width: "100%", marginTop: 20, background: (slot && name.trim() && validEmail(email)) ? A : C.line, color: "#fff", padding: 14, borderRadius: 4, fontSize: 16, cursor: (slot && name.trim() && validEmail(email)) ? "pointer" : "not-allowed" }}>Book my call →</button>
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
                      "Ask me about the program, the format, or your kid",
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
                    I'm <b style={{ color: C.ink2 }}>Sunil</b> — I spent 20 years in product at Microsoft, I'm a dad of two daughters, and I built this for my own kids first.
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

// Pre-class setup checklist. In Act 1 (Weeks 1–7) the student builds their OWN app with AI as the
// tool, so they need the same builder's "workshop" set up first — the same accounts/tools used to
// build Build Young itself. Each item says WHEN it's needed so nothing's a surprise; a parent can
// help with sign-ups (several services require an adult under 18). Students tick these off and the
// state persists (s.prereqs). Edit here to change the list.
const PREREQS = [
  { id: "computer", title: "A laptop or desktop", when: "Day one", why: "You'll be writing, building, and checking your app — much easier on a real keyboard and screen than a phone or tablet. A modern web browser and a steady internet connection too.", },
  { id: "claude", title: "A Claude account with Claude Pro, for Claude Code", when: "Week 3", build: true, why: "Claude Code is your AI build partner — the coding agent that writes and edits your whole app as you describe what you want (it's how this very site was built). It runs right in your browser at claude.ai/code — you sign in with your Claude account. You'll need Claude Pro (about $20/month) for real building — a free account won't keep up with a full project. A parent can set this up.", link: "https://claude.ai/code" },
  { id: "github", title: "A free GitHub account", when: "Week 3", build: true, why: "Where your code lives, with every version saved — so nothing ever gets lost. Vercel connects to it to put your app online.", link: "https://github.com" },
  { id: "vercel", title: "A free Vercel account", when: "Week 3", build: true, why: "Sign in with GitHub. This is how you put your app on the internet for real people to use — it builds and hosts it for you (no installs on your computer), and gives you a free web address (like your-app.vercel.app).", link: "https://vercel.com" },
  { id: "stripe", title: "A Stripe account — a parent sets this up", when: "Week 5", why: "When you add payments in Week 5, Stripe is how your product takes real money safely — you never handle card details yourself. A parent must set it up since you're under 18 (free to start; Stripe takes a small fee per sale).", link: "https://stripe.com" },
  { id: "domain", title: "Optional — your own web address (domain)", when: "Week 7", why: "A free Vercel link (your-app.vercel.app) works the whole course. When you go live in Week 7, you can optionally BUY your app's OWN web address (like build-young.com) — usually ~$10–20/year, bought right on Vercel (where we got build-young.com).",
    links: [{ label: "Buy a domain on Vercel", url: "https://vercel.com/domains" }] },
];

/* ============================ OVERVIEW (first-login landing) ============================
 * The welcome / orientation tab. It's the DEFAULT tab until the student has started the course
 * (s.started), so someone who enrolls weeks early sees the plan, what to expect, instructions,
 * and the real start date/countdown — not a misleading "Week 1 of 12". */
function OverviewPanel({ s, batch, onTab, setS }) {
  const prereqs = (s && s.prereqs) || {};
  const doneCount = PREREQS.filter((p) => prereqs[p.id]).length;
  const togglePrereq = (id) => setS && setS((p) => ({ ...p, prereqs: { ...(p.prereqs || {}), [id]: !((p.prereqs || {})[id]) } }));
  const info = cohortStartInfo(batch);
  const first = (s.student.name || "").split(" ")[0] || "there";
  const sectionTitle = { fontSize: 16, fontWeight: 800, color: C.ink, margin: "0 0 8px" };
  const li = { display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, color: C.ink2, lineHeight: 1.5, padding: "7px 0" };
  const num = (n) => (<span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 999, background: C.emerald, color: "#fff", fontSize: 12, fontWeight: 800, display: "grid", placeItems: "center" }}>{n}</span>);
  const chip = (numv, label) => (
    <div style={{ display: "flex", alignItems: "center", gap: 14, background: "rgba(255,255,255,.12)", borderRadius: 10, padding: "14px 18px" }}>
      <span className="disp" style={{ fontSize: 30, fontWeight: 800, color: "#fff", lineHeight: 1, minWidth: 36 }}>{numv}</span>
      <span style={{ fontSize: 12.5, color: "rgba(255,255,255,.82)", lineHeight: 1.3 }}>{label}</span>
    </div>
  );

  return (
    <div className="rise">
      {/* Two-column hero: welcome copy + actions on the left, the cohort stat chips stacked into
          the right (which would otherwise be empty dark space). Collapses to a single column on
          narrow screens via .enroll-grid. */}
      <Card style={{ padding: 32, marginBottom: 14, background: C.ink, border: "none" }}>
        <div style={{ display: "flex", gap: 44, alignItems: "stretch", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 440px", minWidth: 0 }}>
            <div style={{ fontSize: 12, color: C.goldLite, fontWeight: 700, letterSpacing: ".06em" }}>WELCOME TO BUILD YOUNG</div>
            <div className="disp" style={{ fontSize: 27, fontWeight: 800, marginTop: 8, color: "#fff" }}>You're in, {first}! 🎉</div>
            <div style={{ color: "rgba(255,255,255,.62)", fontSize: 13, fontWeight: 600, marginTop: 8 }}>{batch.track} · {batch.day}</div>
            <p style={{ color: "rgba(255,255,255,.78)", fontSize: 14.5, lineHeight: 1.7, marginTop: 14, maxWidth: 580 }}>
              Your <b style={{ color: "#fff" }}>{batch.track}</b> cohort {info.beforeStart ? <>{info.phrase} — <b style={{ color: "#fff" }}>{info.longDate}</b>.</> : <>is underway.</>} You'll learn to <b style={{ color: "#fff" }}>think like a founder</b> — everything you need to get ready is right below. Every dollar here is <b style={{ color: "#fff" }}>simulated</b>.
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
              <a href={batch.zoom} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                <button className="btn" style={{ background: C.emeraldLite, color: "#fff", padding: "12px 20px", borderRadius: 4, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}><Video size={16} /> Join class on Zoom</button>
              </a>
              <button className="btn" onClick={() => onTab("dash")} style={{ background: "rgba(255,255,255,.14)", color: "#fff", padding: "12px 20px", borderRadius: 4, fontSize: 14 }}>Go to my dashboard →</button>
            </div>
          </div>
          <div style={{ flex: "0 1 280px", display: "flex", flexDirection: "column", gap: 14, justifyContent: "center" }}>
            {info.beforeStart && chip(info.days, `${info.days === 1 ? "day" : "days"} until your first class`)}
            {chip(12, "weeks · 2 sessions/week")}
            {chip(24, "live sessions in all")}
          </div>
        </div>
      </Card>

      <Card style={{ padding: 20, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
          <h3 style={{ ...sectionTitle, margin: 0 }}>Get set up before you build</h3>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: doneCount === PREREQS.length ? C.green : C.muted }}>{doneCount} of {PREREQS.length} done</span>
        </div>
        <p style={{ fontSize: 13.5, color: C.ink2, lineHeight: 1.55, margin: "6px 0 8px" }}>
          In your first weeks you'll build your <b>own</b> app with AI — so you need the same tools we used to build this one (all free except <b>Claude Pro</b>, ~$20/month). Tick each off as you set it up, and bring them to the class where they're needed. <span style={{ color: C.muted }}>A parent can help with sign-ups.</span>
        </p>
        {PREREQS.map((p) => {
          const checked = !!prereqs[p.id];
          return (
            <div key={p.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 0", borderTop: `1px solid ${C.line}` }}>
              {/* Explicit checkbox (its own aria-label) rather than a wrapping <label>, so the help
                  link in the description stays independently clickable without toggling the box. */}
              <input type="checkbox" aria-label={`Mark "${p.title}" as done`} checked={checked} onChange={() => togglePrereq(p.id)} style={{ width: 18, height: 18, marginTop: 1, flexShrink: 0, accentColor: C.emerald, cursor: "pointer" }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <b {...act(() => togglePrereq(p.id))} style={{ fontSize: 14, cursor: "pointer", color: checked ? C.muted : C.ink, textDecoration: checked ? "line-through" : "none" }}>{p.title}</b>
                  <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: C.turq, background: "#e6f2f3", borderRadius: 999, padding: "2px 8px" }}>Needed by {p.when}</span>
                </div>
                <div style={{ fontSize: 13, color: C.ink2, lineHeight: 1.5, marginTop: 3 }}>
                  {p.why}
                  {p.link && <> <a href={p.link} target="_blank" rel="noopener noreferrer" style={{ color: C.emerald, fontWeight: 700, whiteSpace: "nowrap" }}>Open ↗</a></>}
                  {p.links && p.links.map((l) => <span key={l.url}> <a href={l.url} target="_blank" rel="noopener noreferrer" style={{ color: C.emerald, fontWeight: 700, whiteSpace: "nowrap" }}>{l.label} ↗</a></span>)}
                </div>
              </div>
            </div>
          );
        })}
        <div style={{ marginTop: 14, fontSize: 13, fontWeight: 600, color: C.emerald, background: "#eef3f0", borderRadius: 6, padding: "10px 14px" }}>
          New to all this? Perfect — that's the whole point. You'll set up every one of these yourself, and by the end you'll have built and shipped a real app. 🚀
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="enroll-grid">
        <Card style={{ padding: 20 }}>
          <h3 style={sectionTitle}>What to expect</h3>
          <div style={li}><Sparkles size={17} color={C.green} style={{ flexShrink: 0, marginTop: 1 }} /><span><b>Weeks 1–7 — 0 → 1.</b> Find a problem, write a spec, build your product with AI in four layers (core product, accounts, payments, production-ready), then take it live.</span></div>
          <div style={li}><GraduationCap size={17} color={C.emerald} style={{ flexShrink: 0, marginTop: 1 }} /><span><b>Weeks 8–10 — 1 → 100.</b> Build your funnel, measure what's working (active users + retention), and grow with product-led growth. Your income comes from your product.</span></div>
          <div style={li}><TrendingUp size={17} color={C.turq} style={{ flexShrink: 0, marginTop: 1 }} /><span><b>Week 11 — Money, the basics.</b> One class on what to do with what you earn — pay yourself first, invest so it compounds, and a first big purchase done right.</span></div>
          <div style={li}><Flag size={17} color={C.gold} style={{ flexShrink: 0, marginTop: 1 }} /><span><b>Week 12 — Capstone.</b> Tally everything up — what you built and what it's worth — and say what you'd build next.</span></div>
          <div style={li}><Award size={17} color={C.pink} style={{ flexShrink: 0, marginTop: 1 }} /><span><b>A certificate of completion.</b> Finish the course and earn a certificate you can download and add to your LinkedIn profile.</span></div>
          <div style={li}><Award size={17} color={C.green} style={{ flexShrink: 0, marginTop: 1 }} /><span><b>The builder prize — tuition back.</b> The first builder in your cohort to land a real paying customer within a year of enrolling gets their tuition refunded (real sale + a short video). <span style={{ color: C.muted }}>See Terms.</span></span></div>
        </Card>
        <Card style={{ padding: 20 }}>
          <h3 style={sectionTitle}>How each week works</h3>
          <div style={li}>{num(1)}<span>Join the <b>live class on Zoom</b> — the same link works every week.</span></div>
          <div style={li}>{num(2)}<span>Open <b>Course progress</b> and do that week's activity — build your product with AI, grow it into a business, then manage the money it earns.</span></div>
          <div style={li}>{num(3)}<span>On the <b>Dashboard</b>, hit <b>advance</b> to move the simulation forward and watch your <b>net worth</b> grow. (Once you're investing, you'll rebalance in <b>Portfolio</b> as <b>Markets</b> move.)</span></div>
        </Card>
      </div>

      <div style={{ marginTop: 14, fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>
        All money in the program is <b>simulated</b> — this is financial education, not licensed advice. Full refund any time before your cohort starts; prorated through the {REFUND_WINDOW}.
      </div>
    </div>
  );
}

/* ============================ BUILD PLAN (work backwards from the customer) ============================
 * Lives at the top of the Dashboard. Before building, the student picks an idea (or writes their
 * own) and writes WHO it's for + a short "press release" as if it already launched — the
 * work-backwards move. Persists in s.build (auto-saved with the rest of the sim state). */
// A fully worked Week-1 build plan — Build Young itself — so students see what "good" looks like.
const EXAMPLE_BUILD = {
  idea: "Build Young — a live program where teens 15–18 build a real product with AI, then learn to grow and manage what it earns, all inside one money simulation.",
  pain: `Teens aren't taught how money or the real world actually works — it's not on any test, and the free videos out there go unwatched.
Parents worry that in an AI world a degree won't be the edge — but there's no hands-on way for their kid to learn to build, or to handle money, before adulthood.
The "investing classes" that exist only teach stock-picking (the flashy 10%) — not earning, taxes, budgeting, or big purchases, which are the parts that actually shape a life.`,
  pr: `Announcing Build Young — a live program where teens build a product people would pay for, with AI as their tool, and learn to manage the money it earns.

The problem: Kids leave school having never built anything real or learned how money works — and in an AI world, the edge is what you can build, not what you were credentialed to do.

How it works: Over 12 weeks, each teen builds their own product with AI, earns (simulated) income from it, then learns taxes, saving, investing, and big purchases — all in one continuous simulation where mistakes are safe.

Why families love it: It's live and small-group with a standing weekly time, so "someday" becomes "done" — and kids graduate having built both a business and a net worth from zero.

"My daughter went from 'I don't get money' to running her own little product and explaining compound interest at dinner." — a Build Young parent`,
  productSuccess: `Real teens use it and keep coming back — and they'd be bummed if it went away. They like it enough to tell their friends, so classes keep filling up.`,
  financialSuccess: `It makes more money than it costs to run. Most new families come from people telling their friends, so we don't have to spend much to find them — and there's enough left over to keep it going and make it bigger.`,
};

// Week 2 "Shape the Idea": the spec, organized as FOUR build prompts — one per week (3–6). Each
// prompt adds the next layer: the core product (Wk3) → accounts & data (Wk4) → payments (Wk5) →
// production-ready (Wk6). Worked through for Build Young itself as the class model.
const SHAPE_EXAMPLE = {
  product: `What it is: a live, online money-skills program for teens 15–18, delivered as one web app. Over 12 weeks they build a real product with AI, then run a money simulation where that product is their income. It's hands-on and a bit like a game.

What to build first (the core product):
• A marketing site that explains the program, the curriculum, the price, and the founder, and lists the upcoming cohorts to choose from.
• An enroll flow: pick a cohort, enter the student's name + email, confirm they're 15+.
• The student dashboard: a week-by-week stepper (1–12). Each week shows its lesson, that week's activity, a Zoom link, and a private notes area; weeks unlock as you reach them.
• The simulation: hit "advance" to collect your income, apply the week's market move, and watch your net worth change. Mistakes are safe — the money is simulated.

The "wow": the first time a teen shares a link to their live product and watches someone actually use it. Even their parents!

(This is the core product — what you build first. Write it in enough detail that it could be built from this alone. No accounts or payments yet — just the core.)`,
  accounts: `After they're set up, each student gets their own login that works on any device, with password reset. Their dashboard remembers everything that's theirs: which week they're on, their notes, their plans and spec, and their simulation progress (cash, holdings, net worth) — so they pick up right where they left off.

Use a trusted, standard sign-in — never homemade password code.`,
  payments: `Families pay tuition to enroll — a secure checkout, with no charge until they confirm. Each cohort has its own price and number of seats; paying unlocks the student's account (they get an email to set their password). Enrollment closes the day before a cohort starts.

Use a trusted checkout (like Stripe) — never handle card details yourself.`,
  production: `Emails: a welcome when they enroll, a reminder 2 days before each week's first class, a recap with homework after each week, and a certificate at the end.
Findable: the site shows up in search and looks right when someone shares the link (title, description, share image).
Safe: it checks everything people type in, keeps secret keys off the browser, and protects students' data — they're minors.`,
  success: `Here's how we'll know it's working:
Product success: real teens use it weekly and keep coming back through the whole course — they'd be bummed if it went away, and they tell friends, so cohorts keep filling.
• Active user = a student who opens their dashboard and advances their week.
• Retention = they come back week after week, not just once.
• Referral = they tell a friend who enrolls (the "magic moment" is sharing a link to their live product).
Financial success: it earns more than it costs to run, and most new families come from word of mouth — so we spend little to find them, with enough left over to keep going and make it bigger.`,
};

// Week 3 "Make It (with AI)" is a hands-on, live build week — so the class material is just three
// durable principles to keep in mind, not a long worked example. The actionable bits (pre-reqs +
// copy-your-spec) live in the student activity below.
const MAKE_PRINCIPLES = [
  { t: "Build one layer at a time", d: "This week is just Layer 1 — the core product. Don't try to build the whole thing at once. Accounts (Wk4), payments (Wk5), and the production-ready polish (Wk6) each get their own week and their own prompt." },
  { t: "Run the loop: describe → see → taste → refine", d: "AI builds it, you look, you judge it with taste (what does GOOD look like?), you ask for the change — repeat. You don't write code; you direct it. That taste is the skill that matters most in an AI world." },
  { t: "Ship it early", d: "Put it live before it's perfect (free, one click on Vercel). Real people surface the real problems worth fixing — not imaginary ones." },
];

// Per-week build-activity content for weeks 4–9 (build / prioritize / funnel / scale). Each entry
// (when present) drives a principles card + copy-paste prompt via PrinciplesCard + InfraBuildPlan,
// same pattern as Week 3. Currently EMPTY — these weeks show the "coming soon" placeholder while
// the outline settles; content is built per week next. (Week 3's full build activity is separate.)
const WEEK_INFRA = {};

// Generic class-example card (the worked Build Young model the instructor presents). Generic over
// its fields so each build week can have its own. Shown by default; it's NOT the student's editor.
function ExampleCard({ subtitle, fields }) {
  const [open, setOpen] = useState(true);
  const lab = { fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 5 };
  return (
    <div style={{ border: `1px solid ${C.emerald}`, borderRadius: 6, background: "#eef3f0", overflow: "hidden" }}>
      <button type="button" className="btn" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 10.5, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: C.emerald }}><Sparkles size={12} style={{ verticalAlign: "-2px", marginRight: 5 }} />Class example — Build Young</span>
          <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: C.ink, marginTop: 2 }}>{subtitle}</span>
        </span>
        <span aria-hidden="true" style={{ color: C.muted, fontSize: 18, flexShrink: 0 }}>{open ? "–" : "+"}</span>
      </button>
      {open && (
        <div style={{ padding: "0 14px 14px", borderTop: `1px solid ${C.emerald}33` }}>
          <div style={{ fontSize: 12.5, color: C.ink2, margin: "12px 0 4px" }}>We'll walk through this together in class — then you'll write your own below. (Yours can start rough; it'll evolve.)</div>
          {fields.map(([label, text]) => (
            <div key={label} style={{ marginTop: 12 }}>
              <span style={lab}>{label}</span>
              <div style={{ fontSize: 13, color: C.ink2, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// The class-material example for a build week (null if that week has none yet).
function weekExample(week) {
  if (week === 1) return <ExampleCard subtitle="A worked plan — how we'd fill this in" fields={[
    ["The idea", EXAMPLE_BUILD.idea],
    ["Customer pain point(s)", EXAMPLE_BUILD.pain],
    ["Press release", EXAMPLE_BUILD.pr],
    ["What product success looks like", EXAMPLE_BUILD.productSuccess],
    ["What financial success looks like", EXAMPLE_BUILD.financialSuccess],
  ]} />;
  if (week === 2) return <ExampleCard subtitle="A worked spec — four parts, one per week (3–6)" fields={[
    ["Week 3 · The core product", SHAPE_EXAMPLE.product],
    ["Week 4 · Accounts & saved data", SHAPE_EXAMPLE.accounts],
    ["Week 5 · Payments", SHAPE_EXAMPLE.payments],
    ["Week 6 · Production-ready", SHAPE_EXAMPLE.production],
    ["What success looks like", SHAPE_EXAMPLE.success],
  ]} />;
  // Build weeks (3–10): the class material is a SAMPLE prompt — a worked model the student adapts.
  // Weeks 3–6 show Build Young's own spec slice; weeks 7–10 show the seeded growth prompt.
  const bl = BUILD_LAYERS[week];
  if (bl) {
    const sample = bl.key ? SHAPE_EXAMPLE[bl.key] : bl.seed;
    const sampleCard = <ExampleCard subtitle="A sample prompt — a model to adapt for your own product" fields={[[bl.fieldLabel, sample]]} />;
    // Week 9 (metrics): explain the terms FIRST — teens won't know DAU/MAU/retention yet.
    if (week === 9) return (<><GlossaryCard title="First — the metrics, in plain English" items={METRICS_PRIMER} /><div style={{ height: 14 }} />{sampleCard}</>);
    return sampleCard;
  }
  return null;
}

// Plain-English glossary card — defines terms for a week before the hands-on part (e.g. Week 9
// metrics). Clean term — definition rows, same green class-material look.
function GlossaryCard({ title, items }) {
  return (
    <div style={{ border: `1px solid ${C.emerald}`, borderRadius: 6, background: "#eef3f0", padding: "14px 16px" }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: C.emerald }}><BookOpen size={12} style={{ verticalAlign: "-2px", marginRight: 5 }} />{title}</div>
      <div style={{ marginTop: 10, display: "grid", gap: 9 }}>
        {items.map((it, i) => (
          <div key={i} style={{ fontSize: 13, lineHeight: 1.5 }}><b style={{ color: C.ink }}>{it.t}</b> <span style={{ color: C.ink2 }}>— {it.d}</span></div>
        ))}
      </div>
    </div>
  );
}
const METRICS_PRIMER = [
  { t: "Active users (DAU / MAU)", d: "how many different people actually use your product — DAU is in a day, MAU in a month. Signing up once doesn't count; coming back and using it does." },
  { t: "Retention", d: "of the people who try it, how many come back later (the next day, a week on). Low retention means it isn't useful enough yet — the number that matters most." },
  { t: "Funnel & drop-off", d: "the path people take — found it → tried it → came back. You lose some at each step; the biggest drop is your bottleneck, so fix that first." },
  { t: "North-star metric", d: "the one number that best means “it's working” for YOUR product — tie it to the success you defined in Week 2." },
];

// A short, numbered principles card — the plain-language class material for the hands-on build
// weeks (3–6). Same look as the green class-example card, but a quick "things to remember" list.
function PrinciplesCard({ title, items }) {
  return (
    <div style={{ border: `1px solid ${C.emerald}`, borderRadius: 6, background: "#eef3f0", padding: "14px 16px" }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: C.emerald }}><Sparkles size={12} style={{ verticalAlign: "-2px", marginRight: 5 }} />{title}</div>
      <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
        {items.map((p, i) => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 999, background: C.emerald, color: "#fff", fontSize: 12, fontWeight: 800, display: "grid", placeItems: "center" }}>{i + 1}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>{p.t}</div>
              <div style={{ fontSize: 13, color: C.ink2, lineHeight: 1.5, marginTop: 2 }}>{p.d}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// The student's activity component for a build week (null if none yet).
function weekActivity(week, s, setState, bare) {
  if (week === 1) return <BuildPlan s={s} setS={setState} bare={bare} />;
  if (week === 2) return <ShapePlan s={s} setS={setState} bare={bare} />;
  if (BUILD_LAYERS[week]) return <BuildLayer week={week} s={s} setS={setState} bare={bare} />;
  return null;
}

// The four build layers (Weeks 3–6). Each is ONE prompt that adds the next layer to the SAME app:
// core product (Wk3) → accounts & data (Wk4) → payments (Wk5) → production-ready (Wk6). The student
// writes all four in their Week 2 spec (s.shape); each build week shows ONLY its own layer's prompt.
const BUILD_LAYERS = {
  3: { key: "product",
    heading: "Build the core product 🛠️",
    lead: "Your Week 2 spec IS your prompt — no separate writing. Run the loop: describe → see → taste → refine. Just the core for now; accounts and payments come later.",
    fieldLabel: "The core product",
    promptLabel: "What to build — the core product:",
    placeholder: "(From your Week 2 spec — the core product: what it is, who it's for, the main things it does, and the 'wow' moment.)",
    intro: "Please build this web app for me — just the core product to start. You write the code; I'll tell you what's good and what to change — keep it simple and tell me exactly what to do.",
    instruction: "Build just this core product — the main thing it does — with clean, simple, friendly styling. Don't add accounts or payments yet. When it's built, tell me exactly how to run it and see it in my browser. Then I'll tell you what to change. Let's go!" },
  4: { key: "accounts",
    heading: "Make it yours — accounts & saved data 🔐",
    lead: "Build this onto the product you shipped in Week 3 — without breaking what already works.",
    fieldLabel: "Accounts & saved data",
    promptLabel: "What to add — accounts & saved data:",
    placeholder: "(From your Week 2 spec — accounts & saved data: who signs in, and what's saved for each person.)",
    intro: "Please add accounts and saved data to the app I've already built. You write the code; I'll tell you what's good and what to change — don't break what already works.",
    instruction: "Use a trusted, standard sign-in — do NOT write your own password or security code. Save each user's data so they pick up where they left off. When it's done, tell me how to test signing in and that my data is saved." },
  5: { key: "payments",
    heading: "Get paid — add payments 💳",
    lead: "Layer payments onto your existing product — the first real way to charge for the value you deliver.",
    fieldLabel: "Payments",
    promptLabel: "What to add — payments:",
    placeholder: "(From your Week 2 spec — payments: what people pay for, how much, and what they get.)",
    intro: "Please add payments to the app I've already built. You write the code; I'll tell you what's good and what to change — don't break what already works.",
    instruction: "Use a trusted checkout (like Stripe) — never handle card details yourself. Unlock the paid features only after payment is confirmed. When it's done, tell me how to test a payment safely." },
  6: { key: "production",
    heading: "Make it real — production-ready ✨",
    lead: "The finishing layer on what you've built — the polish that gets it ready for real strangers.",
    fieldLabel: "Production-ready",
    promptLabel: "What to make production-ready:",
    placeholder: "(From your Week 2 spec — production-ready: emails, being findable, and keeping data safe.)",
    intro: "Please make the app I've already built production-ready. You write the code; I'll tell you what's good and what to change — don't break what already works.",
    instruction: "Use trusted services to send emails; keep every secret key off the browser; check everything users type in; and make it findable (a clear title, description, and share image). When it's done, give me a short checklist to confirm it's ready for real users." },
  // Weeks 7–10 are GROWTH layers — features added after launch, so they aren't part of the Week 2
  // product spec. Each is a starter prompt (`seed`) the student adapts to their own product;
  // edits persist in s.grow[week].
  7: { key: null,
    heading: "Go live — open for business 🚀",
    lead: "Your product works — now flip the switches that make it real to the world (a parent helps with the live payment keys).",
    fieldLabel: "Your go-live checklist",
    promptLabel: "Take it live:",
    intro: "Help me take my app live for real users. You guide me step by step; go slowly and confirm each step before the next.",
    seed: `Help me take my app live for real users:
- Connect my own web address (domain) on Vercel and make sure the secure padlock (HTTPS) works.
- Switch payments from TEST keys to LIVE keys, and move every secret key into environment variables — never in the code or the browser.
- Run a launch checklist with me: sign-up works, a real payment works, emails send, and nothing secret is exposed.`,
    instruction: "Tell me exactly what to click. Flag anything that needs a real account or a parent's help (like live payment keys)." },
  8: { key: null,
    heading: "Build the funnel into your product 🧲",
    lead: "Build this into the product you've launched — growth becomes part of the product itself, not a separate ad campaign.",
    fieldLabel: "The funnel to build in",
    promptLabel: "Build this funnel into my product:",
    intro: "Add a simple growth funnel to the app I've already built — don't break what works.",
    seed: `Add a simple growth funnel to my product:
- A clear landing page that explains what it does and gets people to try it fast.
- A smooth first run, so a new user reaches the "magic moment" quickly.
- An easy reason and way to come back (save their work, send a helpful email, etc.).`,
    instruction: "Measure each step so I can see where people drop off. Keep it simple." },
  9: { key: null,
    heading: "Measure it — find the bottleneck 📊",
    lead: "Add the instrumentation to see how your product is really doing — the numbers behind the growth.",
    fieldLabel: "The metrics to add",
    promptLabel: "Add these metrics:",
    intro: "Add basic, privacy-respecting analytics to the app I've already built.",
    seed: `Add simple analytics so I can measure how my product is really doing:
- Daily and monthly active users (DAU / MAU).
- Retention: how many people come back after day 1 and day 7.
- Where in the funnel people drop off.
Show me a small dashboard of these and help me read it to find the ONE biggest bottleneck to fix next.`,
    instruction: "Don't collect anything you don't need — especially since some users may be minors." },
  10: { key: null,
    heading: "Product-led growth 🌱",
    lead: "The kind of growth that comes from the product itself, not from ads — built on top of what you have.",
    fieldLabel: "The growth to build in",
    promptLabel: "Build growth into the product:",
    intro: "Help me build growth into the app itself — on top of what I already have.",
    seed: `Help me build growth into the product itself:
- An easy, natural way for users to share it or invite others (a share link, an invite, public results).
- A reason sharing helps them, not just me.
- Small touches that make people want to tell a friend.
First suggest 2–3 product-led-growth ideas that fit MY product, then build the best one.`,
    instruction: "Keep it genuine — no spammy or manipulative tricks." },
};

// Weeks 4–6 "your turn": a short intro + the week's copy-paste prompt (editable; seeded from
// WEEK_INFRA, stored per-week in s.infra[week].prompt). Same shape as MakePlan, minus the spec
// generation — the prompt here is this week's GOAL, which they adapt to their own product.
function InfraBuildPlan({ s, setS, bare, week }) {
  const cfg = WEEK_INFRA[week];
  const store = (s.infra && s.infra[week]) || {};
  const [copied, setCopied] = useState(false);
  const setPrompt = (v) => setS((p) => ({ ...p, infra: { ...(p.infra || {}), [week]: { ...((p.infra || {})[week] || {}), prompt: v } } }));
  const edited = store.prompt;
  const promptValue = edited !== undefined ? edited : cfg.promptSeed;
  const copy = async () => {
    try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(promptValue); setCopied(true); setTimeout(() => setCopied(false), 2000); } } catch { /* selectable fallback */ }
  };
  const inner = (
    <>
      <h3 style={{ fontSize: 16, fontWeight: 800, color: C.ink, margin: 0 }}>{cfg.heading}</h3>
      <p style={{ fontSize: 13.5, color: C.ink2, lineHeight: 1.55, margin: "6px 0 12px" }}>{cfg.intro} <span style={{ color: C.muted }}>You'll do this live with Sunil — AI handles the how.</span></p>
      {cfg.need && (
        <div style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.5, background: "#eef3f0", border: `1px solid ${C.emerald}`, borderRadius: 6, padding: "9px 12px", marginBottom: 14 }}>
          <b style={{ color: C.ink }}>You'll need:</b> {cfg.need}
        </div>
      )}
      <div style={{ border: `1px solid ${C.turq}`, borderRadius: 6, background: "#eef6f6", padding: "12px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13.5, fontWeight: 800, color: C.ink }}>📋 This week's prompt for Claude</span>
          <button type="button" className="btn" onClick={copy} style={{ background: copied ? C.green : C.turq, color: "#fff", padding: "7px 14px", borderRadius: 4, fontSize: 13, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}>
            {copied ? <><Check size={14} /> Copied!</> : "Copy"}
          </button>
        </div>
        <p style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.5, margin: "6px 0 8px" }}>
          Paste this into Claude on top of what you already built. Tweak anything in <b>[brackets]</b> to fit your own product before you send. <span style={{ color: C.muted }}>Saved automatically.</span>
        </p>
        <textarea aria-label="This week's prompt" value={promptValue} rows={7} onChange={(e) => setPrompt(e.target.value)}
          style={{ width: "100%", boxSizing: "border-box", fontSize: 12.5, padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: C.ink, resize: "vertical", lineHeight: 1.5 }} />
        {edited !== undefined && edited !== cfg.promptSeed && (
          <div style={{ marginTop: 6 }}>
            <span {...act(() => setPrompt(undefined))} style={{ fontSize: 12, fontWeight: 700, color: C.turq, cursor: "pointer" }}>↺ Reset to the suggested prompt</span>
          </div>
        )}
      </div>
    </>
  );
  return bare ? inner : <Card style={{ padding: 20, marginBottom: 12 }}>{inner}</Card>;
}

function BuildPlan({ s, setS, bare }) {
  const build = s.build || {};
  const setField = (k, v) => setS((p) => ({ ...p, build: { ...(p.build || {}), [k]: v } }));
  const isCustom = build.scenario === "custom";

  const labelStyle = { fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 5 };
  const inputStyle = { width: "100%", boxSizing: "border-box", fontSize: 14, padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper2, fontFamily: "inherit", color: C.ink };
  const PR_PLACEHOLDER = `Announcing [your product] — [one line: what it does and who it helps].
The problem: [what's hard or annoying today].
How it works: [the one magic thing it does].
Why people love it: [the payoff].
"[a happy first user's quote]"`;

  const inner = (
    <>
      <h3 style={{ fontSize: 16, fontWeight: 800, color: C.ink, margin: 0 }}>Your product — start from the customer 🧭</h3>
      <p style={{ fontSize: 13.5, color: C.ink2, lineHeight: 1.55, margin: "6px 0 14px" }}>
        Before you build anything, get clear on <b>who it's for</b> and <b>why</b>. Pick an idea to start from (or write your own), name the pain you're solving, then write a short <b>press release</b> as if it already launched. Writing it first forces the idea to be clear. <span style={{ color: C.muted }}>Saved automatically.</span>
      </p>

      <label style={{ display: "block", marginBottom: 14 }}>
        <span style={labelStyle}>Your idea</span>
        <select aria-label="Choose an idea" value={build.scenario || ""} onChange={(e) => setField("scenario", e.target.value)} style={inputStyle}>
          <option value="">Choose an idea to start from…</option>
          {SCENARIO_GROUPS.map((g) => (
            <optgroup key={g.group} label={g.group}>
              {g.items.map((it) => <option key={it.id} value={it.id}>{it.label}</option>)}
            </optgroup>
          ))}
          <option value="custom">✍️  Write my own</option>
        </select>
      </label>

      {isCustom && (
        <label style={{ display: "block", marginBottom: 14 }}>
          <span style={labelStyle}>My idea (one line)</span>
          <input aria-label="My idea" type="text" value={build.custom || ""} onChange={(e) => setField("custom", e.target.value)} placeholder="e.g., A tool that helps my swim team track their times" style={inputStyle} />
        </label>
      )}

      <label style={{ display: "block", marginBottom: 14 }}>
        <span style={labelStyle}>Customer pain point(s)</span>
        <textarea aria-label="Customer pain points" value={build.pain || ""} onChange={(e) => setField("pain", e.target.value)} rows={3}
          placeholder="Who has this problem, and what's frustrating about it today? (e.g., 'My classmates cram the night before and forget everything — there's no quick way to quiz yourself from your own notes.')"
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
      </label>

      <label style={{ display: "block", marginBottom: 14 }}>
        <span style={labelStyle}>Press release statement</span>
        <textarea aria-label="Press release statement" value={build.pr || ""} onChange={(e) => setField("pr", e.target.value)} rows={6}
          placeholder={PR_PLACEHOLDER}
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
      </label>

      <label style={{ display: "block", marginBottom: 14 }}>
        <span style={labelStyle}>What does product success look like?</span>
        <textarea aria-label="What product success looks like" value={build.productSuccess || ""} onChange={(e) => setField("productSuccess", e.target.value)} rows={3}
          placeholder="How will you know it's working? Who uses it, what do they do with it, and would they miss it if it disappeared?"
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
      </label>

      <label style={{ display: "block" }}>
        <span style={labelStyle}>What does financial success look like for your business?</span>
        <textarea aria-label="What financial success looks like" value={build.financialSuccess || ""} onChange={(e) => setField("financialSuccess", e.target.value)} rows={3}
          placeholder="What would make this a real business — like making more money than it costs, and people coming back to pay again?"
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
      </label>
    </>
  );
  return bare ? inner : <Card style={{ padding: 20, marginBottom: 12 }}>{inner}</Card>;
}

// Week 2 student activity — "Shape the Idea": envision the product, its capabilities, and the
// experience of using it. Persists in s.shape.
function ShapePlan({ s, setS, bare }) {
  const shape = s.shape || {};
  const setField = (k, v) => setS((p) => ({ ...p, shape: { ...(p.shape || {}), [k]: v } }));
  // The build tools (Claude Pro, GitHub, Vercel) are set up ONCE here in Week 2 — before building
  // starts — rather than repeated on every build week. Same s.prereqs state as the Overview.
  const prereqs = (s && s.prereqs) || {};
  const buildTools = PREREQS.filter((p) => p.build);
  const allReady = buildTools.every((p) => prereqs[p.id]);
  const togglePrereq = (id) => setS((p) => ({ ...p, prereqs: { ...(p.prereqs || {}), [id]: !((p.prereqs || {})[id]) } }));
  const labelStyle = { fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 5 };
  const inputStyle = { width: "100%", boxSizing: "border-box", fontSize: 14, padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper2, fontFamily: "inherit", color: C.ink, resize: "vertical", lineHeight: 1.5 };
  const field = (k, label, placeholder, rows = 3) => (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span style={labelStyle}>{label}</span>
      <textarea aria-label={label} value={shape[k] || ""} onChange={(e) => setField(k, e.target.value)} rows={rows} placeholder={placeholder} style={inputStyle} />
    </label>
  );
  const inner = (
    <>
      <h3 style={{ fontSize: 16, fontWeight: 800, color: C.ink, margin: 0 }}>Shape your idea — write the spec ✏️</h3>
      <p style={{ fontSize: 13.5, color: C.ink2, lineHeight: 1.55, margin: "6px 0 14px" }}>
        Your spec is your product, planned out — <b>what you'll build, plus what success looks like</b> so you know what you're aiming for. The more specific and complete you are, the better. <span style={{ color: C.muted }}>Saved automatically.</span>
      </p>
      {field("product", "Week 3 · The core product", "The main thing your product does, who it's for, and the one 'wow' moment. Describe what it is, the key screens and features, and what it's like to use — enough to build the core product you can ship live. (Just the core — no accounts or payments yet.)", 6)}
      {field("accounts", "Week 4 · Accounts & saved data", "Who signs in, and what's saved for each person — what does a user see that's theirs?", 4)}
      {field("payments", "Week 5 · Payments", "What do people pay for, and how much? What's free vs. paid, and what do they get when they pay?", 4)}
      {field("production", "Week 6 · Production-ready", "The finishing layer: what emails go out (welcome, reminders?), how people find and share it, and how you keep users' data safe.", 4)}
      {field("success", "What success looks like", "Take the product + financial success you sketched in Week 1 and make it measurable: what does an 'active' user actually DO, and how often? How many come back (retention)? When would someone tell a friend? And the money — it should earn more than it costs to run.", 5)}

      {/* Build tools — set up ONCE here, before building starts (not repeated each build week). */}
      <div style={{ border: `1px solid ${C.emerald}`, borderRadius: 6, background: "#eef3f0", padding: "12px 14px", marginTop: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 13.5, fontWeight: 800, color: C.ink }}>✅ Set up your tools</span>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: allReady ? C.green : C.turq }}>{allReady ? "All set 🎉" : `${buildTools.filter((p) => prereqs[p.id]).length} of ${buildTools.length} ready`}</span>
        </div>
        <p style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.5, margin: "5px 0 8px" }}>
          Get these ready before you start building (all free except <b>Claude Pro</b>, ~$20/month; a parent can help with sign-ups). Tick each off:
        </p>
        {buildTools.map((p) => {
          const checked = !!prereqs[p.id];
          return (
            <div key={p.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "6px 0" }}>
              <input type="checkbox" aria-label={`Mark "${p.title}" as done`} checked={checked} onChange={() => togglePrereq(p.id)} style={{ width: 17, height: 17, marginTop: 1, flexShrink: 0, accentColor: C.emerald, cursor: "pointer" }} />
              <span style={{ fontSize: 13, lineHeight: 1.45 }}>
                <b {...act(() => togglePrereq(p.id))} style={{ cursor: "pointer", color: checked ? C.muted : C.ink, textDecoration: checked ? "line-through" : "none" }}>{p.title}</b>
                {p.link && <> <a href={p.link} target="_blank" rel="noopener noreferrer" style={{ color: C.emerald, fontWeight: 700, whiteSpace: "nowrap" }}>Open ↗</a></>}
                {p.links && p.links.map((l) => <span key={l.url}> <a href={l.url} target="_blank" rel="noopener noreferrer" style={{ color: C.emerald, fontWeight: 700, whiteSpace: "nowrap" }}>{l.label} ↗</a></span>)}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
  return bare ? inner : <Card style={{ padding: 20, marginBottom: 12 }}>{inner}</Card>;
}

// Week 3 student activity — "Make It (with AI)": hand your Week 2 spec to AI and run the
// describe → see → taste → refine loop. The spec is the SAME data as Week 2 (s.shape) — editing it
// here updates Week 2 too; no separate copy, single source of truth.
// One build week (3–6). Shows ONLY that week's layer prompt, pulled live from the student's Week 2
// spec (s.shape[cfg.key]) so edits here sync back to Week 2. Week 3 also shows the build pre-reqs.
function BuildLayer({ week, s, setS, bare }) {
  const cfg = BUILD_LAYERS[week];
  const setShapeField = (k, v) => setS((p) => ({ ...p, shape: { ...(p.shape || {}), [k]: v } }));
  const prereqs = (s && s.prereqs) || {};
  const buildTools = PREREQS.filter((p) => p.build);
  const allReady = buildTools.every((p) => prereqs[p.id]);
  const togglePrereq = (id) => setS((p) => ({ ...p, prereqs: { ...(p.prereqs || {}), [id]: !((p.prereqs || {})[id]) } }));

  const shape = s.shape || {};
  const [copied, setCopied] = useState(false);
  const has = (v) => v && v.trim();
  // Weeks 3–6 pull from the Week 2 product spec (s.shape[key]). Weeks 7–10 are seeded GROWTH
  // prompts (added after launch, not part of the product spec), stored per-week in s.grow[week].
  const fromSpec = !!cfg.key;
  const grow = s.grow && s.grow[week];
  // Weeks 3–6: from the Week 2 spec. Weeks 7–10: the student's own adaptation (starts empty — the
  // seed is shown above as the class-material sample, and the prompt falls back to it if left blank).
  const value = fromSpec ? shape[cfg.key] : (grow !== undefined ? grow : "");
  const hasLayer = has(value);
  const onChangeLayer = (v) => (fromSpec
    ? setS((p) => ({ ...p, shape: { ...(p.shape || {}), [cfg.key]: v } }))
    : setS((p) => ({ ...p, grow: { ...(p.grow || {}), [week]: v } })));
  // The ready-to-paste prompt for THIS week's layer, assembled live from the field below.
  const generatedPrompt = [
    cfg.intro, "", cfg.promptLabel,
    hasLayer ? value.trim() : (fromSpec ? cfg.placeholder : cfg.seed),
    "", cfg.instruction,
  ].join("\n");
  const copyPrompt = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(generatedPrompt); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    } catch { /* clipboard blocked — the textarea is selectable as a fallback */ }
  };
  const lab = { fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".04em", display: "block", marginBottom: 4 };
  const fieldS = { width: "100%", boxSizing: "border-box", fontSize: 13, padding: "9px 11px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper2, fontFamily: "inherit", color: C.ink, resize: "vertical", lineHeight: 1.5 };

  const inner = (
    <>
      <p style={{ fontSize: 13.5, color: C.ink2, lineHeight: 1.55, margin: "0 0 14px" }}>
        {cfg.lead} You direct; AI writes the code — your job is <b>taste</b>: knowing what <b>good</b> looks like and asking for it until you get there. <span style={{ color: C.muted }}>Saved automatically.</span>
      </p>

      {/* Pre-reqs (Week 3 only): the build tools must be ready before the first build. Same
          s.prereqs state as the Overview checklist, so ticking here syncs there. */}
      {cfg.prereqs && (
        <div style={{ border: `1px solid ${C.emerald}`, borderRadius: 6, background: "#eef3f0", padding: "12px 14px", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 13.5, fontWeight: 800, color: C.ink }}>✅ Pre-reqs — you'll need these for this week's build</span>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: allReady ? C.green : C.turq }}>{allReady ? "All set 🎉" : `${buildTools.filter((p) => prereqs[p.id]).length} of ${buildTools.length} ready`}</span>
          </div>
          <p style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.5, margin: "5px 0 8px" }}>
            You'll build live with AI this week, so you need the builder's tools ready (all free except <b>Claude Pro</b>, ~$20/month; a parent can help with sign-ups). Tick each off:
          </p>
          {buildTools.map((p) => {
            const checked = !!prereqs[p.id];
            return (
              <div key={p.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "6px 0" }}>
                <input type="checkbox" aria-label={`Mark "${p.title}" as done`} checked={checked} onChange={() => togglePrereq(p.id)} style={{ width: 17, height: 17, marginTop: 1, flexShrink: 0, accentColor: C.emerald, cursor: "pointer" }} />
                <span style={{ fontSize: 13, lineHeight: 1.45 }}>
                  <b {...act(() => togglePrereq(p.id))} style={{ cursor: "pointer", color: checked ? C.muted : C.ink, textDecoration: checked ? "line-through" : "none" }}>{p.title}</b>
                  {p.link && <> <a href={p.link} target="_blank" rel="noopener noreferrer" style={{ color: C.emerald, fontWeight: 700, whiteSpace: "nowrap" }}>Open ↗</a></>}
                  {p.links && p.links.map((l) => <span key={l.url}> <a href={l.url} target="_blank" rel="noopener noreferrer" style={{ color: C.emerald, fontWeight: 700, whiteSpace: "nowrap" }}>{l.label} ↗</a></span>)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* This week's prompt — the matching slice of the Week 2 spec (s.shape[cfg.key]). Editing here
          syncs back to Week 2. Copy hands Claude this layer's prompt (the spec slice + instruction). */}
      <div style={{ border: `1px solid ${C.turq}`, borderRadius: 6, background: "#eef6f6", padding: "12px 14px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13.5, fontWeight: 800, color: C.ink }}>📋 This week's prompt — {cfg.fieldLabel}</span>
          <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            <button type="button" className="btn" onClick={copyPrompt} style={{ background: copied ? C.green : C.turq, color: "#fff", padding: "7px 14px", borderRadius: 4, fontSize: 13, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}>
              {copied ? <><Check size={14} /> Copied!</> : "Copy"}
            </button>
            <a href="https://claude.ai/code" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, fontWeight: 700, color: C.emerald, textDecoration: "none", whiteSpace: "nowrap" }}>Open Claude Code ↗</a>
          </span>
        </div>
        {fromSpec ? (hasLayer ? (
          <div style={{ fontSize: 11.5, fontWeight: 800, color: C.green, marginTop: 6, display: "inline-flex", alignItems: "center", gap: 5 }}><Check size={13} /> Pulled from your Week 2 spec — edits here update Week 2 too</div>
        ) : (
          <div style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.5, marginTop: 8, background: "#fbeede", border: `1px solid ${C.goldLite}`, borderRadius: 5, padding: "9px 11px" }}>
            <b>This part of your Week 2 spec is empty.</b> Fill it in below (or back in Week 2) so AI builds <i>your</i> product — it's the same spec.
          </div>
        )) : (
          <div style={{ fontSize: 11.5, fontWeight: 800, color: C.turq, marginTop: 6, display: "inline-flex", alignItems: "center", gap: 5 }}><Sparkles size={13} /> Make the sample above your own</div>
        )}
        <p style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.5, margin: "8px 0 2px" }}>
          {!fromSpec
            ? "Adapt the sample above to your product here, then Copy it into Claude Code on top of your existing app. (Leave it blank and Copy still sends the sample.)"
            : week === 3
              ? "This IS your prompt — no separate writing. Edit it and it updates your Week 2 spec too, then Copy it into Claude Code."
              : "This builds on top of what you already shipped. Edit it (it syncs to Week 2), then Copy it into Claude Code on top of your existing app."}
        </p>
        <label style={{ display: "block", marginTop: 10 }}>
          <span style={lab}>{cfg.fieldLabel}</span>
          <textarea aria-label={cfg.fieldLabel} value={value || ""} onChange={(e) => onChangeLayer(e.target.value)} rows={6} placeholder={cfg.placeholder || "Adapt the sample above to your own product…"} style={fieldS} />
        </label>
        {/* read-only preview of exactly what Copy hands to Claude */}
        <details style={{ marginTop: 12 }}>
          <summary style={{ fontSize: 12, fontWeight: 700, color: C.turq, cursor: "pointer" }}>Preview the full prompt Copy sends →</summary>
          <textarea readOnly aria-label="Full prompt preview" value={generatedPrompt} rows={8} onFocus={(e) => e.target.select()}
            style={{ width: "100%", boxSizing: "border-box", marginTop: 8, fontSize: 12, padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: C.ink2, resize: "vertical", lineHeight: 1.5 }} />
        </details>
      </div>
    </>
  );
  return bare ? inner : <Card style={{ padding: 20, marginBottom: 12 }}>{inner}</Card>;
}

// Capstone "share your build" capture — link to the live product + a bit of feedback we can use as
// a testimonial. Gated by CONFIG.showcaseEnabled (founder toggle). Opt-in with explicit consent;
// because students are minors, the founder confirms parental consent before any public use.
function ShowcaseCapture({ s }) {
  const [link, setLink] = useState("");
  const [feedback, setFeedback] = useState("");
  const [consent, setConsent] = useState(false);
  const [claimingPrize, setClaimingPrize] = useState(false); // first-year builder prize
  const [videoLink, setVideoLink] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | done
  const canSend = (link.trim() || feedback.trim() || videoLink.trim()) && status !== "sending";
  const submit = async () => {
    if (!canSend) return;
    setStatus("sending");
    const r = await postJson("/api/funnel?resource=showcase", {
      link: link.trim(), feedback: feedback.trim(), consent,
      videoLink: videoLink.trim(), claimingPrize,
      name: (s.student && s.student.name) || "", batchId: (s.student && s.student.batch) || "",
    });
    setStatus(r.ok ? "done" : "idle");
  };
  const labelStyle = { fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 5 };
  const inputStyle = { width: "100%", boxSizing: "border-box", fontSize: 14, padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper2, fontFamily: "inherit", color: C.ink, lineHeight: 1.5 };
  return (
    <div style={{ marginTop: 16, border: `1px solid ${C.turq}`, borderRadius: 6, background: "#eef6f6", padding: "14px 16px" }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>🌟 Share what you made</div>
      {status === "done" ? (
        <p style={{ fontSize: 13.5, color: C.ink2, lineHeight: 1.55, marginTop: 8 }}>
          <Check size={16} color={C.green} style={{ verticalAlign: "-3px", marginRight: 6 }} />
          Thank you — Sunil will take a look. We'd love to feature it!
        </p>
      ) : (
        <>
          <p style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.5, margin: "6px 0 12px" }}>
            You did the whole journey — built something real and learned to manage what it earns. Share your product and a line about how it went; with your OK, we'd love to feature it as a testimonial.
          </p>
          <label style={{ display: "block", marginBottom: 12 }}>
            <span style={labelStyle}>Your product's link</span>
            <input type="url" aria-label="Your build's link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://your-app.vercel.app" style={inputStyle} />
          </label>
          <label style={{ display: "block", marginBottom: 12 }}>
            <span style={labelStyle}>How was Build Young for you?</span>
            <textarea aria-label="Your feedback" value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={4} placeholder="What did you build, what did you learn, and how did it feel to ship something real?" style={{ ...inputStyle, resize: "vertical" }} />
          </label>
          {/* First-year builder prize claim */}
          <div style={{ border: `1px solid ${C.green}`, borderRadius: 6, background: "#eef3f0", padding: "10px 12px", marginBottom: 12 }}>
            <label style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 12.5, color: C.ink2, lineHeight: 1.45, cursor: "pointer" }}>
              <input type="checkbox" aria-label="Claim the builder prize" checked={claimingPrize} onChange={(e) => setClaimingPrize(e.target.checked)} style={{ width: 16, height: 16, marginTop: 1, flexShrink: 0, accentColor: C.green, cursor: "pointer" }} />
              <span><Award size={13} color={C.green} style={{ verticalAlign: "-2px", marginRight: 3 }} /><b>I landed a real paying customer</b> — I'm claiming the builder prize (tuition back).</span>
            </label>
            {claimingPrize && (
              <div style={{ marginTop: 10 }}>
                <label style={{ display: "block" }}>
                  <span style={labelStyle}>Your 2-minute video link</span>
                  <input type="url" aria-label="Your video link" value={videoLink} onChange={(e) => setVideoLink(e.target.value)} placeholder="YouTube / Loom / Drive link" style={inputStyle} />
                </label>
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, marginTop: 8 }}>
                  Sunil will verify your <b>real sale</b> (have your payment receipt ready) and check it's first in your cohort. A parent's OK is needed to use your video.
                </div>
              </div>
            )}
          </div>
          <label style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 12.5, color: C.ink2, lineHeight: 1.45, marginBottom: 12, cursor: "pointer" }}>
            <input type="checkbox" aria-label="Consent to feature" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ width: 16, height: 16, marginTop: 1, flexShrink: 0, accentColor: C.emerald, cursor: "pointer" }} />
            <span>Build Young may feature my product{claimingPrize ? ", video," : ""} and first name on their site. <b>I've checked with my parent/guardian.</b></span>
          </label>
          <button className="btn" onClick={submit} disabled={!canSend} style={{ background: canSend ? C.turq : C.line, color: "#fff", padding: "10px 18px", borderRadius: 4, fontSize: 14, fontWeight: 700, cursor: canSend ? "pointer" : "not-allowed" }}>
            {status === "sending" ? "Sending…" : (claimingPrize ? "Submit my entry" : "Share my product")}
          </button>
        </>
      )}
    </div>
  );
}

/* ============================ PLATFORM ============================ */
function Platform({ state, setState, onExit, onFounder, onHome }) {
  const BATCHES = useCohorts(); // live catalog
  const isFounder = !!onFounder; // a founder viewing the dashboard (for course-authoring preview)
  // Default to Overview until the course has begun (first session attended), so early enrollees
  // land on the welcome/plan rather than a misleading live "Week 1".
  const [tab, setTab] = useState(state && state.started ? "dash" : "overview");
  const [toast, setToast] = useState(null);
  const [withdraw, setWithdraw] = useState(false); // false | 'confirm' | 'done'
  const [reason, setReason] = useState("");        // preset cancel-reason value (required to confirm)
  const [reasonNote, setReasonNote] = useState(""); // optional free-text note (goes to the founder email only)
  const closeWithdraw = () => { setWithdraw(false); setReason(""); setReasonNote(""); };
  const ping = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3600); };
  const s = state;
  const batch = BATCHES.find((b) => b.id === s.student.batch) || BATCHES[0];
  const startInfo = cohortStartInfo(batch);
  const notStarted = !s.started; // before the first session → full refund
  const canWithdraw = canWithdrawNow(s); // pre-start, or within the first REFUND_WEEKS weeks
  // `week` increments on each advance (attending session 1 moves you to "Week 2"), so sessions
  // actually held = week − 1 once started. Refund covers every session NOT yet held — matching
  // the Terms ("the fraction of sessions not yet held").
  const attended = notStarted ? 0 : s.week - 1;
  const unheld = 12 - attended;
  const refund = refundFor(batch, s.started, s.week);
  // Confirm a withdrawal: email the refund/cancellation confirmation (once — a ref guards
  // against a double-click), drop it in the in-app inbox, and show the done state. The send is
  // a side effect, so it lives OUTSIDE the setState updater (updaters must stay pure).
  const withdrawingRef = useRef(false);
  const doWithdraw = () => {
    if (withdrawingRef.current || !canWithdrawNow(s) || !reason) return; // need a reason; window open
    withdrawingRef.current = true;
    // Human-readable reason for the founder's email: the preset label + any free-text note.
    const note = reasonNote.trim();
    const reasonText = cancelReasonLabel(reason) + (note ? ` — ${note}` : "");
    const mail = withdrawalEmail(s, batch, refund, notStarted, reasonText);
    sendEmail(s.student.email, mail.subject, mail.body);
    // Funnel: exit branch, tagged with the refund tier + the PRESET reason (aggregate; the
    // free-text note is intentionally NOT sent to analytics).
    track("withdrawn", {
      season: batch.season, track: batch.track, batchId: batch.id,
      refundTier: notStarted ? "full" : "prorated", refundCents: Math.round(refund * 100),
      week: s.week, stage: notStarted ? "before_start" : "in_progress", reason,
    });
    setState((p) => ({ ...p, emails: [mail, ...(p.emails || [])] }));
    setWithdraw("done");
  };
  const nw = netWorth(s);
  // compare to the PREVIOUS recorded period (the latest entry is the current one)
  const last = s.history.length > 1 ? s.history[s.history.length - 2].nw : 0;
  const wk = WEEKS[s.week - 1];

  // Completion certificate (auth mode): minted + emailed server-side on graduation. Once the
  // student has finished the 12 weeks (in the check-in phase), fetch it for the dashboard card.
  // The mint can lag the graduating state-save slightly, so retry a few times.
  const graduated = s.phase !== "course" || s.done;
  const [cert, setCert] = useState(null);
  useEffect(() => {
    if (!CONFIG.authEnabled || !graduated) return;
    let live = true, tries = 0;
    const tryFetch = async () => {
      const c = await AUTH.getCert();
      if (!live) return;
      if (c) { setCert(c); return; }
      if (tries++ < 4) setTimeout(tryFetch, 1500);
    };
    tryFetch();
    return () => { live = false; };
  }, [graduated]);

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
    // 12 weeks flat: weeks 1→12, then finishing Week 12 graduates you (no separate check-in).
    // No pre-class media drip when finishing (no next week to prep for).
    const nextEvent = s.week < 12 ? await fetchMarketEvent("course", s.week + 1, 0) : null;
    const nextMedia = nextEvent && nextEvent.media ? nextEvent.media : null;
    const macroForAdvance = macroNow; // snapshot the event applied to THIS advance

    let toSend = [];
    setState((p) => {
      let ns = advance(p, macroForAdvance);
      ns.started = true; // first session attended — class has begun
      const mail = followupEmail(ns, ns.week, batch);
      if (mail) ns.emails = [mail, ...(ns.emails || [])];
      if (ns.week >= 12) { ns.week = 12; ns.done = true; } // finishing Week 12 = graduated
      else ns.week += 1;
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
    // Funnel: this advance is the first session (class started), a weekly step, or the graduation
    // transition (finishing Week 12). `s` is the pre-advance snapshot.
    const fmeta = { season: batch.season, track: batch.track, batchId: batch.id };
    if (!s.started) track("class_started", fmeta);
    if (s.week >= 12) track("graduated", fmeta);
    else track("week_advanced", { ...fmeta, week: s.week + 1 });
    const gotMedia = toSend.some((m) => m.type === "media");
    const base = s.week >= 12 ? `Course-complete email sent to ${who}` : `Week ${s.week} recap sent to ${who}`;
    ping(gotMedia ? `${base} (plus a 3-day market-news drip)` : base);
    setTab("dash");
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: Sparkles },
    { id: "course", label: "Course progress", icon: GraduationCap },
    { id: "port", label: "Portfolio", icon: PiggyBank },
    { id: "macro", label: "Markets", icon: Newspaper },
    { id: "dash", label: "Dashboard", icon: LineIcon },
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
                    : <>You've attended {attended} of 12 sessions. You'll receive a prorated refund of <b>{fmt(refund)}</b> for the {unheld} sessions not yet held. Refunds are available only through the {REFUND_WINDOW}, so this can't be reversed.</>}
                </p>
                <label style={{ display: "block", marginTop: 16 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.ink2, display: "block", marginBottom: 5 }}>Reason for cancelling <span style={{ color: C.rust }}>*</span></span>
                  <select aria-label="Reason for cancelling" value={reason} onChange={(e) => setReason(e.target.value)} style={{ width: "100%", boxSizing: "border-box", fontSize: 14, padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper2, fontFamily: "inherit", color: C.ink }}>
                    <option value="">Choose a reason…</option>
                    {CANCEL_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </label>
                <label style={{ display: "block", marginTop: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.ink2, display: "block", marginBottom: 5 }}>Anything else? <span style={{ color: C.muted, fontWeight: 500 }}>(optional — helps us improve)</span></span>
                  <textarea aria-label="Anything else about why you're cancelling" value={reasonNote} onChange={(e) => setReasonNote(e.target.value)} rows={2} placeholder="Tell Sunil what would have made it a better fit…" style={{ width: "100%", boxSizing: "border-box", fontSize: 14, padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper2, fontFamily: "inherit", color: C.ink, resize: "vertical", lineHeight: 1.5 }} />
                </label>
                <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                  <button className="btn" onClick={closeWithdraw} style={{ flex: 1, background: C.paper2, color: C.ink, border: `1px solid ${C.line}`, padding: 12, borderRadius: 4, fontSize: 14 }}>Never mind</button>
                  <button className="btn" disabled={!reason} onClick={doWithdraw} style={{ flex: 1, background: reason ? C.rust : C.line, color: "#fff", padding: 12, borderRadius: 4, fontSize: 14, cursor: reason ? "pointer" : "not-allowed" }}>Confirm withdrawal</button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 56, height: 56, borderRadius: 4, background: C.emerald, display: "grid", placeItems: "center", margin: "4px auto 14px" }}><Check size={28} color="#fff" /></div>
                <div className="disp" style={{ fontSize: 20, fontWeight: 800 }}>Withdrawal complete</div>
                <p style={{ color: C.ink2, fontSize: 14, lineHeight: 1.55, marginTop: 8 }}>A {notStarted ? "full" : "prorated"} refund of <b>{fmt(refund)}</b> has been issued to {s.student.email} <span style={{ color: C.muted }}>(demo)</span>, and a confirmation email is on its way. We're sorry to see you go.</p>
                <button className="btn" onClick={onExit} style={{ width: "100%", marginTop: 18, background: C.ink, color: C.paper2, padding: 12, borderRadius: 4, fontSize: 14 }}>Return home</button>
              </div>
            )}
          </Card>
        </div>
      )}
      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div className="disp" {...act(() => onHome && onHome())} aria-label="Build Young — home" style={{ fontWeight: 900, fontSize: 20, cursor: "pointer" }}><Mark size={22} /> Build Young</div>
          <div style={{ fontSize: 13, color: C.muted }}>{s.student.name} · <span style={{ color: C.emerald, fontWeight: 600 }}>let's build something real</span></div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Pill bg={C.turq}>{s.done ? "Graduated"
            : (s.started || !startInfo.beforeStart ? `Week ${s.week} of 12` : `Starts ${startInfo.shortDate}`)}</Pill>
          {onFounder && <button className="btn" onClick={onFounder} style={{ background: "transparent", border: `1.5px solid ${C.turq}`, color: C.turq, padding: "7px 12px", borderRadius: 4, fontSize: 13, fontWeight: 700 }}>Admin</button>}
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

      {tab === "overview" && <OverviewPanel s={s} batch={batch} onTab={setTab} setS={setState} />}

      {tab === "dash" && (
        <div className="rise">
          {cert && <CertificateCard cert={cert} />}
          <Card style={{ padding: 18, marginBottom: 12, background: C.ink, border: "none", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 4, background: "rgba(255,255,255,.12)", display: "grid", placeItems: "center" }}><Video size={20} color="#fff" /></div>
              <div>
                <div style={{ fontSize: 11, color: C.goldLite, fontWeight: 700, letterSpacing: ".06em" }}>NEXT LIVE CLASS · {batch.track.toUpperCase()}</div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{nextClassLabel(batch, s.phase, s.week)}</div>
                <div style={{ color: "rgba(255,255,255,.6)", fontSize: 12.5 }}>Same Zoom link for every class</div>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
              <div style={{ fontWeight: 700 }}>Course progress</div>
              <div style={{ fontSize: 13, color: C.muted }}>{s.done ? "Complete 🎓" : `Week ${s.week} of 12`}</div>
            </div>
            <div style={{ height: 8, background: C.paper2, borderRadius: 999, marginTop: 12, overflow: "hidden" }}>
              <div style={{ width: `${Math.round(((s.phase === "course" ? s.week : 12) / 12) * 100)}%`, height: "100%", background: C.emerald, borderRadius: 999 }} />
            </div>
            {!s.done && (
              <div style={{ fontSize: 12.5, color: C.muted, marginTop: 10 }}>
                <span {...act(() => setTab("course"))} style={{ color: C.emerald, fontWeight: 700, cursor: "pointer" }}>Open this week's activity →</span>
              </div>
            )}
            {!s.done && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
                <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>
                  Done with this week's class &amp; activity? Advance the simulation to collect your income and apply any market move.
                </div>
                <AdvanceButton s={s} onAdvance={doAdvance} />
              </div>
            )}
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
                  ? <>Changed your mind before the first class? Cancel any time before your cohort starts on <b style={{ color: C.ink }}>{classDateLabel(batch, 1)}</b> for a <b style={{ color: C.ink }}>full refund of {fmt(refund)}</b> — no questions asked.</>
                  : <>Changed your mind? You can withdraw for a <b style={{ color: C.ink }}>prorated refund</b> through the end of the {REFUND_WINDOW} — up until your Week {REFUND_WEEKS + 1} session on <b style={{ color: C.ink }}>{classDateLabel(batch, REFUND_WEEKS + 1)}</b>. You'd get back <b style={{ color: C.ink }}>{fmt(refund)}</b> for the {unheld} sessions you haven't attended.</>}
              </div>
              <button className="btn" onClick={() => setWithdraw("confirm")} style={{ background: "transparent", border: `1px solid ${C.line}`, color: C.muted, padding: "9px 14px", borderRadius: 4, fontSize: 13 }}>{notStarted ? "Cancel enrollment" : "Withdraw"}</button>
            </Card>
          )}
          {!canWithdraw && s.started && s.phase === "course" && s.week > REFUND_WEEKS && (
            <Card style={{ padding: 14, marginTop: 14 }}>
              <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>
                The refund window closed at the end of the {REFUND_WINDOW}. Past that point, tuition is non-refundable — but you keep full access through all 12 weeks and the follow-up check-in.
              </div>
            </Card>
          )}
        </div>
      )}
      {tab === "course" && (
        /* Course progress: a horizontal week stepper with the selected week's activity below
           (Zoom + advance live inside the current week — no separate panel). */
        <CoursePanel s={s} setState={setState} batch={batch} onAdvance={doAdvance} macroNow={macroNow} cert={cert} isFounder={isFounder} />
      )}
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
      <div style={{ textAlign: "center", fontSize: 12.5, color: C.muted, padding: "30px 16px 8px", lineHeight: 1.6 }}>
        Questions about the program or your account? Email <a href={`mailto:${CONFIG.contactEmail}`} style={{ color: C.emerald, fontWeight: 600 }}>{CONFIG.contactEmail}</a> — we're happy to help.
      </div>
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

/* ---- Course progress: a horizontal week stepper + the selected week's activity below ---- */
// Per-week notes — a sticky right-rail textarea the student can jot in while reading any week.
// Keyed by week in s.notes; persists with the rest of the sim state (server-side in auth mode).
function WeekNotes({ week, s, setState }) {
  const notes = (s.notes && s.notes[String(week)]) || "";
  const set = (v) => setState((p) => ({ ...p, notes: { ...(p.notes || {}), [String(week)]: v } }));
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
        <BookOpen size={15} color={C.emerald} />
        <span style={{ fontSize: 13.5, fontWeight: 800, color: C.ink }}>Your notes · Week {week}</span>
      </div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>Jot anything from class — saved automatically, private to you.</div>
      <textarea aria-label={`Your notes for week ${week}`} value={notes} onChange={(e) => set(e.target.value)} rows={14}
        placeholder="Type your notes here…"
        style={{ width: "100%", boxSizing: "border-box", fontSize: 13.5, padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper2, fontFamily: "inherit", color: C.ink, resize: "vertical", lineHeight: 1.5 }} />
    </Card>
  );
}

function CoursePanel({ s, setState, batch, onAdvance, macroNow, cert, isFounder }) {
  // Preview (every week open + each shows its full activity) is for the FOUNDER only, for course
  // authoring — students always get normal gating (only Week 1 open on signup; later weeks unlock
  // as they advance).
  const previewAll = CONFIG.previewAllWeeks && isFounder;
  const offCourse = s.phase !== "course"; // in check-ins / graduated, the 12 weeks are all done
  const currentWeek = offCourse ? 12 : s.week;
  const [selected, setSelected] = useState(currentWeek); // which week's content is shown below

  // The per-week market-event resources are server-only (the schedule isn't in the bundle).
  // Fetch them for UNLOCKED weeks only (current + past — never future), one /api/market-event
  // call per week, cached by week number. Offline/demo: fetch returns null → no resources
  // shown (the class materials still render). This only ever surfaces past/current weeks, so
  // it reveals nothing the student isn't already entitled to.
  const [weekRes, setWeekRes] = useState({}); // { [week]: resources[] }
  const unlockedThrough = previewAll ? 12 : (offCourse ? 12 : currentWeek);
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

  // The selected week's content.
  const selW = WEEKS[selected - 1];
  const selUnlocked = previewAll || offCourse || selected <= currentWeek;
  const isThisWeek = selected === currentWeek; // the live week (the final week, once off-course)
  const selStatus = !selUnlocked ? "Upcoming" : (isThisWeek && !offCourse ? "This week" : "Completed");
  const selStatusColor = selStatus === "This week" ? C.emerald : selStatus === "Completed" ? C.turq : C.muted;
  const selResources = selUnlocked ? (weekRes[selected] || []) : [];
  const selMaterials = selUnlocked ? (selW.materials || []) : [];
  const selParked = selUnlocked ? (selW.parked || []) : [];
  const secLabel = { fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: ".05em", textTransform: "uppercase", marginBottom: 8 };
  const pillWrap = { display: "flex", flexWrap: "wrap", gap: 8 };

  // One week "step" in the horizontal stepper.
  const step = (week) => {
    const w = WEEKS[week - 1];
    const unlocked = previewAll || offCourse || week <= currentWeek;
    const isSel = week === selected;
    const isCur = week === currentWeek && !offCourse;
    const bg = !unlocked ? C.paper2 : isCur ? C.emerald : C.green; // done = green, this week = blue (easy to tell apart)
    const fg = unlocked ? "#fff" : C.muted;
    return (
      <button key={week} type="button" className="tab" aria-label={`Week ${week}${unlocked ? "" : " (locked)"}`} aria-current={isSel ? "true" : undefined}
        title={unlocked ? w.t : `Week ${week} — locked`} onClick={() => setSelected(week)}
        style={{ flex: "0 0 auto", width: 38, height: 38, borderRadius: 999, background: bg, color: fg, fontWeight: 800, fontSize: 14, cursor: "pointer", display: "grid", placeItems: "center", boxShadow: isSel ? `0 0 0 3px ${C.ink}` : "none", border: "none" }}>
        {unlocked ? week : <Lock size={13} />}
      </button>
    );
  };

  // Catch-up view for a PAST (unlocked, non-current) week: materials + the market-event resources.
  const catchUp = (
    <Card style={{ padding: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: selStatusColor, letterSpacing: ".04em" }}>WEEK {selected} · {selStatus.toUpperCase()}</div>
          <div className="disp" style={{ fontSize: 22, fontWeight: 800, marginTop: 2 }}>{selW.t}</div>
        </div>
        {batch && (() => {
          // Use this week's class recording when the founder has posted one; otherwise the live link.
          const rec = batch.recordings && batch.recordings[String(selected)];
          return (
            <a href={rec || batch.zoom} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", flexShrink: 0 }}>
              <button className="btn" style={{ background: C.emeraldLite, color: "#fff", padding: "9px 14px", borderRadius: 4, fontSize: 13.5, display: "flex", alignItems: "center", gap: 7 }}><Video size={15} /> {rec ? "Watch recording" : "Rewatch on Zoom"}</button>
            </a>
          );
        })()}
      </div>
      <div style={{ fontSize: 14, color: C.ink2, lineHeight: 1.55, margin: "10px 0 16px" }}>{selW.s}</div>
      {/* Class material first (consistent with the live week panel), then the student's own work. */}
      <div style={secLabel}>Class materials</div>
      {weekExample(selected) ? (
        weekExample(selected)
      ) : selMaterials.length ? (
        <div style={pillWrap}>{selMaterials.map((r, j) => <ResLink key={j} r={r} icon={BookOpen} />)}</div>
      ) : (
        <div style={{ fontSize: 12.5, color: C.muted, fontStyle: "italic" }}>Lesson materials coming soon.</div>
      )}
      {selResources.length > 0 && (<>
        <div style={{ ...secLabel, marginTop: 16 }}>This week's market event — research it</div>
        <div style={pillWrap}>{selResources.map((r, j) => <ResLink key={j} r={r} icon={Newspaper} />)}</div>
      </>)}
      {/* What the student completed this week (the week's own activity — still editable). */}
      {weekActivity(selected, s, setState, true) && (
        <div style={{ marginTop: 18, paddingTop: 18, borderTop: `1px solid ${C.line}` }}>
          <div style={secLabel}>What you worked on — edit any time</div>
          <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5, margin: "0 0 12px" }}>Even though this class is done, your work here is <b>meant to evolve as you build</b> — come back and tweak it whenever your thinking changes.</div>
          {weekActivity(selected, s, setState, true)}
        </div>
      )}
      {selParked.length > 0 && (
        <div style={{ marginTop: 16, padding: 14, background: C.paper, borderRadius: 4, border: `1px dashed ${C.line}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: ".05em", textTransform: "uppercase", marginBottom: 4 }}>More money topics — coming soon</div>
          <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5, marginBottom: 10 }}>We also cover these in the program. Where they land in the schedule is being finalized — here's a preview and some resources to get a head start.</div>
          <div style={{ display: "grid", gap: 10 }}>
            {selParked.map((pt, j) => (
              <div key={j}>
                <div className="disp" style={{ fontWeight: 700, fontSize: 14 }}>{pt.t}</div>
                <div style={{ fontSize: 12.5, color: C.muted, margin: "2px 0 6px", lineHeight: 1.4 }}>{pt.d}</div>
                {pt.materials && pt.materials.length > 0 && (
                  <div style={pillWrap}>{pt.materials.map((r, k) => <ResLink key={k} r={r} icon={BookOpen} />)}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );

  return (
    <div className="rise">
      <Card style={{ padding: 20, marginBottom: 12 }}>
        <div className="disp" style={{ fontSize: 20, fontWeight: 800 }}>Your course, week by week</div>
        <div style={{ fontSize: 13.5, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>Tap any week you've reached to see its activity, materials, and resources. Weeks unlock as you get there.</div>
        <div style={{ display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap", marginTop: 14 }}>
          {WEEKS.map((w, i) => step(i + 1))}
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 12, fontSize: 11.5, color: C.muted }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><i style={{ width: 10, height: 10, borderRadius: 999, background: C.green, display: "inline-block" }} /> Done</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><i style={{ width: 10, height: 10, borderRadius: 999, background: C.emerald, display: "inline-block" }} /> This week</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Lock size={11} /> Upcoming</span>
        </div>
      </Card>

      {previewAll && (
        <div style={{ fontSize: 12, color: C.gold, fontWeight: 700, margin: "0 2px 8px" }}>Preview mode — every week is open for authoring (set CONFIG.previewAllWeeks false to lock).</div>
      )}

      {/* selected week, full width. Preview: render the SELECTED week's activity (so any week can
          be authored). Normal: the live week shows the activity (+ Zoom + advance); past weeks a
          catch-up; locked weeks stay hidden (no spoilers). */}
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 460px", minWidth: 0 }}>
          {previewAll ? (
            <WeekPanel s={{ ...s, week: selected, phase: "course", started: true }} setState={setState} macroNow={macroNow} onAdvance={onAdvance} batch={batch} cert={cert} preview />
          ) : !selUnlocked ? (
            <Card style={{ padding: 22 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: ".04em" }}>WEEK {selected} · UPCOMING</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5, color: C.muted, background: C.paper, borderRadius: 4, padding: "12px 14px", marginTop: 12 }}>
                <Lock size={15} style={{ flexShrink: 0 }} /> Unlocks when you reach Week {selected}. No spoilers — keep your focus on where you are now.
              </div>
            </Card>
          ) : isThisWeek ? (
            <WeekPanel s={s} setState={setState} macroNow={macroNow} onAdvance={onAdvance} batch={batch} cert={cert} />
          ) : catchUp}
        </div>

        {/* Per-week notes — a sticky rail on the right so you can jot while reading any week. */}
        {(previewAll || selUnlocked) && (
          <div style={{ flex: "0 1 300px", minWidth: 0, alignSelf: "flex-start", position: "sticky", top: 16 }}>
            <WeekNotes week={selected} s={s} setState={setState} />
          </div>
        )}
      </div>
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
    { l: "Retirement (self-directed)", v: s.retirement, c: C.emerald },
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
function WeekPanel({ s, setState, macroNow, onAdvance, batch, cert, preview }) {
  const wk = WEEKS[s.week - 1];
  const action = s.phase === "course" ? wk.action : "checkin";
  const set = (fn) => setState((p) => { const ns = JSON.parse(JSON.stringify(p)); fn(ns); return ns; });

  // Header matches the catch-up card for past weeks (status label + title on the left, the Zoom
  // button on the right) so the CURRENT week aligns visually with Weeks 1–2 — no separate banner.
  const Wrap = ({ children, title, blurb }) => (
    <Card style={{ padding: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.emerald, letterSpacing: ".04em" }}>{s.phase === "course" ? `WEEK ${s.week} · THIS WEEK` : "CHECK-IN"}</div>
          <div className="disp" style={{ fontSize: 22, fontWeight: 800, marginTop: 2 }}>{title}</div>
        </div>
        {batch && (
          <a href={batch.zoom} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", flexShrink: 0 }}>
            <button className="btn" style={{ background: C.emeraldLite, color: "#fff", padding: "9px 14px", borderRadius: 4, fontSize: 13.5, display: "flex", alignItems: "center", gap: 7 }}><Video size={15} /> Join on Zoom</button>
          </a>
        )}
      </div>
      <div style={{ color: C.ink2, fontSize: 14, margin: "10px 0 16px", lineHeight: 1.55 }}>{blurb}</div>
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
      {action === "settings" && (
        <Wrap title="Set Up Your Business Finances" blurb={`Your product is earning now — about ${fmt(STEADY_INCOME)} a period. You're self-employed, so there's no employer and no W-4: a flat 15% goes to taxes, and YOU choose how much to pay your future self. These become your standing settings for the rest of the course.`}>
          {sliderRow("Pay yourself first (retirement)", s.settings.retire401k, (v) => set((n) => n.settings.retire401k = v), 0, 0.1, 0.01)}
          <div style={{ background: C.paper, borderRadius: 4, padding: 12, fontSize: 13, color: C.ink2 }}>
            On {fmt(STEADY_INCOME)} of business income: ~{fmt(STEADY_INCOME * s.settings.retire401k)} set aside for your future (a SEP/solo retirement account). No employer match when you work for yourself — but no boss taking a cut either.
          </div>
        </Wrap>
      )}

      {(action === "allocation" || action === "money") && (
        <Wrap title="Savings & Investing" blurb="Decide how much of your income flows automatically into savings and your brokerage, and pick an investing style. Starting now means decades of compounding.">
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

      {(action === "buy" || action === "money") && (
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
        <Wrap title="Same Start, Different Results" blurb={`Everyone's product earns the same ${fmt(PAY)} a period. Here's what your choices built so far — and there's still time to adjust before the final stretch.`}>
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
        <Wrap title="Build Something — Market Day" blurb="This is the heart of it: you get ahead by creating value for other people. A paycheck rents out your time; a product you own creates value while you sleep. Make a small product, app, or service — with AI as your tool — that you believe people would pay for, and watch it earn in the simulation.">
          {!s.hustle
            ? <button className="btn" onClick={() => set((n) => { n.hustle = true; n.cash -= HUSTLE_START; })} style={btn} disabled={s.cash < HUSTLE_START}>Launch your product (−{fmt(HUSTLE_START)} to start)</button>
            : <div style={{ background: C.paper, borderRadius: 4, padding: 14, color: C.ink2 }}>Your product is live — people are paying for the value it creates, so it earns every time you advance. That's building economic value: solve a real problem, own the upside.</div>}
        </Wrap>
      )}

      {action === "build" && (
        <Wrap title={wk.t} blurb={wk.s}>
          {weekActivity(s.week, s, setState, true) ? (
            // Build weeks with content: the class material is the worked Build Young example, then
            // the student does their own activity.
            <>
              {weekExample(s.week) && <>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: ".05em", textTransform: "uppercase", marginBottom: 8 }}>Class material</div>
                {weekExample(s.week)}
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: ".05em", textTransform: "uppercase", margin: "22px 0 8px" }}>Your turn</div>
              </>}
              {weekActivity(s.week, s, setState, true)}
            </>
          ) : (
            <div style={{ background: C.paper, borderRadius: 4, padding: 18, textAlign: "center" }}>
              <Sparkles size={22} color={C.gold} style={{ marginBottom: 8 }} />
              <div className="disp" style={{ fontWeight: 800, fontSize: 16 }}>Live with Sunil — interactive lesson coming soon</div>
              <div style={{ fontSize: 13.5, color: C.muted, marginTop: 6, lineHeight: 1.5, maxWidth: 460, marginLeft: "auto", marginRight: "auto" }}>
                This is part of the hands-on <b>Build</b> arc — you'll create something real, with AI as your tool, that people would pay for. Your instructor walks you through it live in class; the in-dashboard activity for this week is being built. Advancing still collects your income and applies the week's market move.
              </div>
            </div>
          )}
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

      {action === "capstone" && (<>
        {/* Week 12 is the finale (no separate check-in). Once finished, lead with the certificate. */}
        {s.done && cert && <div style={{ marginBottom: 14 }}><CertificateCard cert={cert} /></div>}
        <Wrap
          title={s.done ? "You've graduated 🎓" : "Capstone: What You Built"}
          blurb={s.done
            ? "That's the program. You built something real and learned to manage what it earns — your final net worth reflects every decision you made."
            : "You started with nothing but an idea. Here's the business and net worth you built — this is the finish line."}>
          <Stat label={s.done ? "Your final net worth" : "Final net worth"} value={fmt(netWorth(s))} color={C.emerald} icon={Sparkles} />
          {!s.done && <div style={{ fontSize: 14, color: C.ink2, marginTop: 12 }}>This is your last class. Advance once more to <b>finish the course</b> and unlock your certificate.</div>}
          {/* Capture the build + a testimonial at the finale (gated by the founder showcase toggle). */}
          {CONFIG.showcaseEnabled && <ShowcaseCapture s={s} />}
        </Wrap>
      </>)}

    </div>
  );
}

// The simulation-advance button. Lives on the Dashboard (the money-simulation home) — NOT inside
// the per-week Course-progress panels, which are about class materials + your activity. Mirrors
// the income/phase label logic. Hidden once graduated.
function AdvanceButton({ s, onAdvance }) {
  if (s.done) return null;
  const inc = incomeFor(s.phase, s.week);
  const earn = inc > 0 ? `Collect ${fmt(inc)} & ` : "";
  const label = s.week >= 12 ? "Finish the course 🎓" : `${earn}advance to Week ${s.week + 1}`;
  return (
    <button className="btn" onClick={onAdvance} style={{ width: "100%", marginTop: 14, background: C.ink, color: C.paper2, padding: 15, borderRadius: 4, fontSize: 16 }}>
      {label} <ArrowRight size={16} style={{ verticalAlign: "-2px" }} />
    </button>
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
      ["Eligibility — ages 15 to 18", "Build Young is intended for students aged 15 to 18, enrolled by a parent or guardian. We do not knowingly create accounts for, or collect personal information from, children under 13. If you believe a child under 13 has provided us information, contact us and we will delete it."],
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
      ["The program", "Build Young offers live, online money-skills classes — 12 weekly sessions (two live sessions per week) — delivered over video conference. Class activities use a learning simulation."],
      ["Eligibility", "Students must be 15 to 18 years old. An adult (parent or guardian) completes enrollment and payment on the student's behalf."],
      ["Education, not financial advice", "Build Young is financial education. It is not licensed financial, investment, tax, or legal advice. All money, accounts, prices, and returns shown in the simulation are simulated; no real funds are ever involved."],
      ["Payment", "Tuition is shown at enrollment and charged through our payment provider at the price listed for the selected cohort."],
      ["Refund policy", "Cancel any time before your cohort's first session for a full refund. Once the program has started, you may withdraw for a prorated refund through the end of the first week — the refund equals the tuition multiplied by the fraction of sessions not yet held. After the first week, tuition is non-refundable."],
      ["First-year builder prize", "In each cohort, the FIRST enrolled student to make a real, arms-length sale of their own product or service — a genuine paying customer, not a friend or family member — within one year of their enrollment date is eligible to have their tuition refunded. To claim, the student must (1) provide proof of the sale (e.g., a payment receipt from Stripe, PayPal, or a similar processor) for Build Young to verify, and (2) submit a short video (about 2 minutes) describing their product and experience, together with a parent or guardian's written consent for Build Young to use the student's name, likeness, and the video for promotional purposes. One award per cohort, to the first student who both qualifies and completes these steps; Build Young verifies eligibility and resolves any questions in good faith, and its decision is final. The award equals the tuition paid for that cohort and is issued after verification. Build Young may modify or discontinue the prize for future cohorts; the terms in effect at your enrollment apply. (This is a draft; because the prize is a contest involving minors and the use of a minor's name and likeness, it — and an appropriate parental media-release — must be reviewed by counsel before launch.)"],
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

// Shared shell for the auth screens (login / set-password / check-email) — matches the site
// theme: paper background, centered white card, brand wordmark.
function AuthShell({ title, sub, children, onHome }) {
  return (
    <div style={{ minHeight: "100vh", background: C.paper, display: "flex", flexDirection: "column", alignItems: "center", padding: "6vh 6vw" }}>
      <div className="disp" {...act(onHome)} aria-label="Build Young — home" style={{ fontWeight: 900, fontSize: 22, letterSpacing: "-.02em", cursor: "pointer", marginBottom: 24 }}>
        <Mark size={24} /> Build <span className="grad">Young</span>
      </div>
      <Card style={{ width: "100%", maxWidth: 420, padding: 28 }}>
        <h1 className="disp" style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{title}</h1>
        {sub && <p style={{ color: C.muted, fontSize: 14, marginTop: 8, lineHeight: 1.5 }}>{sub}</p>}
        {children}
      </Card>
    </div>
  );
}
const authInput = { width: "100%", padding: "12px 14px", borderRadius: 4, border: `1.5px solid ${C.line}`, background: C.paper2, fontSize: 15, marginTop: 6, boxSizing: "border-box" };
const authLabel = { fontSize: 13, fontWeight: 700, color: C.ink2 };

// Returning-student sign in. On success the parent hydrates server state and routes to the app.
export function Login({ onLogin, onReset, onHome, onEnroll }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setErr(""); setBusy(true);
    const res = await onLogin(email.trim(), password);
    if (!res.ok) { setErr(res.error || "Could not sign in."); setBusy(false); }
  };
  const doReset = async () => {
    if (!validEmail(email)) { setErr("Enter your email above first, then tap reset."); return; }
    setErr(""); await onReset(email.trim()); setResetSent(true);
  };
  return (
    <AuthShell title="Log in" sub="Sign in to your student dashboard." onHome={onHome}>
      {resetSent && <div role="status" style={{ background: "#eef3f0", border: `1px solid ${C.line}`, borderRadius: 4, padding: "10px 12px", marginTop: 14, fontSize: 13, color: C.ink2 }}>If an account exists for that email, we've sent a link to set a new password.</div>}
      <form onSubmit={submit}>
        <div style={{ marginTop: 16 }}><div style={authLabel}>Email</div><input aria-label="Email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" style={authInput} /></div>
        <div style={{ marginTop: 14 }}><div style={authLabel}>Password</div><input aria-label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" style={authInput} /></div>
        {err && <div role="alert" style={{ color: C.rust, fontSize: 13, marginTop: 12 }}>{err}</div>}
        <button className="btn" type="submit" disabled={busy} style={{ width: "100%", marginTop: 20, background: C.emerald, color: "#fff", padding: 13, borderRadius: 4, fontSize: 15, opacity: busy ? 0.7 : 1 }}>{busy ? "Signing in…" : "Log in"}</button>
      </form>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, fontSize: 13 }}>
        <span {...act(doReset)} style={{ color: C.emerald, fontWeight: 600, cursor: "pointer" }}>Forgot password?</span>
        <span {...act(onEnroll)} style={{ color: C.ink2, fontWeight: 600, cursor: "pointer" }}>Need a seat? Enroll →</span>
      </div>
    </AuthShell>
  );
}

// Reached via the emailed ?setpw=<token> link. Sets the password, then signs the student in.
export function SetPassword({ token, onSetPassword, onHome }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (password.length < 8) { setErr("Use at least 8 characters."); return; }
    if (password !== confirm) { setErr("The two passwords don't match."); return; }
    setErr(""); setBusy(true);
    const res = await onSetPassword(token, password);
    if (!res.ok) { setErr(res.error || "Could not set your password. The link may have expired."); setBusy(false); }
  };
  return (
    <AuthShell title="Set your password" sub="Choose a password to finish setting up your dashboard. You'll use your email + this password to log in from any device." onHome={onHome}>
      <form onSubmit={submit}>
        <div style={{ marginTop: 16 }}><div style={authLabel}>New password</div><input aria-label="New password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" style={authInput} /></div>
        <div style={{ marginTop: 14 }}><div style={authLabel}>Confirm password</div><input aria-label="Confirm password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter it" style={authInput} /></div>
        {err && <div role="alert" style={{ color: C.rust, fontSize: 13, marginTop: 12 }}>{err}</div>}
        <button className="btn" type="submit" disabled={busy} style={{ width: "100%", marginTop: 20, background: C.emerald, color: "#fff", padding: 13, borderRadius: 4, fontSize: 15, opacity: busy ? 0.7 : 1 }}>{busy ? "Saving…" : "Set password & open dashboard"}</button>
      </form>
    </AuthShell>
  );
}

// Shown after enrollment (Stripe return or demo) when auth is on: the account was provisioned
// server-side and a set-password link was emailed.
function CheckEmail({ track, email, onHome, onLogin }) {
  return (
    <AuthShell title="You're enrolled! 🎉" sub={`Your seat${track ? ` in the ${track} cohort` : ""} is reserved.`} onHome={onHome}>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#eef3f0", border: `1px solid ${C.line}`, borderRadius: 4, padding: "12px 14px", marginTop: 16 }}>
        <Mail size={16} color={C.emerald} style={{ marginTop: 2, flexShrink: 0 }} />
        <span style={{ fontSize: 13.5, color: C.ink2, lineHeight: 1.5 }}>We’ve sent a link to <b>set your password</b>{email ? <> to <b style={{ color: C.ink }}>{email}</b></> : ""}. Once it’s set, you can log in to your dashboard from any device. The link is good for 24 hours.</span>
      </div>
      <button className="btn" onClick={onLogin} style={{ width: "100%", marginTop: 20, background: C.ink, color: C.paper2, padding: 12, borderRadius: 4, fontSize: 14 }}>Go to login</button>
    </AuthShell>
  );
}

/* ===================== FOUNDER FUNNEL DASHBOARD (hidden route: ?founder=<token>) =====================
 * Not in the public nav. Reads the aggregate funnel stream from /api/funnel (gated by a founder session),
 * aggregates it via src/funnel.js (the single source of truth), and renders the connected funnel:
 * stage counts + step conversions, season/track segmentation, the week & check-in curves, revenue,
 * the withdrawal exit branch, and CSV/JSON exports for an investor data room. Aggregate data only. */
const FUNNEL_COLORS = [C.emerald, C.turq, C.gold, C.sky, C.green];

// Friendly names for the internal route keys used as `screen` in engagement events.
const SCREEN_LABELS = { home: "Landing page", enroll: "Enroll flow", call: "Book a call", app: "Student dashboard", login: "Log in", setpw: "Set password", checkemail: "Check your email", founder: "Founder console" };
const screenName = (s) => SCREEN_LABELS[s] || s || "—";
// Human dwell time from milliseconds: "0s" / "45s" / "2m 5s" / "1h 3m".
function fmtDwell(ms) {
  const sec = Math.max(0, Math.round((Number(ms) || 0) / 1000));
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60), s = sec % 60;
  if (m < 60) return s ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60); return `${h}h ${m % 60}m`;
}

// Friendly, actionable status for founder-console saves: keep the user's edits, say what to do.
const ADMIN_NET_ERR = "Network error — check your connection and try again. Your changes are kept.";
function adminSaveErr(r, d, verb = "save") {
  if (r && r.status === 403) return `Your founder session expired — sign in again, then ${verb} once more.`;
  const why = (d && d.error) || `server error ${r ? r.status : ""}`.trim();
  return `Couldn't ${verb}: ${why}. Your changes are still here — try again.`;
}
// Status colour: in-progress (ends "…") muted, success (Saved/Cleared/✓) green, otherwise error red.
const adminStatusColor = (s) => (s.endsWith("…") ? C.muted : (/^(Saved|Cleared)/.test(s) || s.includes("✓")) ? C.green : C.rust);

function downloadFile(filename, text, type) {
  try {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    document.body.removeChild(a); setTimeout(() => URL.revokeObjectURL(url), 1500);
  } catch (e) { /* ignore */ }
}

// ============================ FOUNDER TEACHING SCHEDULE ============================
// The founder's daily driver: "what am I teaching today, and where do I pick up for each
// cohort?" Built to scale to many cohorts/day — each row says the time, which session of which
// week, and the topic. A date field lets the founder look ahead to any day. Pure client-side
// (live catalog via useCohorts + the date helpers above); no new endpoint.
function TeachingSchedule() {
  const BATCHES = useCohorts();
  const todayISO = new Date().toISOString().slice(0, 10);
  const [dateStr, setDateStr] = useState(todayISO);
  const day = useMemo(() => { const d = new Date(dateStr + "T12:00:00"); return isNaN(d.getTime()) ? new Date() : d; }, [dateStr]);
  const isToday = dateStr === todayISO;
  const longDay = day.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  // Cohorts meeting on the chosen day, sorted by time-of-day label (best-effort string sort —
  // all current cohorts share one time, but this keeps order stable when times diverge).
  const teaching = BATCHES
    .map((b) => ({ b, meet: classMeetingOn(b, day) }))
    .filter((x) => x.meet)
    .sort((a, b) => cohortTime(a.b).localeCompare(cohortTime(b.b)));

  // Whole-roster pipeline: every cohort's state on the chosen day + its next session.
  const dn = dayNum(day);
  const roster = BATCHES.map((b) => {
    const startDay = b.start ? dayNum(new Date(b.start)) : null;
    const offset = startDay == null ? null : dn - startDay;
    let state, week = null;
    if (offset == null) state = "unknown";
    else if (offset < 0) state = "before";
    else if (Math.floor(offset / 7) + 1 > 12) state = "done";
    else { state = "active"; week = Math.floor(offset / 7) + 1; }
    return { b, state, week, next: nextClass(b, day) };
  });

  const muted = { fontSize: 12.5, color: C.muted };
  const card = { padding: 16, marginBottom: 12 };
  const wk = (n) => WEEKS[n - 1] || {};
  const shortDate = (d) => d ? d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "—";

  return (
    <div>
      {/* date picker — defaults to today; founder can scan any day ahead */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: C.ink2 }}>
          <Calendar size={15} color={C.emerald} /> Day
          <input type="date" aria-label="Schedule day" value={dateStr} onChange={(e) => setDateStr(e.target.value || todayISO)}
            style={{ fontSize: 13.5, padding: "7px 10px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper2, fontFamily: "inherit", color: C.ink }} />
        </label>
        {!isToday && <span {...act(() => setDateStr(todayISO))} style={{ cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: C.emerald }}>↩ Back to today</span>}
        <span style={{ ...muted, fontWeight: 700 }}>{longDay}{isToday ? " · today" : ""}</span>
      </div>

      {/* Teaching today — the headline list */}
      {teaching.length === 0 ? (
        <Card style={{ ...card, background: "#eef3f0", borderColor: C.emerald }}>
          <b style={{ color: C.ink }}>No classes {isToday ? "today" : "that day"}. 🎉</b>
          <div style={{ ...muted, marginTop: 4 }}>Your next sessions are listed in the cohort pipeline below.</div>
        </Card>
      ) : (
        teaching.map(({ b, meet }) => {
          const w = wk(meet.week);
          return (
            <Card key={b.id} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 15, fontWeight: 800, color: C.ink }}><Clock size={15} color={C.emerald} />{cohortTime(b) || "Time TBD"}</span>
                    <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: C.turq, background: "#e6f2f3", borderRadius: 999, padding: "2px 9px" }}>Session {meet.session} of 2</span>
                  </div>
                  <div style={{ fontSize: 13, color: C.ink2, marginTop: 4 }}><b>{b.track}</b> · {cohortDays(b)} · <span style={{ color: C.muted }}>{b.id}</span></div>
                </div>
                <a href={b.zoom} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", flexShrink: 0 }}>
                  <button className="btn" style={{ background: C.emerald, color: "#fff", padding: "9px 14px", borderRadius: 4, fontSize: 13, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 7 }}><Video size={14} /> Open Zoom</button>
                </a>
              </div>
              {/* where to pick up */}
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
                <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", color: C.muted }}>Pick up at</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.ink, marginTop: 3 }}>Week {meet.week} — {w.t}</div>
                {w.s && <div style={{ fontSize: 13, color: C.ink2, lineHeight: 1.5, marginTop: 3 }}>{w.s}</div>}
                {HOMEWORK[meet.week - 1] && (
                  <div style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.5, marginTop: 8, background: C.paper2, border: `1px solid ${C.line}`, borderRadius: 5, padding: "8px 11px" }}>
                    <b style={{ color: C.ink }}>Students were asked to prep:</b> {HOMEWORK[meet.week - 1]}
                  </div>
                )}
              </div>
            </Card>
          );
        })
      )}

      {/* Whole-cohort pipeline — where every cohort stands + its next session */}
      <div style={{ fontSize: 15, fontWeight: 800, color: C.ink, margin: "22px 0 10px" }}>All cohorts</div>
      <Card style={{ padding: 4 }}>
        {roster.map(({ b, state, week, next }, i) => (
          <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "11px 14px", borderTop: i ? `1px solid ${C.line}` : "none" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>{b.track} · {seasonLabel(b.season)} <span style={{ color: C.muted, fontWeight: 600 }}>· {cohortDays(b)}</span></div>
              <div style={muted}>{cohortTime(b)} · {b.id}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              {state === "active" && <span className="disp" style={{ fontSize: 14, fontWeight: 800, color: C.emerald }}>Week {week} of 12</span>}
              {state === "before" && <span style={{ fontSize: 13, fontWeight: 700, color: C.turq }}>Not started</span>}
              {state === "done" && <span style={{ fontSize: 13, fontWeight: 700, color: C.muted }}>Completed</span>}
              <div style={muted}>{next ? <>Next: {shortDate(next.date)} · Wk {next.week} (s{next.session})</> : "No more sessions"}</div>
            </div>
          </div>
        ))}
      </Card>
      <div style={{ ...muted, marginTop: 8 }}>Times/days come from each cohort's <b>day</b> label and <b>start</b> date (edit them under <b>Cohorts &amp; course</b>). Sessions are the two weekly classes per cohort.</div>
    </div>
  );
}

export function FounderDashboard({ onHome, onPreviewStudent }) {
  const [events, setEvents] = useState(null); // null = loading
  const [founders, setFounders] = useState([]); // admin allowlist (effective: env ∪ KV)
  const [error, setError] = useState(null);
  const [seg, setSeg] = useState({ kind: "all", key: null }); // all | {season} | {track}
  const [tab, setTab] = useState("today"); // today | funnel | cohorts | students | settings — keeps the console short

  // Authorized by the session cookie (sent automatically): the server admits only a logged-in
  // founder (email on the allowlist). 401/403 → not signed in as a founder.
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await fetch("/api/funnel");
        if (r.status === 401 || r.status === 403) { if (live) setError("Access denied — sign in with your founder account to view this."); return; }
        const data = await r.json();
        if (live) { setEvents(Array.isArray(data.events) ? data.events : []); setFounders(Array.isArray(data.founders) ? data.founders : []); }
      } catch (e) { if (live) setError("Couldn’t load analytics (network error)."); }
    })();
    return () => { live = false; };
  }, []);

  const filter = seg.kind === "season" ? { season: seg.key } : seg.kind === "track" ? { track: seg.key } : null;
  const summary = useMemo(() => summarize(events || [], filter), [events, seg.kind, seg.key]);
  // Traffic & engagement is whole-site (not segmented by cohort) — it's the top-of-funnel picture.
  const eng = useMemo(() => engagement(events || []), [events]);

  const funnelData = STAGES.map((st, i) => {
    const count = summary.counts[st.key];
    const annot = i === 0 ? count.toLocaleString() : `${count.toLocaleString()} · ${ratePct(summary.steps[i - 1].rate)}`;
    return { label: st.label, count, color: FUNNEL_COLORS[i % FUNNEL_COLORS.length], annot };
  });
  // Biggest leak = the step with the largest drop, only among steps the downstream stage has
  // actually been reached (toCount > 0). This ignores stages that simply haven't started yet
  // (e.g. Class started = 0 before a cohort begins), so it flags real drop-off, not timing.
  const leakSteps = summary.steps.filter((s) => s.toCount > 0);
  const biggestLeak = leakSteps.length ? leakSteps.reduce((a, b) => ((1 - b.rate) > (1 - a.rate) ? b : a)) : null;

  const segBtn = (label, active, onClick) => (
    <span {...act(onClick)} key={label} style={{ cursor: "pointer", fontSize: 12.5, fontWeight: 700, padding: "6px 12px", borderRadius: 4, border: `1px solid ${active ? C.emerald : C.line}`, background: active ? C.emerald : C.card, color: active ? "#fff" : C.ink2 }}>{label}</span>
  );

  const wrap = { maxWidth: 1080, margin: "0 auto", padding: "0 20px 80px", position: "relative", zIndex: 1 };
  const h2s = { fontSize: 17, fontWeight: 800, color: C.ink, margin: "30px 0 12px" };
  const muted = { fontSize: 12.5, color: C.muted };

  return (
    <div style={{ minHeight: "100vh", paddingTop: 24 }}>
      <div style={wrap}>
        {/* header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div className="disp" style={{ fontSize: 26, fontWeight: 800 }}><Mark size={22} />Founder console</div>
            <div style={muted}>Funnel, cohorts, admins &amp; account tools · aggregate data only (no student PII).</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span {...act(() => downloadFile("build-young-funnel.csv", toCSV(events || []), "text/csv"))} style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: C.ink2, border: `1px solid ${C.line}`, borderRadius: 4, padding: "8px 12px" }}><Download size={14} /> CSV</span>
            <span {...act(() => downloadFile("build-young-funnel.json", JSON.stringify(toDataRoom(events || []), null, 2), "application/json"))} style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: C.ink2, border: `1px solid ${C.line}`, borderRadius: 4, padding: "8px 12px" }}><Download size={14} /> JSON</span>
            {onPreviewStudent && <span {...act(onPreviewStudent)} style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#fff", background: C.emerald, borderRadius: 4, padding: "8px 12px" }}><GraduationCap size={14} /> Preview student dashboard</span>}
            <span {...act(onHome)} style={{ cursor: "pointer", fontSize: 13, fontWeight: 700, color: C.muted, padding: "8px 6px" }}>← Home</span>
          </div>
        </div>

        {error && <Card style={{ padding: 18, marginTop: 24, borderColor: C.goldLite, background: "#fbeede" }}><b style={{ color: C.ink }}>{error}</b></Card>}
        {!error && events === null && <Card style={{ padding: 24, marginTop: 24, color: C.muted }}>Loading analytics…</Card>}

        {/* section tabs — keep the console short instead of one long scroll */}
        {!error && events !== null && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 22, borderBottom: `1px solid ${C.line}`, paddingBottom: 2 }}>
            {[["today", "Today"], ["funnel", "Funnel"], ["cohorts", "Cohorts & course"], ["students", "Students"], ["settings", "Settings"]].map(([k, label]) => (
              <span key={k} {...act(() => setTab(k))} style={{ cursor: "pointer", fontSize: 13.5, fontWeight: 700, padding: "8px 14px", borderRadius: "4px 4px 0 0", color: tab === k ? C.ink : C.muted, borderBottom: `2px solid ${tab === k ? C.emerald : "transparent"}`, marginBottom: -2 }}>{label}</span>
            ))}
          </div>
        )}

        {!error && events !== null && tab === "today" && (<>
          <h2 style={h2s}>Teaching schedule</h2>
          <div style={{ ...muted, marginBottom: 12 }}>What you're teaching today and where to pick up for each cohort — pick any day to look ahead.</div>
          <TeachingSchedule />
        </>)}

        {!error && events !== null && tab === "funnel" && (<>
          {events.length === 0 && <Card style={{ padding: 14, marginTop: 18, ...muted }}>No events recorded yet — the funnel will populate as visitors move through the site.</Card>}

          {/* segment selector */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 22 }}>
            <span style={{ ...muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", marginRight: 4 }}>Segment</span>
            {segBtn("All", seg.kind === "all", () => setSeg({ kind: "all", key: null }))}
            {SEASONS.map((s) => segBtn(s.label, seg.kind === "season" && seg.key === s.key, () => setSeg({ kind: "season", key: s.key })))}
            {TRACKS.length > 1 && TRACKS.map((t) => segBtn(t, seg.kind === "track" && seg.key === t, () => setSeg({ kind: "track", key: t })))}
          </div>
          {filter && <div style={{ ...muted, marginTop: 8 }}>Segmented views start at <b>Enrolled</b> — top-of-funnel events (visits, enroll-starts) aren’t tied to a cohort.</div>}

          {/* funnel + revenue */}
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18, marginTop: 14, alignItems: "start" }} className="enroll-grid">
            <Card style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <b style={{ fontSize: 14 }}>The funnel</b>
                <span style={muted}>{ratePct(summary.overall)} visited → enrolled</span>
              </div>
              <React.Suspense fallback={<div style={{ height: 280, display: "grid", placeItems: "center", color: C.muted, fontSize: 13 }}>Loading chart…</div>}>
                <Charts kind="funnel" data={funnelData} mutedColor={C.muted} fmt={fmt} />
              </React.Suspense>
            </Card>
            <div style={{ display: "grid", gap: 12 }}>
              <Stat label="Net revenue" value={fmt(summary.revenue.netCents / 100)} sub={`${fmt(summary.revenue.grossCents / 100)} gross − ${fmt(summary.revenue.refundedCents / 100)} refunded`} icon={CircleDollarSign} color={C.green} />
              <Stat label="Enrolled" value={summary.counts.enrolled.toLocaleString()} sub={`${summary.calls.enrolledFromCall} via a booked call · ${summary.calls.enrolledDirect} direct`} icon={Users} color={C.emerald} />
              <Stat label="Calls booked" value={summary.calls.booked.toLocaleString()} sub="“Talk to Sunil” assist path" icon={Video} color={C.turq} />
            </div>
          </div>

          {/* step conversions */}
          <h2 style={h2s}>Drop-off — where you lose people</h2>
          {biggestLeak && (
            <div style={{ fontSize: 13.5, color: C.ink2, marginBottom: 10 }}>
              Biggest drop-off: <b>{biggestLeak.fromLabel} → {biggestLeak.toLabel}</b> — <b style={{ color: C.pink }}>{ratePct(1 - biggestLeak.rate)} lost</b> ({Math.max(0, biggestLeak.fromCount - biggestLeak.toCount).toLocaleString()} of {biggestLeak.fromCount.toLocaleString()}).
            </div>
          )}
          <Card style={{ padding: 4 }}>
            {summary.steps.map((st, i) => {
              const lost = Math.max(0, st.fromCount - st.toCount);
              const isLeak = st === biggestLeak;
              return (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderTop: i ? `1px solid ${C.line}` : "none", background: isLeak ? "#fbeede" : "transparent" }}>
                  <span style={{ fontSize: 13.5, color: C.ink2 }}>{st.fromLabel} → {st.toLabel}{isLeak && <b style={{ color: C.gold, marginLeft: 8, fontSize: 10.5, letterSpacing: ".04em" }}>BIGGEST DROP-OFF</b>}</span>
                  <span style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    <span style={muted}>{st.fromCount.toLocaleString()} → {st.toCount.toLocaleString()}{st.fromCount > 0 ? ` · ${lost.toLocaleString()} lost` : ""}</span>
                    <span className="disp" style={{ fontSize: 16, fontWeight: 800, color: st.rate >= 0.5 ? C.green : st.rate >= 0.2 ? C.gold : C.pink, minWidth: 52, textAlign: "right" }}>{ratePct(st.rate)} kept</span>
                  </span>
                </div>
              );
            })}
          </Card>
          <div style={{ ...muted, marginTop: 8 }}><b>Class started</b> and later fill in as each cohort begins — a 0 there is timing, not drop-off.</div>

          {/* traffic & engagement — the "before enrollment" picture: who arrives, what holds
              attention, where they leave (explains the Visited → Enroll-started drop above). */}
          <h2 style={h2s}>Traffic &amp; engagement</h2>
          <div style={{ ...muted, marginBottom: 10 }}>Where visitors come from, which screens hold attention, and where they leave — the “before enrollment” view behind the drop-off above. Anonymous &amp; aggregate.</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18 }} className="enroll-grid">
            <Card style={{ padding: 16 }}>
              <b style={{ fontSize: 13.5 }}>Where visitors come from</b>
              <div style={{ marginTop: 10 }}>
                {eng.sources.length === 0 && <div style={muted}>No visits recorded yet.</div>}
                {eng.sources.slice(0, 8).map((s) => (
                  <div key={s.source} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: `1px solid ${C.line}`, fontSize: 13 }}>
                    <span style={{ color: C.ink2 }}>{s.source === "direct" ? "Direct / typed in" : s.source}</span>
                    <b>{s.count.toLocaleString()}</b>
                  </div>
                ))}
              </div>
            </Card>
            <Card style={{ padding: 16 }}>
              <b style={{ fontSize: 13.5 }}>Which screens hold attention</b>
              <div style={{ marginTop: 10 }}>
                {eng.screens.length === 0 && <div style={muted}>No screen views recorded yet.</div>}
                {eng.screens.length > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".04em", paddingBottom: 4 }}>
                    <span>Screen</span><span>Views · avg time</span>
                  </div>
                )}
                {eng.screens.slice(0, 8).map((s) => (
                  <div key={s.screen} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: `1px solid ${C.line}`, fontSize: 13 }}>
                    <span style={{ color: C.ink2 }}>{screenName(s.screen)}</span>
                    <b>{s.views.toLocaleString()} · {fmtDwell(s.avgMs)}</b>
                  </div>
                ))}
              </div>
            </Card>
            <Card style={{ padding: 16 }}>
              <b style={{ fontSize: 13.5 }}>Where they leave</b>
              <div style={{ marginTop: 10 }}>
                {eng.exits.length === 0 && <div style={muted}>No exits recorded yet.</div>}
                {eng.exits.slice(0, 8).map((s) => (
                  <div key={s.screen} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: `1px solid ${C.line}`, fontSize: 13 }}>
                    <span style={{ color: C.ink2 }}>{screenName(s.screen)}</span>
                    <b>{s.count.toLocaleString()} · {ratePct(s.pct)}</b>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* curves */}
          <div style={{ display: "grid", gridTemplateColumns: summary.checkinCurve.length ? "1fr 1fr" : "1fr", gap: 18, marginTop: 8 }} className="enroll-grid">
            <div>
              <h2 style={h2s}>Week-by-week progression</h2>
              <Card style={{ padding: 16 }}>
                <div style={muted}>Students reaching each week (drop-off across the 12-week course).</div>
                <React.Suspense fallback={<div style={{ height: 200 }} />}>
                  <Charts kind="countline" data={summary.weekCurve} color={C.emerald} mutedColor={C.muted} fmt={fmt} />
                </React.Suspense>
              </Card>
            </div>
            {summary.checkinCurve.length > 0 && (
              <div>
                <h2 style={h2s}>Check-in retention</h2>
                <Card style={{ padding: 16 }}>
                  <div style={muted}>Follow-up check-ins completed after graduation (post-course retention).</div>
                  <React.Suspense fallback={<div style={{ height: 200 }} />}>
                    <Charts kind="countline" data={summary.checkinCurve} color={C.turq} mutedColor={C.muted} fmt={fmt} />
                  </React.Suspense>
                </Card>
              </div>
            )}
          </div>

          {/* withdrawals exit branch */}
          <h2 style={h2s}>Withdrawals (exit branch)</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }} className="enroll-grid">
            <Stat label="Total" value={summary.withdrawals.total.toLocaleString()} icon={Activity} color={C.pink} />
            <Stat label="Full refund" value={summary.withdrawals.byTier.full.toLocaleString()} sub="before class started" color={C.ink} />
            <Stat label="Prorated" value={summary.withdrawals.byTier.prorated.toLocaleString()} sub={`within the ${REFUND_WINDOW}`} color={C.ink} />
            <Stat label="No refund" value={summary.withdrawals.byTier.none.toLocaleString()} sub="after the window" color={C.ink} />
          </div>
          {summary.withdrawals.total > 0 && (
            <Card style={{ padding: 16, marginTop: 12 }}>
              <b style={{ fontSize: 13.5 }}>Why they cancelled</b>
              <div style={{ marginTop: 8 }}>
                {Object.entries(summary.withdrawals.byReason).sort((a, b) => b[1] - a[1]).map(([r, n], i) => (
                  <div key={r} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: i ? `1px solid ${C.line}` : "none", fontSize: 13 }}>
                    <span style={{ color: C.ink2 }}>{cancelReasonLabel(r) || (r === "unspecified" ? "Unspecified" : r)}</span>
                    <b>{n.toLocaleString()}</b>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>)}

        {!error && events !== null && tab === "cohorts" && (<>
          <h2 style={h2s}>Cohorts &amp; schedule</h2>
          <CohortEditor />
          <h2 style={h2s}>Class recordings</h2>
          <RecordingsEditor />
          <h2 style={h2s}>Homework</h2>
          <HomeworkEditor />
          <h2 style={h2s}>Next-cohort interest</h2>
          <InterestAdmin />
        </>)}

        {!error && events !== null && tab === "students" && (<>
          <h2 style={h2s}>Certificates</h2>
          <CertificatesAdmin />
          <h2 style={h2s}>Student plans</h2>
          <BuildPlansAdmin />
          <h2 style={h2s}>Tutor applications</h2>
          <TutorInterestAdmin />
          <h2 style={h2s}>Student showcase</h2>
          <ShowcaseAdmin />
          <h2 style={h2s}>Reset a test account</h2>
          <AccountReset />
        </>)}

        {!error && events !== null && tab === "settings" && (<>
          <h2 style={h2s}>Site settings</h2>
          <SettingsEditor />
          <h2 style={h2s}>Notifications</h2>
          <NotificationsEditor />
          <h2 style={h2s}>Admins</h2>
          <FoundersEditor founders={founders} />
          <h2 style={h2s}>System status</h2>
          <SystemStatus />
        </>)}
      </div>
    </div>
  );
}

// Live site-settings editor — the founder-editable runtime values (booking link, contact email,
// LinkedIn). Reads the current settings from /api/cohorts and saves via the founder-gated
// PUT /api/funnel?resource=settings. Changes show on the public site without a redeploy.
function SettingsEditor() {
  const [vals, setVals] = useState(null);
  const [status, setStatus] = useState("");
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await fetch("/api/cohorts");
        const cat = await r.json();
        if (live) setVals({ ...SITE_DEFAULTS, ...(cat && cat.settings ? cat.settings : {}) });
      } catch { if (live) setVals({ ...SITE_DEFAULTS }); }
    })();
    return () => { live = false; };
  }, []);

  if (vals === null) return <Card style={{ padding: 18, color: C.muted }}>Loading settings…</Card>;

  const set = (k, v) => setVals((p) => ({ ...p, [k]: v }));
  const save = async () => {
    setStatus("Saving…");
    try {
      const r = await fetch("/api/funnel?resource=settings", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(vals),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) {
        setVals(d.settings); Object.assign(CONFIG, d.settings); setStatus("Saved — live now ✓");
      } else setStatus(adminSaveErr(r, d, "save settings"));
    } catch { setStatus(ADMIN_NET_ERR); }
  };

  const lab = { fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".04em", display: "block", marginBottom: 4 };
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 12 }}>These take effect on the public site immediately (no redeploy). Leave the booking link empty to use the built-in demo scheduler.</div>
      <div style={{ display: "grid", gap: 14 }}>
        {SETTINGS_FIELDS.map((f) => f.type === "boolean" ? (
          <label key={f.key} style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
            <input type="checkbox" aria-label={f.label} checked={!!vals[f.key]} onChange={(e) => set(f.key, e.target.checked)}
              style={{ width: 17, height: 17, marginTop: 1, flexShrink: 0, accentColor: C.emerald, cursor: "pointer" }} />
            <span style={{ minWidth: 0 }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, display: "block" }}>{f.label}{vals[f.key] ? " · ON" : " · off"}</span>
              {f.hint && <span style={{ fontSize: 12, color: C.muted, display: "block", marginTop: 2 }}>{f.hint}</span>}
            </span>
          </label>
        ) : (
          <label key={f.key} style={{ display: "block" }}>
            <span style={lab}>{f.label}</span>
            <input aria-label={f.label} type="text" value={vals[f.key] ?? ""} placeholder={f.placeholder}
              onChange={(e) => set(f.key, e.target.value)}
              style={{ fontSize: 14, padding: "9px 12px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper2, width: "100%", boxSizing: "border-box" }} />
            {f.hint && <span style={{ fontSize: 12, color: C.muted, display: "block", marginTop: 4 }}>{f.hint}</span>}
          </label>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 14 }}>
        <button className="btn" onClick={save} style={{ background: C.ink, color: C.paper2, padding: "9px 18px", borderRadius: 4, fontSize: 14, fontWeight: 700 }}>Save settings</button>
        {status && <span style={{ fontSize: 13, fontWeight: 700, color: adminStatusColor(status) }}>{status}</span>}
      </div>
    </Card>
  );
}

// Founder-editable PRIVATE notifications address (where tutor applications etc. are emailed).
// Read/written via the founder-gated /api/funnel?resource=ops — never exposed publicly or in the
// client bundle (unlike the public Site settings).
function NotificationsEditor() {
  const [email, setEmail] = useState(null);
  const [status, setStatus] = useState("");
  useEffect(() => {
    let live = true;
    (async () => {
      try { const r = await fetch("/api/funnel?resource=ops"); const d = r.ok ? await r.json() : {}; if (live) setEmail((d.ops && d.ops.notifyEmail) || ""); }
      catch { if (live) setEmail(""); }
    })();
    return () => { live = false; };
  }, []);
  if (email === null) return <Card style={{ padding: 18, color: C.muted }}>Loading…</Card>;
  const save = async () => {
    setStatus("Saving…");
    try {
      const r = await fetch("/api/funnel?resource=ops", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notifyEmail: email }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) { setEmail(d.ops.notifyEmail); setStatus("Saved — live now ✓"); }
      else setStatus(adminSaveErr(r, d, "save notifications"));
    } catch { setStatus(ADMIN_NET_ERR); }
  };
  const lab = { fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".04em", display: "block", marginBottom: 4 };
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 12 }}>Where founder alerts are emailed — like a new <b>tutor application</b> from Careers. Private (never shown on the public site). Leave blank to use your <b>team/contact email</b>. Sending also requires <code>RESEND_API_KEY</code> on the host.</div>
      <label style={{ display: "block" }}>
        <span style={lab}>Notifications email</span>
        <input aria-label="Notifications email" type="email" value={email} placeholder="you@example.com"
          onChange={(e) => setEmail(e.target.value)}
          style={{ fontSize: 14, padding: "9px 12px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper2, width: "100%", maxWidth: 420, boxSizing: "border-box" }} />
      </label>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 14 }}>
        <button className="btn" onClick={save} style={{ background: C.ink, color: C.paper2, padding: "9px 18px", borderRadius: 4, fontSize: 14, fontWeight: 700 }}>Save</button>
        {status && <span style={{ fontSize: 13, fontWeight: 700, color: adminStatusColor(status) }}>{status}</span>}
      </div>
    </Card>
  );
}

// Read-only view of the deploy-time switches that CAN'T live in a web console (they depend on
// host secrets — Resend key, AUTH_SECRET, the KV vars). Surfaced so the founder sees the full
// config picture in one place and knows what to flip on the host vs. here.
function SystemStatus() {
  const Row = ({ label, on, note }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderTop: `1px solid ${C.line}`, fontSize: 13 }}>
      <span style={{ color: C.ink2 }}>{label}<span style={{ color: C.muted, marginLeft: 8, fontSize: 12 }}>{note}</span></span>
      <b style={{ color: on ? C.green : C.muted }}>{on ? "On" : "Off"}</b>
    </div>
  );
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 4 }}>Set on the host (environment variables), not here — they hold secrets. Shown read-only so you can see the whole picture.</div>
      <Row label="Email delivery" on={CONFIG.emailEnabled} note="needs RESEND_API_KEY" />
      <Row label="Accounts &amp; login" on={CONFIG.authEnabled} note="needs AUTH_SECRET + KV" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderTop: `1px solid ${C.line}`, fontSize: 13 }}>
        <span style={{ color: C.ink2 }}>Brand domain</span><b>{CONFIG.brandDomain}</b>
      </div>
    </Card>
  );
}

// Per-week class-recording links, per cohort. Stored in the cohort catalog (recordings map) and
// saved via the same founder-gated PUT /api/funnel. A student's "Rewatch" uses the week's recording
// when present, else the live class link.
function RecordingsEditor() {
  const [cat, setCat] = useState(null); // { batches, checkins }
  const [idx, setIdx] = useState(0);    // selected cohort
  const [status, setStatus] = useState("");
  useEffect(() => {
    let live = true;
    (async () => {
      try { const r = await fetch("/api/cohorts"); const c = await r.json(); if (live) setCat({ batches: Array.isArray(c.batches) ? c.batches : [], checkins: c.checkins ?? 1 }); }
      catch { if (live) setStatus("Couldn't load cohorts (network). Refresh to try again."); }
    })();
    return () => { live = false; };
  }, []);

  if (cat === null && !status) return <Card style={{ padding: 18, color: C.muted }}>Loading…</Card>;
  if (!cat || !cat.batches.length) return <Card style={{ padding: 18, color: C.muted }}>{status || "Add a cohort first (above), then you can post its recordings here."}</Card>;

  const b = cat.batches[idx] || cat.batches[0];
  const setRec = (w, url) => setCat((c) => ({ ...c, batches: c.batches.map((bb, j) => (j === idx ? { ...bb, recordings: { ...(bb.recordings || {}), [String(w)]: url } } : bb)) }));
  const save = async () => {
    setStatus("Saving…");
    try {
      const r = await fetch("/api/funnel", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ batches: cat.batches, checkins: cat.checkins }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) { setCat({ batches: d.catalog.batches, checkins: d.catalog.checkins }); setStatus("Saved — live now ✓"); }
      else setStatus(adminSaveErr(r, d, "save recordings"));
    } catch { setStatus(ADMIN_NET_ERR); }
  };
  const inp = { fontSize: 12.5, padding: "7px 9px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper2, width: "100%", boxSizing: "border-box" };
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 12 }}>Paste each session's <b>Zoom cloud-recording link</b>. When set, a student's "Rewatch" for that week opens the recording (otherwise the live class link). Goes live immediately.</div>
      <label style={{ display: "block", marginBottom: 14 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".04em", display: "block", marginBottom: 5 }}>Cohort</span>
        <select aria-label="Cohort" value={idx} onChange={(e) => setIdx(Number(e.target.value))} style={inp}>
          {cat.batches.map((bb, j) => <option key={bb.id || j} value={j}>{bb.id} — {bb.season} · {bb.day}</option>)}
        </select>
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }} className="enroll-grid">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => (
          <label key={w} style={{ display: "block" }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".04em", display: "block", marginBottom: 3 }}>Week {w} recording</span>
            <input aria-label={`Week ${w} recording URL`} type="text" placeholder="https://…/rec/share/…" value={(b.recordings && b.recordings[String(w)]) || ""} onChange={(e) => setRec(w, e.target.value)} style={inp} />
          </label>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 14 }}>
        <button className="btn" onClick={save} style={{ background: C.ink, color: C.paper2, padding: "9px 18px", borderRadius: 4, fontSize: 14, fontWeight: 700 }}>Save recordings</button>
        {status && <span style={{ fontSize: 13, fontWeight: 700, color: adminStatusColor(status) }}>{status}</span>}
      </div>
    </Card>
  );
}

// Founder editor for the 12 weeks' homework/prep text (week-completion email + class reminder).
// KV-backed via PUT /api/funnel?resource=homework; live immediately.
function HomeworkEditor() {
  const [rows, setRows] = useState(null);
  const [status, setStatus] = useState("");
  useEffect(() => {
    let live = true;
    (async () => {
      try { const r = await fetch("/api/cohorts"); const c = await r.json(); if (live) setRows(Array.isArray(c.homework) && c.homework.length === 12 ? c.homework : WEEK_PREP.slice(0, 12)); }
      catch { if (live) setRows(WEEK_PREP.slice(0, 12)); }
    })();
    return () => { live = false; };
  }, []);
  if (rows === null) return <Card style={{ padding: 18, color: C.muted }}>Loading…</Card>;
  const set = (i, v) => setRows((rs) => rs.map((r, j) => (j === i ? v : r)));
  const save = async () => {
    setStatus("Saving…");
    try {
      const r = await fetch("/api/funnel?resource=homework", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ homework: rows }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) { setRows(d.homework); HOMEWORK = d.homework; setStatus("Saved — live now ✓"); }
      else setStatus(adminSaveErr(r, d, "save homework"));
    } catch { setStatus(ADMIN_NET_ERR); }
  };
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 12 }}>Homework for each week — sent in the week-completion email (prep for the next week) and the 2-days-before class reminder. Leave a week blank to skip its homework.</div>
      <div style={{ display: "grid", gap: 12 }}>
        {rows.map((v, i) => (
          <label key={i} style={{ display: "block" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: "block", marginBottom: 4 }}>Week {i + 1} · {WEEKS[i].t}</span>
            <textarea aria-label={`Week ${i + 1} homework`} value={v} onChange={(e) => set(i, e.target.value)} rows={2} style={{ width: "100%", boxSizing: "border-box", fontSize: 13.5, padding: "9px 11px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper2, fontFamily: "inherit", color: C.ink, resize: "vertical", lineHeight: 1.5 }} />
          </label>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 14 }}>
        <button className="btn" onClick={save} style={{ background: C.ink, color: C.paper2, padding: "9px 18px", borderRadius: 4, fontSize: 14, fontWeight: 700 }}>Save homework</button>
        {status && <span style={{ fontSize: 13, fontWeight: 700, color: adminStatusColor(status) }}>{status}</span>}
      </div>
    </Card>
  );
}

// Live cohort editor — add / edit / remove batches (dates, days, seats, price, Zoom, Stripe link)
// and the check-in count. Reads the current catalog from /api/cohorts and saves via the
// founder-gated PUT /api/funnel. Changes show on the public site without a redeploy.
function CohortEditor() {
  const [rows, setRows] = useState(null);
  const [checkins, setCheckins] = useState(1);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await fetch("/api/cohorts");
        const cat = await r.json();
        if (live) { setRows(Array.isArray(cat.batches) ? cat.batches : []); setCheckins(cat.checkins ?? 1); }
      } catch { if (live) setRows([]); }
    })();
    return () => { live = false; };
  }, []);

  if (rows === null) return <Card style={{ padding: 18, color: C.muted }}>Loading cohorts…</Card>;

  const update = (i, key, val) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [key]: val } : r)));
  const remove = (i) => setRows((rs) => rs.filter((_, j) => j !== i));
  const add = () => setRows((rs) => [...rs, { id: "", season: "fall", track: "Builders", start: "", day: "", seats: 12, price: 999, zoom: "", stripeLink: "" }]);
  const save = async () => {
    setStatus("Saving…");
    try {
      const r = await fetch("/api/funnel", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batches: rows, checkins: Number(checkins) }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok && data.ok) { setRows(data.catalog.batches); setCheckins(data.catalog.checkins); setStatus("Saved — live now ✓"); }
      else setStatus(adminSaveErr(r, data, "save cohorts"));
    } catch { setStatus(ADMIN_NET_ERR); }
  };

  const inp = { fontSize: 12.5, padding: "6px 8px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper2, width: "100%", boxSizing: "border-box" };
  const lab = { fontSize: 10.5, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".04em", display: "block", marginBottom: 3 };
  const field = (i, key, label, type = "text", w = "1fr") => (
    <label style={{ gridColumn: `span 1`, minWidth: 0 }}><span style={lab}>{label}</span>
      <input aria-label={`${label} for cohort ${i + 1}`} type={type} value={rows[i][key] ?? ""} onChange={(e) => update(i, key, type === "number" ? e.target.value : e.target.value)} style={inp} /></label>
  );

  return (
    <Card style={{ padding: 16 }}>
      <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 12 }}>Edits go live on the public site immediately (no redeploy). Each cohort's <b>id</b> must be unique and stable; its Stripe link's metadata/redirect should use that id.</div>
      {rows.map((b, i) => (
        <div key={i} style={{ border: `1px solid ${C.line}`, borderRadius: 6, padding: 12, marginBottom: 10, background: C.paper }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }} className="enroll-grid">
            {field(i, "id", "Cohort id")}
            {field(i, "season", "Season key")}
            {field(i, "track", "Track")}
            {field(i, "start", "Start (e.g. Sep 7, 2026)")}
            {field(i, "day", "Day label")}
            {field(i, "price", "Price ($)", "number")}
            {field(i, "seats", "Seats", "number")}
            {field(i, "zoom", "Zoom URL")}
            {field(i, "stripeLink", "Stripe Payment Link")}
          </div>
          <div style={{ textAlign: "right", marginTop: 8 }}>
            <span {...act(() => remove(i))} style={{ cursor: "pointer", fontSize: 12, fontWeight: 700, color: C.rust }}>Remove cohort</span>
          </div>
        </div>
      ))}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 6 }}>
        <span {...act(add)} style={{ cursor: "pointer", fontSize: 13, fontWeight: 700, color: C.emerald, border: `1px solid ${C.emerald}`, borderRadius: 4, padding: "8px 14px" }}>+ Add cohort</span>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.ink2 }}>Monthly check-ins
          <input aria-label="number of follow-up check-ins" type="number" value={checkins} onChange={(e) => setCheckins(e.target.value)} style={{ ...inp, width: 64 }} /></label>
        <button className="btn" onClick={save} style={{ background: C.ink, color: C.paper2, padding: "9px 18px", borderRadius: 4, fontSize: 14, fontWeight: 700, marginLeft: "auto" }}>Save changes</button>
        {status && <span style={{ fontSize: 13, fontWeight: 700, color: adminStatusColor(status) }}>{status}</span>}
      </div>
    </Card>
  );
}

// Founder tool: manage the admin allowlist — add/remove the emails that get founder access.
// Env-bootstrap founders are permanent (the server keeps them even if removed here).
function FoundersEditor({ founders }) {
  const [list, setList] = useState(founders || []);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  useEffect(() => { setList(founders || []); }, [founders]);

  const add = () => {
    const e = email.trim().toLowerCase();
    if (!validEmail(e)) { setStatus("Enter a valid email"); return; }
    if (!list.includes(e)) setList([...list, e]);
    setEmail(""); setStatus("");
  };
  const remove = (e) => setList(list.filter((x) => x !== e));
  const save = async () => {
    setStatus("Saving…");
    try {
      const r = await fetch("/api/funnel?resource=founders", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emails: list }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) { setList(d.founders); setStatus("Saved ✓"); } else setStatus(adminSaveErr(r, d, "save admins"));
    } catch { setStatus(ADMIN_NET_ERR); }
  };

  return (
    <Card style={{ padding: 16 }}>
      <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 10 }}>Anyone here gets admin access when they sign in. (Bootstrap admins set via env can't be removed.)</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {list.map((e) => (
          <span key={e} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.paper, border: `1px solid ${C.line}`, borderRadius: 999, padding: "6px 12px", fontSize: 13, color: C.ink2 }}>
            {e}<span {...act(() => remove(e))} aria-label={`remove ${e}`} style={{ cursor: "pointer", color: C.rust, fontWeight: 800 }}>×</span>
          </span>
        ))}
        {list.length === 0 && <span style={{ fontSize: 13, color: C.muted }}>No admins yet.</span>}
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input aria-label="add admin email" type="email" placeholder="newadmin@example.com" value={email}
          onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          style={{ fontSize: 14, padding: "9px 12px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper2, flex: 1, minWidth: 220 }} />
        <span {...act(add)} style={{ cursor: "pointer", fontSize: 13, fontWeight: 700, color: C.emerald, border: `1px solid ${C.emerald}`, borderRadius: 4, padding: "9px 14px" }}>+ Add</span>
        <button className="btn" onClick={save} style={{ background: C.ink, color: C.paper2, padding: "9px 18px", borderRadius: 4, fontSize: 14, fontWeight: 700 }}>Save admins</button>
        {status && <span style={{ fontSize: 13, fontWeight: 700, color: adminStatusColor(status) }}>{status}</span>}
      </div>
    </Card>
  );
}

// Founder tool: wipe a test account (user record + sim state) so an email can re-run enrollment.
function AccountReset() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const reset = async () => {
    if (!validEmail(email)) { setStatus("Enter a valid email"); return; }
    setStatus("Resetting…");
    try {
      const r = await fetch(`/api/funnel?email=${encodeURIComponent(email)}`, { method: "DELETE" });
      const d = await r.json().catch(() => ({}));
      setStatus(r.ok && d.ok ? `Cleared ${email} ✓ (they can re-enroll fresh)` : adminSaveErr(r, d, "reset"));
    } catch { setStatus(ADMIN_NET_ERR); }
  };
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input aria-label="email to reset" type="email" placeholder="student@example.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ fontSize: 14, padding: "9px 12px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper2, flex: 1, minWidth: 220 }} />
        <button className="btn" onClick={reset} style={{ background: C.rust, color: "#fff", padding: "9px 18px", borderRadius: 4, fontSize: 14, fontWeight: 700 }}>Reset account</button>
      </div>
      {status && <div style={{ fontSize: 13, fontWeight: 600, color: adminStatusColor(status), marginTop: 8 }}>{status}</div>}
    </Card>
  );
}

/* ============================ COMPLETION CERTIFICATE (client) ============================
 * The visual certificate + the "Add to LinkedIn" / download / verify actions. The cert is minted
 * + emailed server-side on graduation (api/_lib/cert.js via /api/state); the client fetches it
 * with AUTH.getCert() and the public /verify/<id> page reads it from /api/cohorts?cert=<id>. */

// Standalone SVG of the certificate, for download (crisp + printable, no canvas needed).
function buildCertSvg(cert) {
  const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const name = esc(cert.name || "Build Young Graduate");
  const title = esc(certName(cert.track));
  const dateStr = esc(certDate(cert.completedAt));
  const id = esc(cert.certId);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="700" viewBox="0 0 1000 700" font-family="Georgia, 'Times New Roman', serif">
  <rect width="1000" height="700" fill="#ffffff"/>
  <rect x="20" y="20" width="960" height="660" fill="none" stroke="#0067b8" stroke-width="3"/>
  <rect x="32" y="32" width="936" height="636" fill="none" stroke="#e1dfdd" stroke-width="1"/>
  <text x="500" y="118" text-anchor="middle" font-size="30" font-weight="bold" fill="#242424">Build Young</text>
  <text x="500" y="182" text-anchor="middle" font-size="17" letter-spacing="6" fill="#605e5c">CERTIFICATE OF COMPLETION</text>
  <text x="500" y="248" text-anchor="middle" font-size="16" fill="#605e5c">This certifies that</text>
  <text x="500" y="312" text-anchor="middle" font-size="44" font-weight="bold" fill="#242424">${name}</text>
  <text x="500" y="372" text-anchor="middle" font-size="20" fill="#424242">has completed the ${title}</text>
  <text x="500" y="406" text-anchor="middle" font-size="15" fill="#605e5c">building and shipping a real product with Claude Code, then learning to grow and manage what it earns.</text>
  <line x1="180" y1="560" x2="420" y2="560" stroke="#242424"/>
  <text x="300" y="585" text-anchor="middle" font-size="16" fill="#242424">Sunil Garg</text>
  <text x="300" y="605" text-anchor="middle" font-size="12" fill="#605e5c">Founder, Build Young</text>
  <line x1="580" y1="560" x2="820" y2="560" stroke="#242424"/>
  <text x="700" y="585" text-anchor="middle" font-size="16" fill="#242424">${dateStr}</text>
  <text x="700" y="605" text-anchor="middle" font-size="12" fill="#605e5c">Date of completion</text>
  <text x="500" y="652" text-anchor="middle" font-size="11" fill="#605e5c">Credential ID ${id}</text>
</svg>`;
}

// On-screen certificate. `compact` shrinks it for the in-dashboard card vs. the full verify page.
function CertificateView({ cert, compact }) {
  const name = cert.name || "Build Young Graduate";
  return (
    <div style={{ position: "relative", background: "#fff", border: `2px solid ${C.emerald}`, borderRadius: 10, padding: compact ? "26px 22px" : "44px 32px", textAlign: "center", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 7, border: `1px solid ${C.line}`, borderRadius: 8, pointerEvents: "none" }} />
      <div style={{ position: "relative" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "center" }}><Mark size={24} /><span className="disp" style={{ fontWeight: 900, fontSize: 19 }}>Build <span className="grad">Young</span></span></div>
        <div style={{ fontSize: 11.5, letterSpacing: ".18em", color: C.muted, fontWeight: 700, marginTop: 16 }}>CERTIFICATE OF COMPLETION</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 16 }}>This certifies that</div>
        <div className="disp" style={{ fontSize: compact ? 26 : 34, fontWeight: 800, color: C.ink, margin: "6px 0" }}>{name}</div>
        <div style={{ fontSize: 14.5, color: C.ink2, lineHeight: 1.6, maxWidth: 520, margin: "8px auto 0" }}>
          has completed the <b>{certName(cert.track)}</b> — building and shipping a real product with Claude Code, then learning to grow and manage what it earns.
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20, marginTop: 28, textAlign: "left", flexWrap: "wrap" }}>
          <div>
            <div className="disp" style={{ fontSize: 16, fontWeight: 700, color: C.ink, borderBottom: `1px solid ${C.line}`, paddingBottom: 4 }}>Sunil Garg</div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4 }}>Founder, Build Young</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="disp" style={{ fontSize: 16, fontWeight: 700, color: C.ink, borderBottom: `1px solid ${C.line}`, paddingBottom: 4 }}>{certDate(cert.completedAt)}</div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4 }}>Date of completion</div>
          </div>
        </div>
        <div style={{ fontSize: 10.5, color: C.muted, marginTop: 16 }}>Credential ID {cert.certId} · verify at {CONFIG.brandDomain}/verify/{cert.certId}</div>
      </div>
    </div>
  );
}

// The action buttons (Add to LinkedIn / Download / public page) shared by the dashboard card
// and the verify page.
function CertActions({ cert }) {
  const verifyUrl = certVerifyUrl(`https://${CONFIG.brandDomain}`, cert.certId);
  const li = linkedInAddUrl({ track: cert.track, certId: cert.certId, certUrl: verifyUrl, issuedAt: cert.completedAt });
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      <a className="btn" href={li} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8, background: "#0a66c2", color: "#fff", padding: "11px 16px", borderRadius: 4, fontSize: 14, fontWeight: 600 }}><Linkedin size={16} /> Add to LinkedIn</a>
      <button className="btn" onClick={() => downloadFile("build-young-certificate.svg", buildCertSvg(cert), "image/svg+xml")} style={{ background: C.emerald, color: "#fff", padding: "11px 16px", borderRadius: 4, fontSize: 14, fontWeight: 600 }}>Download</button>
      <a className="btn" href={verifyUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", background: C.paper2, color: C.ink, padding: "11px 16px", borderRadius: 4, fontSize: 14, fontWeight: 600 }}>View public page</a>
    </div>
  );
}

// The in-dashboard certificate card (shown once the student has graduated).
function CertificateCard({ cert }) {
  if (!cert) return null;
  return (
    <Card style={{ padding: 20, marginBottom: 12 }}>
      <h3 style={{ fontSize: 16, fontWeight: 800, color: C.ink, margin: "0 0 12px" }}>Your certificate 🎓</h3>
      <CertificateView cert={cert} compact />
      <div style={{ marginTop: 14 }}><CertActions cert={cert} /></div>
      <div style={{ fontSize: 12, color: C.muted, marginTop: 10 }}>We emailed this to you too. Under 16? A parent can add it to their LinkedIn.</div>
    </Card>
  );
}

// Public certificate verification page (no auth) — opened from /verify/<id> + LinkedIn.
function CertifyVerify({ certId, onHome }) {
  const [cert, setCert] = useState(undefined); // undefined = loading, null = not found
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await fetch(`/api/cohorts?cert=${encodeURIComponent(certId)}`);
        if (!r.ok) { if (live) setCert(null); return; }
        const d = await r.json();
        if (live) setCert(d && d.cert ? d.cert : null);
      } catch { if (live) setCert(null); }
    })();
    return () => { live = false; };
  }, [certId]);

  const wrap = { maxWidth: 720, margin: "0 auto", padding: "40px 20px 80px" };
  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={wrap}>
        <div className="disp" {...act(onHome)} style={{ fontWeight: 900, fontSize: 20, cursor: "pointer", marginBottom: 24 }}><Mark size={22} /> Build <span className="grad">Young</span></div>
        {cert === undefined && <Card style={{ padding: 24, color: C.muted }}>Verifying certificate…</Card>}
        {cert === null && (
          <Card style={{ padding: 24 }}>
            <b style={{ color: C.ink }}>Certificate not found.</b>
            <div style={{ fontSize: 13.5, color: C.muted, marginTop: 6 }}>This credential ID doesn't match any Build Young certificate. <span {...act(onHome)} style={{ color: C.emerald, fontWeight: 700, cursor: "pointer" }}>Visit Build Young →</span></div>
          </Card>
        )}
        {cert && (<>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#eef3f0", color: C.green, border: `1px solid ${C.line}`, borderRadius: 999, padding: "6px 14px", fontSize: 13, fontWeight: 700, marginBottom: 14 }}><Check size={15} /> Verified by Build Young</div>
          <CertificateView cert={cert} />
          <div style={{ marginTop: 16 }}><CertActions cert={cert} /></div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 18, lineHeight: 1.6 }}>
            {CERT_ORG} is a live program where teens build a product with AI and learn to grow and manage what it earns. <span {...act(onHome)} style={{ color: C.emerald, fontWeight: 700, cursor: "pointer" }}>Learn more →</span>
          </div>
        </>)}
      </div>
    </div>
  );
}

// Founder console: preview the certificate design + see every issued certificate (founder-gated
// read via /api/funnel?resource=certs). Aggregate-only (name + cohort + date + id).
function CertificatesAdmin() {
  const [certs, setCerts] = useState(null);
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await fetch("/api/funnel?resource=certs");
        const d = r.ok ? await r.json() : {};
        if (live) setCerts(Array.isArray(d.certs) ? d.certs : []);
      } catch { if (live) setCerts([]); }
    })();
    return () => { live = false; };
  }, []);
  const sample = { name: "Sample Student", track: "Builders", completedAt: Date.now(), certId: "sample" };
  return (
    <>
      <Card style={{ padding: 16, marginBottom: 12 }}>
        <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 12 }}>Exactly how a student's certificate looks. It's issued automatically when they complete the 12 weeks, shown on their dashboard, and emailed to them.</div>
        <CertificateView cert={sample} compact />
        <div style={{ marginTop: 12 }}>
          <button className="btn" onClick={() => downloadFile("build-young-certificate-sample.svg", buildCertSvg(sample), "image/svg+xml")} style={{ background: C.emerald, color: "#fff", padding: "9px 16px", borderRadius: 4, fontSize: 14, fontWeight: 600 }}>Download sample</button>
        </div>
      </Card>
      <Card style={{ padding: 16 }}>
        <b style={{ fontSize: 13.5 }}>Issued certificates{certs ? ` (${certs.length})` : ""}</b>
        {certs === null && <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>Loading…</div>}
        {certs && certs.length === 0 && <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>None issued yet — they appear here as students complete the course.</div>}
        {certs && certs.map((c) => (
          <div key={c.certId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "10px 0", borderTop: `1px solid ${C.line}`, fontSize: 13 }}>
            <span style={{ minWidth: 0 }}><b style={{ color: C.ink }}>{c.name || "—"}</b> <span style={{ color: C.muted }}>· {c.track} · {certDate(c.completedAt)}</span></span>
            <a href={certVerifyUrl(`https://${CONFIG.brandDomain}`, c.certId)} target="_blank" rel="noopener noreferrer" style={{ color: C.emerald, fontWeight: 700, whiteSpace: "nowrap" }}>View ↗</a>
          </div>
        ))}
      </Card>
    </>
  );
}

// Founder console: read every student's "Your build" plan (idea + pain + press release) for
// coaching. Founder-gated read via /api/funnel?resource=builds.
function BuildPlansAdmin() {
  const [builds, setBuilds] = useState(null);
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await fetch("/api/funnel?resource=builds");
        const d = r.ok ? await r.json() : {};
        if (live) setBuilds(Array.isArray(d.builds) ? d.builds : []);
      } catch { if (live) setBuilds([]); }
    })();
    return () => { live = false; };
  }, []);

  const idea = (b) => (b.scenario === "custom" ? (b.custom || "Custom idea") : (scenarioLabel(b.scenario) || "—"));
  const block = { fontSize: 13, color: C.ink2, lineHeight: 1.5, whiteSpace: "pre-wrap", background: C.paper, border: `1px solid ${C.line}`, borderRadius: 4, padding: "8px 10px", marginTop: 4 };
  const lab = { fontSize: 10.5, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".04em" };

  return (
    <Card style={{ padding: 16 }}>
      <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 10 }}>What each student chose to build, the customer pain they named, and their press release — for coaching. Updates as students write on their dashboard.</div>
      {builds === null && <div style={{ fontSize: 13, color: C.muted }}>Loading…</div>}
      {builds && builds.length === 0 && <div style={{ fontSize: 13, color: C.muted }}>No plans yet — they appear here as students fill in their plan.</div>}
      {builds && builds.map((b, i) => (
        <div key={b.email || i} style={{ borderTop: i ? `1px solid ${C.line}` : "none", padding: "14px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
            <b style={{ fontSize: 14, color: C.ink }}>{b.name || b.email || "Student"}</b>
            <span style={{ fontSize: 11.5, color: C.muted }}>{b.batchId || ""}{b.email ? ` · ${b.email}` : ""}</span>
          </div>
          <div style={{ marginTop: 6 }}><span style={lab}>Idea</span><div style={block}>{idea(b)}</div></div>
          {b.pain && b.pain.trim() && <div style={{ marginTop: 8 }}><span style={lab}>Customer pain</span><div style={block}>{b.pain}</div></div>}
          {b.pr && b.pr.trim() && <div style={{ marginTop: 8 }}><span style={lab}>Press release</span><div style={block}>{b.pr}</div></div>}
          {b.productSuccess && b.productSuccess.trim() && <div style={{ marginTop: 8 }}><span style={lab}>Product success</span><div style={block}>{b.productSuccess}</div></div>}
          {b.financialSuccess && b.financialSuccess.trim() && <div style={{ marginTop: 8 }}><span style={lab}>Financial success</span><div style={block}>{b.financialSuccess}</div></div>}
        </div>
      ))}
    </Card>
  );
}

// Founder view: families who registered interest for the next cohort (a full-cohort signal). They're
// emailed automatically when a new cohort is added; the list clears afterward. Founder-gated read.
const interestCsv = (rows) => ["name,email,batchId,season,track,date",
  ...rows.map((r) => ["name", "email", "batchId", "season", "track", "date"].map((c) =>
    `"${String(c === "date" ? (r.ts ? new Date(r.ts).toISOString() : "") : (r[c] ?? "")).replace(/"/g, '""')}"`).join(","))].join("\n");

function InterestAdmin() {
  const [list, setList] = useState(null);
  useEffect(() => {
    let live = true;
    (async () => {
      try { const r = await fetch("/api/funnel?resource=interest"); const d = r.ok ? await r.json() : {}; if (live) setList(Array.isArray(d.interest) ? d.interest : []); }
      catch { if (live) setList([]); }
    })();
    return () => { live = false; };
  }, []);
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 12.5, color: C.muted, maxWidth: 640 }}>Families who asked to hear about the next cohort (because one was full) — your overflow demand. They're emailed automatically when you add a new cohort, then this list clears.</div>
        {list && list.length > 0 && <span {...act(() => downloadFile("build-young-interest.csv", interestCsv(list), "text/csv"))} style={{ cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: C.emerald, whiteSpace: "nowrap" }}>Download CSV</span>}
      </div>
      {list === null && <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>Loading…</div>}
      {list && list.length === 0 && <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>No interest captured yet — this fills as cohorts sell out.</div>}
      {list && list.map((r, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderTop: i ? `1px solid ${C.line}` : "none", fontSize: 13 }}>
          <span style={{ minWidth: 0 }}><b style={{ color: C.ink }}>{r.name || "—"}</b> <span style={{ color: C.muted }}>· {r.email}</span></span>
          <span style={{ color: C.muted, whiteSpace: "nowrap" }}>{r.batchId || r.season || ""}{r.ts ? ` · ${new Date(r.ts).toLocaleDateString()}` : ""}</span>
        </div>
      ))}
    </Card>
  );
}

// Founder view of prospective live tutors (Careers → "Teach with us"). Read-only; they're also
// emailed to the founder's inbox as they come in.
function TutorInterestAdmin() {
  const [list, setList] = useState(null);
  useEffect(() => {
    let live = true;
    (async () => {
      try { const r = await fetch("/api/funnel?resource=tutor"); const d = r.ok ? await r.json() : {}; if (live) setList(Array.isArray(d.tutors) ? d.tutors : []); }
      catch { if (live) setList([]); }
    })();
    return () => { live = false; };
  }, []);
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ fontSize: 12.5, color: C.muted, maxWidth: 640 }}>People who applied to teach live (Careers → “Teach with us”). They're also emailed to your inbox as they come in.</div>
      {list === null && <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>Loading…</div>}
      {list && list.length === 0 && <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>No tutor applications yet.</div>}
      {list && list.map((r, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderTop: i ? `1px solid ${C.line}` : "none", fontSize: 13 }}>
          <span style={{ minWidth: 0, display: "flex", flexWrap: "wrap", gap: "2px 8px", alignItems: "baseline" }}>
            <b style={{ color: C.ink }}>{r.email}</b>
            {r.linkedin && <a href={r.linkedin} target="_blank" rel="noopener noreferrer" style={{ color: C.emerald, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}><Linkedin size={12} /> LinkedIn ↗</a>}
          </span>
          <span style={{ color: C.muted, whiteSpace: "nowrap" }}>{r.ts ? new Date(r.ts).toLocaleDateString() : ""}</span>
        </div>
      ))}
    </Card>
  );
}

// Founder view of student showcase submissions (capstone "share your build" — link + feedback).
// Opt-in; `consent` flags whether the student confirmed parental OK to feature it publicly.
function ShowcaseAdmin() {
  const [list, setList] = useState(null);
  useEffect(() => {
    let live = true;
    (async () => {
      try { const r = await fetch("/api/funnel?resource=showcase"); const d = r.ok ? await r.json() : {}; if (live) setList(Array.isArray(d.showcase) ? d.showcase : []); }
      catch { if (live) setList([]); }
    })();
    return () => { live = false; };
  }, []);
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ fontSize: 12.5, color: C.muted, maxWidth: 660 }}>What graduating students shared at the capstone — their product link + feedback (potential testimonials). “Consent” = they confirmed a parent/guardian is OK to feature it. <b>Get explicit parental consent before any public use</b> (they're minors). Enable/disable collection under <b>Settings → Student showcase capture</b>.</div>
      {list === null && <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>Loading…</div>}
      {list && list.length === 0 && <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>No submissions yet.</div>}
      {list && list.map((r, i) => (
        <div key={i} style={{ padding: "10px 0", borderTop: i ? `1px solid ${C.line}` : "none" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
            <span style={{ display: "flex", flexWrap: "wrap", gap: "2px 8px", alignItems: "baseline", minWidth: 0 }}>
              <b style={{ color: C.ink, fontSize: 13.5 }}>{r.name || "—"}</b>
              {r.batchId && <span style={{ fontSize: 12, color: C.muted }}>· {r.batchId}</span>}
              {r.link && <a href={r.link} target="_blank" rel="noopener noreferrer" style={{ color: C.emerald, fontWeight: 700, fontSize: 12.5 }}>Open build ↗</a>}
              {r.videoLink && <a href={r.videoLink} target="_blank" rel="noopener noreferrer" style={{ color: C.turq, fontWeight: 700, fontSize: 12.5 }}>▶ Video ↗</a>}
              {r.claimingPrize && <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: "#fff", background: C.green, borderRadius: 999, padding: "2px 8px" }}>🏆 Prize claim — verify sale</span>}
              <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: r.consent ? C.green : C.gold, background: r.consent ? "#e7f3ee" : "#fbeede", borderRadius: 999, padding: "2px 8px" }}>{r.consent ? "Consent ✓" : "No consent"}</span>
            </span>
            <span style={{ fontSize: 12, color: C.muted, whiteSpace: "nowrap" }}>{r.ts ? new Date(r.ts).toLocaleDateString() : ""}</span>
          </div>
          {r.feedback && <div style={{ fontSize: 13, color: C.ink2, lineHeight: 1.5, marginTop: 5, fontStyle: "italic" }}>“{r.feedback}”</div>}
        </div>
      ))}
    </Card>
  );
}

export default function App() {
  const [route, setRoute] = useState("home"); // home | enroll | call | app | login | setpw | checkemail | founder
  const [history, setHistory] = useState([]); // stack of routes we navigated from
  const [preselect, setPreselect] = useState(null);
  const [state, setState] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [legal, setLegal] = useState(null); // null | "privacy" | "terms"
  const [setpwToken, setSetpwToken] = useState(null);   // token from a ?setpw= link (auth mode)
  const [enrolledTrack, setEnrolledTrack] = useState(""); // cohort track for the check-email screen
  const [enrolledEmail, setEnrolledEmail] = useState(""); // recipient of the set-password email (shown on check-email)
  const [isFounder, setIsFounder] = useState(false); // signed-in user is an admin/founder (from /api/auth/me)
  const [verifyId, setVerifyId] = useState(""); // cert id for the public /verify/<id> page
  const [batches, setBatches] = useState(BATCHES); // live cohort catalog (hydrated from /api/cohorts)
  const [testimonials, setTestimonials] = useState([]); // public consented student showcase
  const [, bumpCfg] = useState(0); // bump to re-render after CONFIG hydration (settings are mutated in place)
  // Hydrate the live, founder-editable config once on mount — the cohort catalog AND the runtime
  // settings (booking link, contact email, LinkedIn) — so founder edits show without a redeploy.
  // Falls back to the code defaults on any failure (offline/demo/tests).
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await fetch("/api/cohorts");
        if (!r.ok) return;
        const cat = await r.json();
        if (!live) return;
        if (cat && Array.isArray(cat.batches) && cat.batches.length) setBatches(cat.batches);
        if (cat && Array.isArray(cat.testimonials)) setTestimonials(cat.testimonials);
        if (cat && Array.isArray(cat.homework) && cat.homework.length === 12) HOMEWORK = cat.homework;
        if (cat && cat.settings && typeof cat.settings === "object") {
          Object.assign(CONFIG, cat.settings); // mutate the shared CONFIG, then re-render to pick it up
          bumpCfg((n) => n + 1);
        }
      } catch (e) { /* keep code defaults */ }
    })();
    return () => { live = false; };
  }, []);
  // Traffic & engagement: record dwell time per screen (anonymous, aggregate). On each route
  // change we log a `screen_view` for the screen just left; on tab-close/hide we flush the current
  // screen + an `exit`. No-op in tests (track() is). See engagement() in src/funnel.js.
  const screenRef = useRef(null);
  useEffect(() => {
    if (!loaded) return;
    const now = Date.now();
    if (screenRef.current) track("screen_view", { screen: screenRef.current.screen, ms: now - screenRef.current.at });
    screenRef.current = { screen: route, at: now };
  }, [route, loaded]);
  useEffect(() => {
    if (!loaded) return;
    const flush = () => {
      if (!screenRef.current) return;
      const { screen, at } = screenRef.current;
      track("screen_view", { screen, ms: Date.now() - at });
      track("exit", { screen });
      screenRef.current = { screen, at: Date.now() }; // reset so a return visit doesn't double-count
    };
    const onVis = () => { if (typeof document !== "undefined" && document.visibilityState === "hidden") flush(); };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVis);
    return () => { window.removeEventListener("pagehide", flush); document.removeEventListener("visibilitychange", onVis); };
  }, [loaded]);
  // Reflect the SPA route in the URL so Vercel Web Analytics records a pageview + time-on-page
  // per screen. Uses replaceState (NOT pushState) — no new browser-history entry, so the in-app
  // Back stack + scroll restoration are untouched. Gated on `loaded` so it never strips the
  // ?enrolled= / ?setpw= / ?founder= params before the load effect reads them.
  useEffect(() => {
    if (!loaded) return;
    if (route === "verify") return; // keep the /verify/<id> URL intact (id lives in the path)
    const PATHS = { home: "/", enroll: "/enroll", call: "/book-call", app: "/dashboard", login: "/login", setpw: "/set-password", checkemail: "/enrolled", founder: "/admin" };
    try { window.history.replaceState({}, "", PATHS[route] || "/"); } catch (e) { /* ignore */ }
  }, [route, loaded]);
  // remember scroll position per route so Back lands where you left off
  const pendingScroll = useRef(null); // px to restore after next render (null = scroll to top)
  const scrollTo = (y) => { try { window.scrollTo(0, y); } catch (e) {} };
  // single-flight lock: a route transition takes one frame; ignore re-fires within it
  // (prevents double-click races — history desync, double-enroll, duplicate emails).
  const navLock = useRef(false);
  const previewRef = useRef(false); // founder is previewing the student dashboard → don't persist
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
  const goHome = () => guard(() => { if (previewRef.current) { previewRef.current = false; setState(null); } pendingScroll.current = 0; setHistory([]); setRoute("home"); });
  const goFounder = () => guard(() => { pendingScroll.current = 0; setHistory([]); setRoute("founder"); });
  // Logged-in "home" target: a founder w/o a student sim → admin console; otherwise the app dashboard.
  const goDashboard = () => guard(() => { pendingScroll.current = 0; setHistory([]); setRoute(isFounder && !state ? "founder" : "app"); });
  // Founder-only: walk the STUDENT dashboard with a throwaway demo state. `previewRef` skips the
  // persist effect so it never writes a demo over the founder's account. previewAllWeeks unlocks
  // every week so all content (Weeks 1–12) is reviewable.
  const previewStudent = () => guard(() => {
    const b = batches[0] || BATCHES[0];
    previewRef.current = true;
    pendingScroll.current = 0; setHistory([]);
    setState(newState({ name: "Preview Student", email: "preview@build-young.com", batch: b.id, track: b.track }));
    setRoute("app");
  });
  // apply the pending scroll after the route's content has rendered
  useLayoutEffect(() => {
    if (pendingScroll.current == null) return;
    const y = pendingScroll.current;
    pendingScroll.current = null;
    // one rAF lets the (taller) page lay out before we restore position
    requestAnimationFrame(() => requestAnimationFrame(() => scrollTo(y)));
  }, [route]);

  // Sign-in succeeded (login or set-password): pull the student's server state (or seed a fresh
  // one from their account) and open the dashboard.
  const hydrateFromServer = async (user) => {
    setIsFounder(!!(user && user.isFounder)); // admin elevation comes from the server (FOUNDER_EMAILS)
    let srv = await AUTH.getState();
    // A founder who isn't enrolled (no cohort + no saved sim) lands on the ADMIN dashboard —
    // not a fabricated student cohort. (Founders who also enrolled keep the student view + Admin link.)
    if (!srv && user && user.isFounder && !user.batchId) {
      pendingScroll.current = 0; setHistory([]); setRoute("founder"); return;
    }
    if (!srv) {
      const b = batches.find((x) => x.id === user.batchId) || batches[0];
      srv = newState({ name: user.name || "", email: user.email, batch: b.id, track: b.track });
      AUTH.putState(srv);
    }
    pendingScroll.current = 0; setHistory([]); setState(srv); setRoute("app");
  };

  // load persisted state — and handle Stripe payment return (?enrolled=) + set-password (?setpw=)
  const didLoad = useRef(false);
  useEffect(() => {
    if (didLoad.current) return; // run once even under StrictMode double-invoke
    didLoad.current = true;
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const paidBatch = params.get("enrolled");
        const setpw = params.get("setpw");

        // ---- PUBLIC CERTIFICATE VERIFICATION: /verify/<id> (no auth, opened from LinkedIn) ----
        const vm = window.location.pathname.match(/^\/verify\/(.+)$/);
        if (vm) { setVerifyId(decodeURIComponent(vm[1])); setRoute("verify"); setLoaded(true); return; }

        // ---- FOUNDER/ADMIN DASHBOARD: hidden route, gated by the session cookie (FOUNDER_EMAILS) ----
        if (params.has("founder")) { setRoute("founder"); setLoaded(true); return; }

        trackVisitOnce(); // top of funnel — once per browser session

        // ---- AUTH MODE: dashboard requires login; state lives server-side ----
        if (CONFIG.authEnabled) {
          if (setpw) {
            window.history.replaceState({}, "", window.location.pathname);
            setSetpwToken(setpw); setRoute("setpw"); setLoaded(true); return;
          }
          if (paidBatch) {
            // The Stripe webhook provisioned the account + emailed the set-password link.
            track("enrolled", { ...cohortMetaFrom(batches, paidBatch), fromCall: _callBookedThisSession }); // funnel: payment completed
            const b = batches.find((x) => x.id === paidBatch);
            // Recover the email they entered at enroll (prefilled into Stripe) to show on the screen.
            const p = readPendingEnroll(); // localStorage, then the cross-subdomain cookie
            const pendingEmail = p ? (p.email || "") : "";
            clearPendingEnroll();
            window.history.replaceState({}, "", window.location.pathname);
            setEnrolledTrack(b ? b.track : ""); setEnrolledEmail(pendingEmail); setRoute("checkemail"); setLoaded(true); return;
          }
          const user = await AUTH.me();
          if (user) {
            setIsFounder(!!user.isFounder);
            // Respect the URL on load (refresh/bookmark): the app/admin paths restore that view;
            // marketing paths (/, /enroll, …) stay put — a logged-in user is NOT bounced off the
            // home page (the nav shows "Admin →" / "My dashboard →" to get back in).
            const path = window.location.pathname;
            if (path === "/admin") { pendingScroll.current = 0; setRoute("founder"); }
            else if (path === "/dashboard") { await hydrateFromServer(user); }
          }
          setLoaded(true); return;
        }

        // ---- DEMO MODE: self-contained localStorage flow (no login) ----
        if (paidBatch) {
          const pending = readPendingEnroll();
          const b = batches.find((x) => x.id === paidBatch);
          if (b) {
            const student = pending && pending.batch === paidBatch
              ? pending
              : { name: "", email: (pending && pending.email) || "", batch: paidBatch, track: b.track };
            clearPendingEnroll();
            window.history.replaceState({}, "", window.location.pathname);
            track("enrolled", { ...cohortMetaFrom(batches, paidBatch), fromCall: _callBookedThisSession }); // funnel: payment completed
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

  // persist state — server-side (debounced) in auth mode, else local window.storage.
  // Skipped entirely while a founder previews the student dashboard (throwaway demo state).
  useEffect(() => {
    if (!loaded || !state || previewRef.current) return;
    if (CONFIG.authEnabled) {
      const id = setTimeout(() => AUTH.putState(state), 600);
      return () => clearTimeout(id);
    }
    try { if (window.storage) window.storage.set("by:state", JSON.stringify(state)); } catch (e) { }
  }, [state, loaded]);

  const startEnroll = (batchId) => {
    const id = typeof batchId === "string" ? batchId : null;
    track("enroll_started", { ...(id ? cohortMetaFrom(batches, id) : {}), fromCall: _callBookedThisSession });
    setPreselect(id); nav("enroll");
  };
  const startCall = () => nav("call");
  const finishEnroll = (student) => guard(() => {
    // Funnel: payment completed (demo path — the Stripe path fires `enrolled` on the ?enrolled= return).
    track("enrolled", { ...cohortMetaFrom(batches, student.batch), fromCall: _callBookedThisSession });
    if (CONFIG.authEnabled) {
      // Account creation happens server-side (Stripe webhook → set-password email); send the
      // student to the check-email screen rather than straight into the dashboard.
      pendingScroll.current = 0; setHistory([]); setEnrolledTrack(student.track || ""); setEnrolledEmail(student.email || ""); setRoute("checkemail");
      return;
    }
    const w = welcomeEmail(student);
    sendEmail(student.email, w.subject, w.body);
    pendingScroll.current = 0; setHistory([]); setState(newState(student)); setRoute("app");
  });
  const exitApp = () => guard(() => {
    // Founder previewing the student dashboard → drop the throwaway state, back to the console.
    if (previewRef.current) { previewRef.current = false; pendingScroll.current = 0; setHistory([]); setState(null); setRoute("founder"); return; }
    if (CONFIG.authEnabled) { AUTH.logout(); }
    else { try { if (window.storage) window.storage.delete("by:state"); } catch (e) { } }
    pendingScroll.current = 0; setHistory([]); setState(null); setRoute("home");
  });

  // auth handlers passed to the Login / SetPassword screens
  const doLogin = async (email, password) => {
    const res = await AUTH.login(email, password);
    if (res.ok && res.user) await hydrateFromServer(res.user);
    return res;
  };
  const doSetPassword = async (token, password) => {
    const res = await AUTH.setPassword(token, password);
    if (res.ok && res.user) await hydrateFromServer(res.user);
    return res;
  };
  const goLogin = () => guard(() => { pendingScroll.current = 0; setHistory([]); setRoute("login"); });

  return (
    <CohortsContext.Provider value={batches}>
    <div className="flp" style={{ minHeight: "100vh", background: C.paper }}>
      <style>{FONTS}</style>
      <div style={{ background: C.ink, color: C.paper2, textAlign: "center", fontSize: 12.5, fontWeight: 600, lineHeight: 1.5, padding: "8px 16px", position: "relative", zIndex: 3 }}>
        <Coins size={13} color={C.goldLite} style={{ verticalAlign: "-2px", marginRight: 5 }} /> Learning simulation — every dollar shown is <b style={{ whiteSpace: "nowrap" }}>simulated money,</b> not real currency. No real funds are ever involved.
      </div>
      {route === "home" && <Landing onEnroll={startEnroll} onCall={startCall} onLegal={setLegal} onLogin={CONFIG.authEnabled ? goLogin : null} onDashboard={(isFounder || state) ? goDashboard : null} dashLabel={isFounder ? "Admin" : "My dashboard"} testimonials={testimonials} />}
      {route === "enroll" && <Enroll preselect={preselect} onDone={finishEnroll} onBack={goBack} onCall={startCall} onHome={goHome} />}
      {route === "call" && <BookCall onBack={goBack} onHome={goHome} onEnroll={() => startEnroll()} />}
      {route === "app" && state && <Platform state={state} setState={setState} onExit={exitApp} onFounder={isFounder ? goFounder : null} onHome={goHome} />}
      {route === "login" && <Login onLogin={doLogin} onReset={AUTH.requestReset} onHome={goHome} onEnroll={() => startEnroll()} />}
      {route === "setpw" && <SetPassword token={setpwToken} onSetPassword={doSetPassword} onHome={goHome} />}
      {route === "checkemail" && <CheckEmail track={enrolledTrack} email={enrolledEmail} onHome={goHome} onLogin={goLogin} />}
      {route === "founder" && <FounderDashboard onHome={goHome} onPreviewStudent={previewStudent} />}
      {route === "verify" && <CertifyVerify certId={verifyId} onHome={goHome} />}
      {legal && <LegalModal kind={legal} onClose={() => setLegal(null)} />}
    </div>
    </CohortsContext.Provider>
  );
}
