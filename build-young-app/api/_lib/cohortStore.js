// ============================ COHORT CATALOG STORE (KV-backed, code-seeded) ============================
//
// The cohort catalog is editable live by the founder. It lives in KV (`cohorts:catalog`); when KV
// is unset or empty, we fall back to the code defaults in src/cohorts.js — so the site always has a
// valid catalog (and tests/demo work with zero config). Saved via the founder-gated PUT on
// /api/funnel; read publicly via /api/cohorts.

import { BATCHES as DEFAULT_BATCHES, CHECKINS as DEFAULT_CHECKINS } from "../../src/cohorts.js";
import { kvConfigured, kvGet, kvSet } from "./kv.js";

const KEY = "cohorts:catalog";

// Default catalog from code (seed/fallback). Each batch carries its own stripeLink now.
export function defaultCatalog() {
  return { batches: DEFAULT_BATCHES.map((b) => ({ stripeLink: "", ...b })), checkins: DEFAULT_CHECKINS };
}

export async function loadCatalog() {
  if (!kvConfigured()) return defaultCatalog();
  try {
    const raw = await kvGet(KEY);
    if (raw) {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (parsed && Array.isArray(parsed.batches) && parsed.batches.length) return parsed;
    }
  } catch { /* fall through to defaults */ }
  return defaultCatalog();
}

const str = (v, fb = "") => (typeof v === "string" ? v : fb);
const num = (v, fb = 0) => (Number.isFinite(+v) ? +v : fb);

// Validate + normalize an incoming catalog: enforce fields/types, drop junk, dedupe ids.
export function sanitizeCatalog(input) {
  const seen = new Set();
  const batches = (input && Array.isArray(input.batches) ? input.batches : [])
    .map((b) => ({
      id: str(b && b.id).trim(),
      season: str(b && b.season).trim() || "fall",
      track: str(b && b.track).trim() || "Builders",
      start: str(b && b.start).trim(),
      day: str(b && b.day).trim(),
      seats: Math.max(0, Math.round(num(b && b.seats, 0))),
      price: Math.max(0, Math.round(num(b && b.price, 0))),
      zoom: str(b && b.zoom).trim(),
      stripeLink: str(b && b.stripeLink).trim(),
    }))
    .filter((b) => b.id && !seen.has(b.id) && (seen.add(b.id), true));
  const checkins = Math.max(0, Math.round(num(input && input.checkins, DEFAULT_CHECKINS)));
  return { batches, checkins };
}

export async function saveCatalog(input) {
  const clean = sanitizeCatalog(input);
  if (!clean.batches.length) return { ok: false, error: "at least one cohort with an id is required" };
  if (!kvConfigured()) return { ok: false, error: "store not configured" };
  try {
    await kvSet(KEY, JSON.stringify(clean));
  } catch {
    return { ok: false, error: "save failed" };
  }
  return { ok: true, catalog: clean };
}
