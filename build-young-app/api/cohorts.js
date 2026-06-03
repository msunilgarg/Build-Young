// ============================ PUBLIC SITE CONFIG (read) ============================
//
// GET /api/cohorts → the live, founder-editable public config the site hydrates on load:
//   { batches, checkins, settings }  — the cohort catalog PLUS the runtime settings
//   (booking link, contact email, LinkedIn). Folded into one read so a single fetch hydrates
//   everything (and we stay under the Hobby function cap). Backed by KV (founder-editable),
//   falling back to the code defaults so the site always has valid config. Saving is
//   founder-gated via PUT on /api/funnel.
//
// ALSO (folded in to avoid a new function): GET /api/cohorts?cert=<id> → { cert } — the PUBLIC,
// no-auth verification read for a completion certificate (the /verify/<id> page + LinkedIn use it).

import { loadCatalog } from "./_lib/cohortStore.js";
import { loadSettings } from "./_lib/settingsStore.js";
import { loadHomework } from "./_lib/homeworkStore.js";
import { getCertById } from "./_lib/cert.js";

export default async function handler(req, res) {
  if (req.method !== "GET") { res.status(405).json({ error: "Method not allowed" }); return; }

  // Public certificate verification (no auth): /api/cohorts?cert=<id>
  if (req.query && req.query.cert) {
    const cert = await getCertById(String(req.query.cert));
    res.setHeader("Cache-Control", "no-store");
    res.status(cert ? 200 : 404).json(cert ? { cert } : { error: "Certificate not found" });
    return;
  }

  const [catalog, settings, homework] = await Promise.all([loadCatalog(), loadSettings(), loadHomework()]);
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ ...catalog, settings, homework });
}
