// ============================ PUBLIC COHORT CATALOG (read) ============================
//
// GET /api/cohorts → the live cohort catalog ({ batches, checkins }) the public site hydrates
// from on load. Backed by KV (founder-editable), falling back to the code defaults in
// src/cohorts.js so the site always has a valid catalog. Saving is founder-gated via PUT on
// /api/funnel.

import { loadCatalog } from "./_lib/cohortStore.js";

export default async function handler(req, res) {
  if (req.method !== "GET") { res.status(405).json({ error: "Method not allowed" }); return; }
  const catalog = await loadCatalog();
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json(catalog);
}
