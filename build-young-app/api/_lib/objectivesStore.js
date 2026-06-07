// ============================ CLASS OBJECTIVES STORE (KV-backed, code-seeded) ============================
//
// The 12 weeks' class objectives ("What you'll learn this class"), founder-editable. Lives in KV
// (`course:objectives`); when KV is unset or empty we fall back to the code defaults (WEEK_OBJECTIVES
// in src/marketMedia.js). Read publicly (folded into /api/cohorts so one fetch hydrates the site) and
// saved via the founder-gated PUT /api/funnel?resource=objectives. Mirrors homeworkStore.js.

import { WEEK_OBJECTIVES } from "../../src/marketMedia.js";
import { kvConfigured, kvGet, kvSet } from "./kv.js";

const KEY = "course:objectives";

export function defaultObjectives() {
  return WEEK_OBJECTIVES.slice(0, 12);
}

// Always exactly 12 trimmed strings. A founder may intentionally clear a week (empty string =
// "no objectives card that week"); a missing index falls back to the code default.
export function sanitizeObjectives(input) {
  const def = defaultObjectives();
  const arr = Array.isArray(input) ? input : [];
  return Array.from({ length: 12 }, (_, i) => (typeof arr[i] === "string" ? arr[i].trim() : (def[i] || "")));
}

export async function loadObjectives() {
  if (!kvConfigured()) return defaultObjectives();
  try {
    const raw = await kvGet(KEY);
    if (raw) {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) return sanitizeObjectives(parsed);
    }
  } catch { /* fall through to defaults */ }
  return defaultObjectives();
}

export async function saveObjectives(input) {
  const clean = sanitizeObjectives(input);
  if (!kvConfigured()) return { ok: false, error: "store not configured" };
  try {
    await kvSet(KEY, JSON.stringify(clean));
  } catch {
    return { ok: false, error: "save failed" };
  }
  return { ok: true, objectives: clean };
}
