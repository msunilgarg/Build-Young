// ============================ SITE SETTINGS STORE (KV-backed, code-seeded) ============================
//
// The founder-editable runtime settings live in KV (`settings:site`); when KV is unset or empty
// we fall back to the code defaults in src/site.js — so the site always has valid settings (and
// tests/demo work with zero config). Saved via the founder-gated PUT ?resource=settings on
// /api/funnel; read publicly (folded into /api/cohorts) so one fetch hydrates the public site.

import { SITE_DEFAULTS, SETTINGS_KEYS } from "../../src/site.js";
import { kvConfigured, kvGet, kvSet } from "./kv.js";
import { SCENARIO_MODEL, SCENARIO_MODELS } from "./scenarioAgent.js";
import { REVIEW_MODEL, REVIEW_MODELS } from "./reviewAgent.js";

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

// founderPhoto is shipped publicly (folded into /api/cohorts) and inlined on the page, so guard it:
// accept only an empty string, a data:image/… URI, or an http(s) URL, and cap the size so a huge
// blob can't bloat the public payload. Anything else → "" (the bundled default photo is used).
const MAX_PHOTO_CHARS = 300 * 1024; // ~300 KB of data-URI text; a console-resized square is ~25 KB
function sanitizePhoto(v) {
  if (typeof v !== "string") return "";
  const s = v.trim();
  if (s === "" || s.length > MAX_PHOTO_CHARS) return "";
  return /^data:image\/[a-z+]+;base64,/i.test(s) || /^https?:\/\//i.test(s) ? s : "";
}

// Keep only the known keys, coerce to trimmed strings, and fill any gap from the defaults — so a
// saved blob can never introduce junk fields or drop a key the client expects.
export function sanitizeSettings(input) {
  const out = {};
  for (const k of SETTINGS_KEYS) {
    const v = input && input[k];
    if (typeof SITE_DEFAULTS[k] === "boolean") {
      // Boolean flags: accept a real boolean or the strings "true"/"on"; everything else → default.
      out[k] = typeof v === "boolean" ? v : (v === "true" || v === "on" ? true : (v === "false" || v === "off" ? false : SITE_DEFAULTS[k]));
    } else if (k === "founderPhoto") {
      out[k] = sanitizePhoto(v);
    } else {
      out[k] = typeof v === "string" ? v.trim() : SITE_DEFAULTS[k];
    }
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
// notifyEmail = where founder alerts go. scenarioAgentEnabled/scenarioModel = the Week-9 funnel agent;
// reviewAgentEnabled/reviewModel = the "Check my work" agent (SPECS/008) — separate cost lever. The API
// KEY itself stays a host env var (never stored here). All server-only.
const OPS_DEFAULTS = { notifyEmail: "", scenarioAgentEnabled: true, scenarioModel: SCENARIO_MODEL, reviewAgentEnabled: true, reviewModel: REVIEW_MODEL };

export function defaultOps() {
  return { ...OPS_DEFAULTS };
}

export function sanitizeOps(input) {
  const i = input || {};
  const bool = (v, d) => typeof v === "boolean" ? v : (v === "true" || v === "on" ? true : (v === "false" || v === "off" ? false : d));
  return {
    notifyEmail: typeof i.notifyEmail === "string" ? i.notifyEmail.trim() : OPS_DEFAULTS.notifyEmail,
    scenarioAgentEnabled: bool(i.scenarioAgentEnabled, OPS_DEFAULTS.scenarioAgentEnabled),
    scenarioModel: SCENARIO_MODELS.includes(i.scenarioModel) ? i.scenarioModel : OPS_DEFAULTS.scenarioModel,
    reviewAgentEnabled: bool(i.reviewAgentEnabled, OPS_DEFAULTS.reviewAgentEnabled),
    reviewModel: REVIEW_MODELS.includes(i.reviewModel) ? i.reviewModel : OPS_DEFAULTS.reviewModel,
  };
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
  if (!kvConfigured()) return { ok: false, error: "store not configured" };
  // Merge over the CURRENT ops so a partial save (e.g. only notifyEmail) can't reset the others.
  const current = await loadOps();
  const clean = sanitizeOps({ ...current, ...(input || {}) });
  try {
    await kvSet(OPS_KEY, JSON.stringify(clean));
  } catch {
    return { ok: false, error: "save failed" };
  }
  return { ok: true, ops: clean };
}
