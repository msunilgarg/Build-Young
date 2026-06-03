// ============================ COURSE HOMEWORK STORE (KV-backed, code-seeded) ============================
//
// The 12 weeks' homework/prep text, founder-editable. Lives in KV (`course:homework`); when KV is
// unset or empty we fall back to the code defaults (WEEK_PREP in src/marketMedia.js). Read publicly
// (folded into /api/cohorts so one fetch hydrates the site) and saved via the founder-gated
// PUT /api/funnel?resource=homework. Used by the week-completion email + the 2-days class reminder.

import { WEEK_PREP } from "../../src/marketMedia.js";
import { kvConfigured, kvGet, kvSet } from "./kv.js";

const KEY = "course:homework";

export function defaultHomework() {
  return WEEK_PREP.slice(0, 12);
}

// Always exactly 12 trimmed strings. A founder may intentionally clear a week (empty string =
// "no homework that week"); a missing index falls back to the code default.
export function sanitizeHomework(input) {
  const def = defaultHomework();
  const arr = Array.isArray(input) ? input : [];
  return Array.from({ length: 12 }, (_, i) => (typeof arr[i] === "string" ? arr[i].trim() : (def[i] || "")));
}

export async function loadHomework() {
  if (!kvConfigured()) return defaultHomework();
  try {
    const raw = await kvGet(KEY);
    if (raw) {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) return sanitizeHomework(parsed);
    }
  } catch { /* fall through to defaults */ }
  return defaultHomework();
}

export async function saveHomework(input) {
  const clean = sanitizeHomework(input);
  if (!kvConfigured()) return { ok: false, error: "store not configured" };
  try {
    await kvSet(KEY, JSON.stringify(clean));
  } catch {
    return { ok: false, error: "save failed" };
  }
  return { ok: true, homework: clean };
}
