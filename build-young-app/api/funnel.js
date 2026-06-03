// ============================ FUNNEL: INGEST (POST) + READ (GET) ============================
//
// One serverless function for both ends of the funnel pipeline (kept together to stay under the
// Hobby-plan function cap):
//   • POST /api/funnel  — append one aggregate-only event to the durable stream (fired by
//     track() in src/App.jsx). No auth; a strict prop allowlist drops anything but operational
//     fields — NO email/name ever persisted.
//   • GET/PUT/DELETE /api/funnel — founder-only (read funnel + admin allowlist; save cohorts/admins;
//     exports. Founder-gated: GET/PUT/DELETE require a logged-in founder session (FOUNDER_EMAILS allowlist ∪ KV).
//
// The dashboard aggregates client-side via src/funnel.js (the single source of truth), so this
// endpoint is just gated storage.

import { kvConfigured, kvCommand, kvDel } from "./_lib/kv.js";
import { saveCatalog } from "./_lib/cohortStore.js";
import { saveSettings } from "./_lib/settingsStore.js";
import { saveHomework } from "./_lib/homeworkStore.js";
import { listCerts } from "./_lib/cert.js";
import { listBuildPlans } from "./_lib/buildPlans.js";
import { normalizeEmail, requireFounder, loadFounderEmails, saveFounderEmails } from "./_lib/auth.js";

const KEY = "funnel:events";
const CAP = 100000; // keep only the most recent N events (LTRIM after each push)

const EVENTS = new Set([
  "visited", "enroll_started", "call_booked", "enrolled",
  "class_started", "week_advanced", "graduated", "checkin_completed", "withdrawn",
  "screen_view", "exit", // traffic & engagement: per-screen dwell + exit screen
]);
const ALLOWED_PROPS = ["season", "track", "batchId", "week", "checkin", "refundTier", "refundCents", "priceCents", "fromCall", "stage", "source", "screen", "ms", "reason"];

// Admin gate: a logged-in founder (session email on the allowlist). 403 otherwise.
async function founderGate(req, res) {
  if (!(await requireFounder(req))) { res.status(403).json({ error: "Forbidden — sign in as a founder." }); return false; }
  return true;
}
async function readRaw(req) {
  return await new Promise((resolve) => {
    let data = ""; req.on("data", (c) => { data += c; }); req.on("end", () => resolve(data)); req.on("error", () => resolve(""));
  });
}

// --- POST: ingest one event ---
async function ingest(req, res) {
  if (!kvConfigured()) { res.status(200).json({ ok: false, reason: "store not configured" }); return; }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || typeof body !== "object") { try { body = JSON.parse(await readRaw(req)); } catch { body = null; } }

  const event = body && body.event;
  if (!EVENTS.has(event)) { res.status(400).json({ error: "unknown event" }); return; }

  const src = (body.props && typeof body.props === "object") ? body.props : {};
  const props = {};
  for (const k of ALLOWED_PROPS) if (src[k] !== undefined && src[k] !== null) props[k] = src[k];

  const record = JSON.stringify({ event, ts: Date.now(), props });
  try {
    await kvCommand(["RPUSH", KEY, record]);
    await kvCommand(["LTRIM", KEY, String(-CAP), "-1"]);
  } catch { res.status(200).json({ ok: false }); return; }
  res.status(200).json({ ok: true });
}

// --- GET: founder-gated read of the stream (or ?resource=certs → issued certificates) ---
async function read(req, res) {
  if (!(await founderGate(req, res))) return;

  if (req.query && req.query.resource === "certs") {
    const certs = await listCerts();
    res.status(200).json({ certs });
    return;
  }

  if (req.query && req.query.resource === "builds") {
    const builds = await listBuildPlans();
    res.status(200).json({ builds });
    return;
  }

  const founders = await loadFounderEmails();
  if (!kvConfigured()) { res.status(200).json({ events: [], founders }); return; }

  let raw = [];
  try { raw = (await kvCommand(["LRANGE", KEY, "0", "-1"])) || []; } catch { raw = []; }
  const events = raw
    .map((r) => { try { return typeof r === "string" ? JSON.parse(r) : r; } catch { return null; } })
    .filter(Boolean);
  res.status(200).json({ events, founders });
}

async function readBody(req) {
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || typeof body !== "object") { try { body = JSON.parse(await readRaw(req)); } catch { body = null; } }
  return body;
}

// --- PUT (default): founder saves the cohort catalog ---
async function saveCohorts(req, res) {
  if (!(await founderGate(req, res))) return;
  const result = await saveCatalog((await readBody(req)) || {});
  res.status(result.ok ? 200 : 400).json(result);
}

// --- PUT ?resource=founders: founder adds/removes admins on the allowlist ---
async function saveFounders(req, res) {
  if (!(await founderGate(req, res))) return;
  const body = await readBody(req);
  const result = await saveFounderEmails((body && body.emails) || []);
  res.status(result.ok ? 200 : 400).json(result);
}

// --- PUT ?resource=settings: founder saves the public runtime settings (booking link, etc.) ---
async function saveSiteSettings(req, res) {
  if (!(await founderGate(req, res))) return;
  const result = await saveSettings((await readBody(req)) || {});
  res.status(result.ok ? 200 : 400).json(result);
}

// --- PUT ?resource=homework: founder saves the 12 weeks' homework/prep text ---
async function saveCourseHomework(req, res) {
  if (!(await founderGate(req, res))) return;
  const body = await readBody(req);
  const result = await saveHomework((body && body.homework) || []);
  res.status(result.ok ? 200 : 400).json(result);
}

// --- DELETE: founder resets a test account (user record + sim state) by email ---
async function resetAccount(req, res) {
  if (!(await founderGate(req, res))) return;
  if (!kvConfigured()) { res.status(200).json({ ok: false, reason: "store not configured" }); return; }
  const email = normalizeEmail((req.query && req.query.email) || "");
  if (!email || !email.includes("@")) { res.status(400).json({ error: "Provide ?email=<address>" }); return; }
  try {
    await kvDel(`user:${email}`);
    await kvDel(`state:${email}`);
  } catch { res.status(200).json({ ok: false }); return; }
  res.status(200).json({ ok: true, deleted: [`user:${email}`, `state:${email}`] });
}

export default async function handler(req, res) {
  if (req.method === "POST") return ingest(req, res);     // public: track an event
  if (req.method === "GET") return read(req, res);        // founder: read funnel events
  if (req.method === "PUT") {                              // founder: save cohorts, admins, or settings
    if (req.query && req.query.resource === "founders") return saveFounders(req, res);
    if (req.query && req.query.resource === "settings") return saveSiteSettings(req, res);
    if (req.query && req.query.resource === "homework") return saveCourseHomework(req, res);
    return saveCohorts(req, res);
  }
  if (req.method === "DELETE") return resetAccount(req, res); // founder: reset a test account
  res.status(405).json({ error: "Method not allowed" });
}
