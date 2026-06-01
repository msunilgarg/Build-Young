// ============================ ROSTER (who to email per cohort) ============================
//
// getRoster(batchId) → [{ email, name, batchId }] for students enrolled in that cohort.
// This is the seam the market-news scheduler (api/cron/market-news.js) reads.
//
// Source order:
//   1. The durable enrollment store (api/_lib/store.js), written by the Stripe webhook
//      (api/stripe-webhook.js) on checkout.session.completed. This is the real source.
//   2. Fallback: a JSON roster in the ROSTER_JSON env var — handy for a pilot cohort or
//      local testing before/without the store, e.g.:
//        ROSTER_JSON='[{"email":"a@x.com","name":"Avery Lee","batchId":"fall-hs-wed"}]'
//
// Returns [] (never throws) when neither source has data, so a missing roster is a graceful
// no-op rather than a crashed cron run.

import { listEnrollments } from "./store.js";

const normalize = (r) => ({ email: r.email, name: r.name || "there", batchId: r.batchId });

function loadRosterEnv() {
  const raw = process.env.ROSTER_JSON;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((r) => r && typeof r.email === "string" && typeof r.batchId === "string");
  } catch {
    return [];
  }
}

export async function getRoster(batchId) {
  // 1. Durable store (Stripe-fed).
  try {
    const fromStore = await listEnrollments(batchId);
    if (fromStore && fromStore.length) return fromStore.map(normalize);
  } catch {
    /* fall through to env fallback */
  }
  // 2. ROSTER_JSON fallback.
  return loadRosterEnv()
    .filter((r) => r.batchId === batchId)
    .map(normalize);
}
