import React from "react";
import { BATCHES } from "./cohorts.js";
import { SITE_DEFAULTS } from "./site.js";

// Client-side app library: runtime CONFIG (mutated in place by the settings hydrate, so every
// importer shares one object), the cohort catalog context, the auth/state/email fetch clients,
// the pending-enroll round-trip store, and the fire-and-forget funnel tracker. No JSX here.

export const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((e || "").trim());

// Live cohort catalog: the public site hydrates this from /api/cohorts on load (founder-editable
// in the dashboard), defaulting to the code `BATCHES`. Components read it via useCohorts(); App
// owns the fetch. Keeping the code list as the default means tests/demo work with zero config.
export const CohortsContext = React.createContext(BATCHES);
export const useCohorts = () => React.useContext(CohortsContext);
// Funnel event props for a cohort, resolved against the LIVE catalog (no PII).
export const cohortMetaFrom = (batches, batchId) => {
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
  // FOUNDER PREVIEW: founders see every course week unlocked (full activity) so they can review/
  // author all content without advancing the sim. Gated by `&& isFounder` in CoursePanel, so
  // STUDENTS always lock by progress regardless — safe to leave true in production.
  previewAllWeeks: true,
};
// Auth/state API client. Same-origin fetches carry the HttpOnly session cookie automatically.
export async function postJson(url, body) {
  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, ...data };
  } catch (e) {
    return { ok: false, status: 0, error: "Network error — please try again." };
  }
}
export const AUTH = {
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
export function sendEmail(to, subject, body) {
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
export function setPendingEnroll(rec) {
  try { window.localStorage.setItem(PENDING_KEY, JSON.stringify(rec)); } catch (e) {}
  try {
    const secure = location.protocol === "https:" ? "; secure" : "";
    document.cookie = `${PENDING_COOKIE}=${encodeURIComponent(JSON.stringify(rec))}; path=/; max-age=1800; samesite=lax${domainAttr()}${secure}`;
  } catch (e) {}
}
export function readPendingEnroll() {
  try { const v = JSON.parse(window.localStorage.getItem(PENDING_KEY) || "null"); if (v) return v; } catch (e) {}
  try {
    const m = document.cookie.match(new RegExp(`(?:^|; )${PENDING_COOKIE}=([^;]*)`));
    if (m) return JSON.parse(decodeURIComponent(m[1]));
  } catch (e) {}
  return null;
}
export function clearPendingEnroll() {
  try { window.localStorage.removeItem(PENDING_KEY); } catch (e) {}
  try { document.cookie = `${PENDING_COOKIE}=; path=/; max-age=0; samesite=lax${domainAttr()}`; } catch (e) {}
}

// ---- Funnel analytics: fire-and-forget aggregate events to /api/track (see src/funnel.js) ----
// Never throws, never blocks the UI, and is a no-op in tests. sendBeacon is preferred so the
// event survives a navigation/redirect (e.g. handing off to Stripe). NO PII is ever sent.
export function track(event, props = {}) {
  try {
    if (typeof window === "undefined") return;
    if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.MODE === "test") return;
    try { if (window.localStorage && window.localStorage.getItem("by:notrack") === "1") return; } catch (e) {} // founder excluded this browser
    const clean = {};
    for (const k in props) if (props[k] !== undefined && props[k] !== null) clean[k] = props[k];
    const body = JSON.stringify({ event, props: clean });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/funnel", new Blob([body], { type: "application/json" }));
    else fetch("/api/funnel", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  } catch (e) { /* analytics must never break the app */ }
}
// An ephemeral, random per-tab id used ONLY to stitch one visit's screen views into an ordered path
// in the founder console. Lives in sessionStorage, so it's cleared when the tab closes and is NOT
// stable across visits; it carries no name/email/IP — not PII. Best-effort: if storage is blocked
// we just omit it (that visit simply won't appear in the path view).
export function sessionId() {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return null;
    let id = window.sessionStorage.getItem("by:sid");
    if (!id) {
      id = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : (Math.random().toString(36).slice(2) + Date.now().toString(36));
      window.sessionStorage.setItem("by:sid", id);
    }
    return id;
  } catch (e) { return null; }
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
export function trackVisitOnce() {
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      if (window.sessionStorage.getItem("by_visited")) return;
      window.sessionStorage.setItem("by_visited", "1");
    }
  } catch (e) { /* ignore */ }
  track("visited", { source: visitSource() });
}
