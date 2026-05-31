// ============================ ROSTER (enrollment store interface) ============================
//
// The scheduler needs to know WHO is enrolled in each cohort so it can email them. The app
// has NO server-side enrollment store yet — enrollment currently round-trips through Stripe
// Payment Links + an in-browser flow, and the dashboard state lives in localStorage. So this
// module defines the *interface* the scheduler depends on, plus a documented placeholder.
//
// ────────────────────────────────────────────────────────────────────────────────────────
//  PRODUCTION TODO (do not ship the placeholder for real cohorts):
//    Wire getRoster() to the real enrollment source. The recommended path:
//      1. Add a Stripe webhook handler (e.g. /api/stripe-webhook) that listens for
//         checkout.session.completed, reads the batchId from the Payment Link metadata /
//         success URL (?enrolled=<batchId>), and PERSISTS { email, name, batchId } to a
//         durable store (Postgres / Upstash / Airtable / a Google Sheet — anything durable;
//         serverless instances are ephemeral, so in-memory will NOT survive).
//      2. Implement getRoster(batchId) to query that store and return the enrolled students.
//    Until then, the scheduler runs end-to-end but emails nobody unless ROSTER_JSON is set.
// ────────────────────────────────────────────────────────────────────────────────────────
//
// Placeholder implementation: reads a JSON roster from the ROSTER_JSON env var. This lets the
// whole pipeline be exercised (locally or in a real deploy) without standing up a database —
// you can paste a small roster into the env var for a pilot cohort. Shape:
//
//   ROSTER_JSON='[{"email":"a@x.com","name":"Avery Lee","batchId":"fall-hs-wed"}]'
//
// Returns [] (never throws) when the env var is missing or malformed, so a missing roster is
// a graceful no-op rather than a crashed cron run.

function loadRoster() {
  const raw = process.env.ROSTER_JSON;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Keep only well-formed entries with the three fields the scheduler needs.
    return parsed.filter(
      (r) => r && typeof r.email === "string" && typeof r.batchId === "string"
    );
  } catch {
    return [];
  }
}

// getRoster(batchId) → [{ email, name, batchId }] for students enrolled in that cohort.
// This is the single seam production must implement against the real enrollment source.
export async function getRoster(batchId) {
  return loadRoster()
    .filter((r) => r.batchId === batchId)
    .map((r) => ({ email: r.email, name: r.name || "there", batchId: r.batchId }));
}
