// ============================ PUBLIC SITE CONFIG (read) ============================
//
// GET /api/cohorts → the live, founder-editable public config the site hydrates on load:
//   { batches, checkins, settings }  — the cohort catalog PLUS the runtime settings
//   (booking link, contact email, LinkedIn). Folded into one read so a single fetch hydrates
//   everything (and we stay under the Hobby function cap). Backed by KV (founder-editable),
//   falling back to the code defaults so the site always has valid config. Saving is
//   founder-gated via PUT on /api/funnel.

import { loadCatalog } from "./_lib/cohortStore.js";
import { loadSettings } from "./_lib/settingsStore.js";

export default async function handler(req, res) {
  if (req.method !== "GET") { res.status(405).json({ error: "Method not allowed" }); return; }
  const [catalog, settings] = await Promise.all([loadCatalog(), loadSettings()]);
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ ...catalog, settings });
}
