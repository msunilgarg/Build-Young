// ============================ COHORT CATALOG STORE (KV-backed, code-seeded) ============================
//
// The cohort catalog is editable live by the founder. It lives in KV (`cohorts:catalog`); when KV
// is unset or empty, we fall back to the code defaults in src/cohorts.js — so the site always has a
// valid catalog (and tests/demo work with zero config). Saved via the founder-gated PUT on
// /api/funnel; read publicly via /api/cohorts.

import { BATCHES as DEFAULT_BATCHES, CHECKINS as DEFAULT_CHECKINS } from "../../src/cohorts.js";
import { SITE_DEFAULTS } from "../../src/site.js";
import { kvConfigured, kvGet, kvSet } from "./kv.js";
import { createAudience } from "./resendAudience.js";

const KEY = "cohorts:catalog";

// Every cohort gets a group email; when one isn't set we derive `<id>@<brand-domain>` so existing
// cohorts (incl. KV catalogs saved before the field existed) always have one to show.
const GROUP_DOMAIN = (String(SITE_DEFAULTS.contactEmail || "").split("@")[1] || "build-young.com");
export const groupEmailFor = (id) => (id ? `${id}@${GROUP_DOMAIN}` : "");
const withGroupEmail = (b) => ({ ...b, groupEmail: (typeof b.groupEmail === "string" && b.groupEmail.trim()) ? b.groupEmail.trim() : groupEmailFor(b.id) });
const normalize = (cat) => ({ ...cat, batches: (cat.batches || []).map(withGroupEmail) });

// Default catalog from code (seed/fallback). Each batch carries its own stripeLink + recordings +
// groupAudienceId (the Resend audience id, filled in on first save when Resend is configured).
export function defaultCatalog() {
  return normalize({ batches: DEFAULT_BATCHES.map((b) => ({ stripeLink: "", recordings: {}, groupAudienceId: "", ...b })), checkins: DEFAULT_CHECKINS });
}

// The cohort PACE: an array (one per 3-hr LESSON) of that lesson's sitting day-offsets from `start`,
// e.g. [[0,2],[7,9], …]. Absent/invalid → omitted entirely (courseDates.cohortLessons regenerates the
// flagship cadence). Each lesson keeps only finite non-negative integers (sorted); empty lessons drop.
function sanitizeLessons(v) {
  if (!Array.isArray(v)) return undefined;
  const clean = v
    .map((sits) => (Array.isArray(sits) ? sits.map((n) => Math.round(num(n, NaN))).filter((n) => Number.isFinite(n) && n >= 0).sort((a, b) => a - b) : []))
    .filter((sits) => sits.length > 0);
  return clean.length ? clean : undefined;
}

export async function loadCatalog() {
  if (!kvConfigured()) return defaultCatalog();
  try {
    const raw = await kvGet(KEY);
    if (raw) {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (parsed && Array.isArray(parsed.batches) && parsed.batches.length) return normalize(parsed);
    }
  } catch { /* fall through to defaults */ }
  return defaultCatalog();
}

const str = (v, fb = "") => (typeof v === "string" ? v : fb);
const num = (v, fb = 0) => (Number.isFinite(+v) ? +v : fb);

// Per-week class recording URLs: { "1": url, … "12": url } — only weeks 1–12 with a non-empty
// string survive. Founder pastes a Zoom cloud-recording link per session; the student's "Rewatch"
// uses it when present (else the live class link).
function sanitizeRecordings(r) {
  const out = {};
  if (r && typeof r === "object") {
    for (let w = 1; w <= 12; w++) {
      const v = r[w] ?? r[String(w)];
      if (typeof v === "string" && v.trim()) out[String(w)] = v.trim();
    }
  }
  return out;
}

// Validate + normalize an incoming catalog: enforce fields/types, drop junk, dedupe ids.
export function sanitizeCatalog(input) {
  const seen = new Set();
  const batches = (input && Array.isArray(input.batches) ? input.batches : [])
    .map((b) => {
      const id = str(b && b.id).trim();
      const lessons = sanitizeLessons(b && b.lessons); // optional accelerated pace (else flagship)
      return {
        id,
        season: str(b && b.season).trim() || "fall",
        track: str(b && b.track).trim() || "Builders",
        start: str(b && b.start).trim(),
        day: str(b && b.day).trim(),
        seats: Math.max(0, Math.round(num(b && b.seats, 0))),
        price: Math.max(0, Math.round(num(b && b.price, 0))),
        zoom: str(b && b.zoom).trim(),
        groupEmail: str(b && b.groupEmail).trim() || groupEmailFor(id),
        groupAudienceId: str(b && b.groupAudienceId).trim(),
        stripeLink: str(b && b.stripeLink).trim(),
        recordings: sanitizeRecordings(b && b.recordings),
        // Editable card copy — blank → the card falls back to CARD_DEFAULTS (so the card is unchanged).
        audience: str(b && b.audience).trim(),
        format: str(b && b.format).trim(),
        blurb: str(b && b.blurb).trim(),
        // Manual progress override (founder): 0 = AUTO (follow the calendar), 1..12 = on that lesson,
        // 13 = graduated. Effective position = this when ≥1, else the calendar (effectivePosition).
        manualLesson: Math.min(13, Math.max(0, Math.round(num(b && b.manualLesson, 0)))),
        // Optional accelerated pace; omitted when absent so the flagship cadence is regenerated.
        ...(lessons ? { lessons } : {}),
      };
    })
    .filter((b) => b.id && !seen.has(b.id) && (seen.add(b.id), true));
  const checkins = Math.max(0, Math.round(num(input && input.checkins, DEFAULT_CHECKINS)));
  return { batches, checkins };
}

export async function saveCatalog(input) {
  const clean = sanitizeCatalog(input);
  if (!clean.batches.length) return { ok: false, error: "at least one cohort with an id is required" };
  if (!kvConfigured()) return { ok: false, error: "store not configured" };
  // Provision a Resend audience (the cohort's broadcast list) for any cohort that doesn't have one
  // yet. Best-effort + key-gated: with no RESEND_API_KEY this is a no-op and the id stays "".
  for (const b of clean.batches) {
    if (!b.groupAudienceId) {
      const id = await createAudience(`Build Young · ${b.id}`);
      if (id) b.groupAudienceId = id;
    }
  }
  try {
    await kvSet(KEY, JSON.stringify(clean));
  } catch {
    return { ok: false, error: "save failed" };
  }
  return { ok: true, catalog: clean };
}
