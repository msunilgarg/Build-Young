// ============================ SITE SETTINGS STORE (KV-backed, code-seeded) ============================
//
// The founder-editable runtime settings live in KV (`settings:site`); when KV is unset or empty
// we fall back to the code defaults in src/site.js — so the site always has valid settings (and
// tests/demo work with zero config). Saved via the founder-gated PUT ?resource=settings on
// /api/funnel; read publicly (folded into /api/cohorts) so one fetch hydrates the public site.

import { SITE_DEFAULTS, SETTINGS_KEYS } from "../../src/site.js";
import { kvConfigured, kvGet, kvSet } from "./kv.js";

const KEY = "settings:site";

export function defaultSettings() {
  return { ...SITE_DEFAULTS };
}

export async function loadSettings() {
  if (!kvConfigured()) return defaultSettings();
  try {
    const raw = await kvGet(KEY);
    if (raw) {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (parsed && typeof parsed === "object") return sanitizeSettings(parsed);
    }
  } catch { /* fall through to defaults */ }
  return defaultSettings();
}

// Keep only the known keys, coerce to trimmed strings, and fill any gap from the defaults — so a
// saved blob can never introduce junk fields or drop a key the client expects.
export function sanitizeSettings(input) {
  const out = {};
  for (const k of SETTINGS_KEYS) {
    const v = input && input[k];
    out[k] = typeof v === "string" ? v.trim() : SITE_DEFAULTS[k];
  }
  return out;
}

export async function saveSettings(input) {
  const clean = sanitizeSettings(input || {});
  if (!kvConfigured()) return { ok: false, error: "store not configured" };
  try {
    await kvSet(KEY, JSON.stringify(clean));
  } catch {
    return { ok: false, error: "save failed" };
  }
  return { ok: true, settings: clean };
}

// ---------------------------------------------------------------------------------------------
// PRIVATE ops settings — server-only, founder-edited, NEVER returned publicly or shipped to the
// client bundle (unlike the public site settings above). Right now: notifyEmail = where founder
// alerts (e.g. new tutor applications) are sent. Empty = fall back to the code default at the use
// site. Kept out of SITE_DEFAULTS on purpose so it can't leak via /api/cohorts or the bundle.
const OPS_KEY = "settings:ops";
const OPS_DEFAULTS = { notifyEmail: "" };
const OPS_KEYS = Object.keys(OPS_DEFAULTS);

export function defaultOps() {
  return { ...OPS_DEFAULTS };
}

export function sanitizeOps(input) {
  const out = {};
  for (const k of OPS_KEYS) {
    const v = input && input[k];
    out[k] = typeof v === "string" ? v.trim() : OPS_DEFAULTS[k];
  }
  return out;
}

export async function loadOps() {
  if (!kvConfigured()) return defaultOps();
  try {
    const raw = await kvGet(OPS_KEY);
    if (raw) {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (parsed && typeof parsed === "object") return sanitizeOps(parsed);
    }
  } catch { /* fall through to defaults */ }
  return defaultOps();
}

export async function saveOps(input) {
  const clean = sanitizeOps(input || {});
  if (!kvConfigured()) return { ok: false, error: "store not configured" };
  try {
    await kvSet(OPS_KEY, JSON.stringify(clean));
  } catch {
    return { ok: false, error: "save failed" };
  }
  return { ok: true, ops: clean };
}
