// ============================ PARTNERS STORE (KV-backed) ============================
//
// The marketplace/reseller PARTNERS for the third-party-enrollment channel (SPECS/005 + 006).
// Each partner carries its commission (`cutPct`, FOUNDER-ONLY) PLUS public display fields used by
// the public partner showcase (006). Lives in KV (`partners:list`); empty when KV is unset. Saved
// via the founder-gated PUT /api/funnel?resource=partners; the founder reads the full records via
// GET /api/funnel?resource=partners. ONLY the display fields of FEATURED partners are exposed
// publicly (folded into /api/cohorts via publicPartners) — cutPct/settlement NEVER leave this gate.

import { kvConfigured, kvGet, kvSet } from "./kv.js";

const KEY = "partners:list";

const str = (v, fb = "") => (typeof v === "string" ? v : fb);
const num = (v, fb = 0) => (Number.isFinite(+v) ? +v : fb);
const clamp01 = (v) => Math.min(1, Math.max(0, num(v, 0)));
const bool = (v) => (typeof v === "boolean" ? v : v === "true" || v === "on");

// A partner logo ships publicly + inlines on the page, so guard it like the founder photo: accept
// only "", a data:image/… URI, or an http(s) URL, capped so a huge blob can't bloat the payload.
const MAX_LOGO_CHARS = 300 * 1024;
function sanitizeLogo(v) {
  if (typeof v !== "string") return "";
  const s = v.trim();
  if (s === "" || s.length > MAX_LOGO_CHARS) return "";
  return /^data:image\/[a-z+]+;base64,/i.test(s) || /^https?:\/\//i.test(s) ? s : "";
}

// The PUBLIC display fields a featured partner shows on the site (006). NOTHING money-related here —
// this is a hard allowlist, so cutPct + the settlement ledger can never reach a public read.
const PUBLIC_FIELDS = ["id", "displayName", "logo", "publicUrl", "blurb"];

// Settlement ledger (FOUNDER-ONLY, T30): the dated payments a partner has remitted to Build Young.
// Each is { date (free text, e.g. "2026-09-01"), amountCents (≥0 int), note }. Bookkeeping only — we
// never move money; recording a payment just lowers the partner's outstanding balance.
function sanitizePayments(v) {
  return (Array.isArray(v) ? v : [])
    .map((p) => ({ date: str(p && p.date).trim(), amountCents: Math.max(0, Math.round(num(p && p.amountCents, 0))), note: str(p && p.note).trim() }))
    .filter((p) => p.amountCents > 0 || p.date);
}

// Validate + normalize an incoming partners list: enforce fields/types, drop junk, dedupe ids,
// clamp cutPct to a 0..1 fraction.
export function sanitizePartners(input) {
  const seen = new Set();
  return (Array.isArray(input) ? input : [])
    .map((p) => {
      const id = str(p && p.id).trim();
      return {
        id,
        name: str(p && p.name).trim(),               // internal label (founder-only view)
        cutPct: clamp01(p && p.cutPct),              // partner commission as a 0..1 fraction — FOUNDER-ONLY
        displayName: str(p && p.displayName).trim(), // public name on the showcase
        logo: sanitizeLogo(p && p.logo),
        publicUrl: str(p && p.publicUrl).trim(),     // our listing on the partner's platform
        blurb: str(p && p.blurb).trim(),
        featureOnSite: bool(p && p.featureOnSite),
        payments: sanitizePayments(p && p.payments), // FOUNDER-ONLY settlement ledger (never public)
      };
    })
    .filter((p) => p.id && !seen.has(p.id) && (seen.add(p.id), true));
}

export async function loadPartners() {
  if (!kvConfigured()) return [];
  try {
    const raw = await kvGet(KEY);
    if (raw) {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) return sanitizePartners(parsed);
    }
  } catch { /* fall through to empty */ }
  return [];
}

export async function savePartners(input) {
  const clean = sanitizePartners(input);
  if (!kvConfigured()) return { ok: false, error: "store not configured" };
  try {
    await kvSet(KEY, JSON.stringify(clean));
  } catch {
    return { ok: false, error: "save failed" };
  }
  return { ok: true, partners: clean };
}

// The PUBLIC projection: ONLY featured partners, ONLY display fields — a hard allowlist so cutPct
// (and any future settlement data) can never reach a public surface. Used by GET /api/cohorts (006).
export function publicPartners(list) {
  return (Array.isArray(list) ? list : [])
    .filter((p) => p && p.featureOnSite)
    .map((p) => { const o = {}; for (const k of PUBLIC_FIELDS) o[k] = p[k]; return o; });
}
