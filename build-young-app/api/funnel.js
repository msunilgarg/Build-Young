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
import { saveCatalog, loadCatalog } from "./_lib/cohortStore.js";
import { saveSettings, loadOps, saveOps } from "./_lib/settingsStore.js";
import { loadPartners, savePartners } from "./_lib/partnerStore.js";
import { addEnrollment, listEnrollments, listPartnerEnrollments } from "./_lib/store.js";
import { addInterest, listInterest, notifyInterestOfNewCohorts, addTutorInterest, listTutorInterest, addScheduleRequest, listScheduleRequests, notifyScheduleRequestsOfNewCohorts } from "./_lib/interestStore.js";
import { addShowcase, listShowcase } from "./_lib/showcaseStore.js";
import { saveHomework } from "./_lib/homeworkStore.js";
import { saveObjectives } from "./_lib/objectivesStore.js";
import { listCerts } from "./_lib/cert.js";
import { listBuildPlans } from "./_lib/buildPlans.js";
import { listRefundRequests } from "./_lib/refundStore.js";
import { addQuestion, listQuestions } from "./_lib/questionStore.js";
import { normalizeEmail, requireFounder, loadFounderEmails, saveFounderEmails } from "./_lib/auth.js";
import { generateScenarios } from "./_lib/scenarioAgent.js";

const KEY = "funnel:events";
const CAP = 100000; // keep only the most recent N events (LTRIM after each push)

const EVENTS = new Set([
  "visited", "enroll_started", "call_booked", "enrolled",
  "class_started", "week_advanced", "graduated", "checkin_completed", "withdrawn",
  "screen_view", "exit", // traffic & engagement: per-screen dwell + exit screen
  "schedule_requested", // demand signal: a visitor asked for a different schedule/timezone
  "hesitation", // drop-off signal: a visitor told us what's holding them back on Enroll
]);
const ALLOWED_PROPS = ["season", "track", "batchId", "week", "checkin", "refundTier", "refundCents", "priceCents", "fromCall", "stage", "source", "screen", "ms", "reason", "sid"];

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

  // The path-stitching session id is a random, ephemeral per-tab token (no PII). Hard-cap its
  // shape so a crafted POST can't stash anything large or unexpected under it.
  if (props.sid !== undefined) {
    const sid = String(props.sid).replace(/[^a-zA-Z0-9-]/g, "").slice(0, 40);
    if (sid) props.sid = sid; else delete props.sid;
  }

  // Geography: stamp the visitor's country (2-letter code) server-side from Vercel's geo header on
  // `visited`. Country-level only — no city/precise location, no IP stored. Empty when not on Vercel.
  // Stamped server-side (NOT in ALLOWED_PROPS) so a crafted POST can't spoof geography.
  if (event === "visited") {
    const cc = (req.headers && (req.headers["x-vercel-ip-country"] || req.headers["X-Vercel-IP-Country"])) || "";
    const country = String(cc).trim().toUpperCase().slice(0, 2);
    if (/^[A-Z]{2}$/.test(country)) {
      props.country = country;
      // For US visits, also stamp the 2-letter state/region (Vercel's subdivision header).
      // State-level only — no city, no IP. Server-stamped too, so it can't be spoofed.
      if (country === "US") {
        const rr = (req.headers && (req.headers["x-vercel-ip-country-region"] || req.headers["X-Vercel-IP-Country-Region"])) || "";
        const region = String(rr).trim().toUpperCase().slice(0, 3);
        if (/^[A-Z]{2,3}$/.test(region)) props.region = region;
      }
    }
  }

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

  if (req.query && req.query.resource === "interest") {
    res.status(200).json({ interest: await listInterest() });
    return;
  }

  if (req.query && req.query.resource === "tutor") {
    res.status(200).json({ tutors: await listTutorInterest() });
    return;
  }

  if (req.query && req.query.resource === "schedule") {
    res.status(200).json({ schedule: await listScheduleRequests() });
    return;
  }

  if (req.query && req.query.resource === "refunds") {
    res.status(200).json({ refunds: await listRefundRequests() });
    return;
  }

  if (req.query && req.query.resource === "questions") {
    res.status(200).json({ questions: await listQuestions() });
    return;
  }

  if (req.query && req.query.resource === "ops") {
    // anthropicKeyPresent: just a boolean (never the key) so the dashboard can show live agent status.
    res.status(200).json({ ops: await loadOps(), anthropicKeyPresent: !!process.env.ANTHROPIC_API_KEY });
    return;
  }

  if (req.query && req.query.resource === "showcase") {
    res.status(200).json({ showcase: await listShowcase() });
    return;
  }

  if (req.query && req.query.resource === "partners") {
    // FULL records (incl. cutPct) — founder-only. The PUBLIC site only ever sees the display fields
    // of featured partners (publicPartners, folded into /api/cohorts).
    res.status(200).json({ partners: await loadPartners() });
    return;
  }

  if (req.query && req.query.resource === "partner-enrollments") {
    // Founder-only: every partner (third-party) enrollment across cohorts — pending + onboarded.
    const catalog = await loadCatalog();
    const enrollments = await listPartnerEnrollments((catalog.batches || []).map((b) => b.id));
    res.status(200).json({ enrollments });
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

// --- POST ?resource=scenarios: the Week-9 agent. Generates practice funnels from the student's own
// funnel metrics. Public (no PII — just stage labels). Key-gated like send-email: returns
// {configured:false} when ANTHROPIC_API_KEY isn't set, so the client falls back to a local generator. ---
async function makeScenarios(req, res) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const ops = await loadOps();                       // founder dashboard: on/off + model
  if (!apiKey || ops.scenarioAgentEnabled === false) { res.status(200).json({ configured: false, scenarios: [] }); return; }
  const body = (await readBody(req)) || {};
  const stages = Array.isArray(body.stages) ? body.stages : [];
  const level = body.level === "advanced" ? "advanced" : "standard";
  let scenarios = [];
  try { scenarios = await generateScenarios({ stages, level, apiKey, model: ops.scenarioModel }); } catch { scenarios = []; }
  res.status(200).json({ configured: true, scenarios });
}

// --- PUT (default): founder saves the cohort catalog. If this introduces a NEW cohort, everyone
// who registered interest (when something was full) is emailed automatically that it opened. ---
async function saveCohorts(req, res) {
  if (!(await founderGate(req, res))) return;
  const before = await loadCatalog(); // to spot newly-added cohorts
  const result = await saveCatalog((await readBody(req)) || {});
  if (result.ok) {
    const oldIds = new Set((before.batches || []).map((b) => b.id));
    const added = (result.catalog.batches || []).filter((b) => !oldIds.has(b.id));
    if (added.length) { try { await notifyInterestOfNewCohorts(added); } catch { /* best-effort */ } try { await notifyScheduleRequestsOfNewCohorts(added); } catch { /* best-effort */ } }
  }
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

// --- PUT ?resource=partners: founder saves the partners registry (marketplace/reseller channel). ---
async function savePartnersList(req, res) {
  if (!(await founderGate(req, res))) return;
  const body = await readBody(req);
  const result = await savePartners((body && body.partners) || []);
  res.status(result.ok ? 200 : 400).json(result);
}

// --- PUT ?resource=ops: founder saves the PRIVATE ops settings (notifications email). ---
async function saveOpsSettings(req, res) {
  if (!(await founderGate(req, res))) return;
  const result = await saveOps((await readBody(req)) || {});
  res.status(result.ok ? 200 : 400).json(result);
}

// --- PUT ?resource=homework: founder saves the 12 weeks' homework/prep text ---
async function saveCourseHomework(req, res) {
  if (!(await founderGate(req, res))) return;
  const body = await readBody(req);
  const result = await saveHomework((body && body.homework) || []);
  res.status(result.ok ? 200 : 400).json(result);
}

// --- PUT ?resource=objectives: founder saves the 12 weeks' class objectives ---
async function saveCourseObjectives(req, res) {
  if (!(await founderGate(req, res))) return;
  const body = await readBody(req);
  const result = await saveObjectives((body && body.objectives) || []);
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

// --- DELETE ?resource=events: founder wipes the whole funnel stream (start clean). Aggregate events
// carry no identity (no email/name/session id), so individual sessions can't be removed — this
// clears ALL events. ---
async function clearFunnel(req, res) {
  if (!(await founderGate(req, res))) return;
  if (!kvConfigured()) { res.status(200).json({ ok: false, reason: "store not configured" }); return; }
  try { await kvDel(KEY); } catch { res.status(200).json({ ok: false }); return; }
  res.status(200).json({ ok: true, cleared: KEY });
}

// --- POST ?resource=partner-enroll: FOUNDER-ONLY. Manually create a PENDING partner (third-party)
// enrollment — NO Stripe, NO email, NO Resend audience, NOT yet counted as `enrolled`. Price + cut %
// are SNAPSHOTTED server-side (authoritative) from the cohort + partner. An explicit "Start onboarding"
// action (T28) later sends the email + provisions access. Saving here is deliberately inert. ---
async function addPartnerEnrollment(req, res) {
  if (!(await founderGate(req, res))) return;
  const body = (await readBody(req)) || {};
  const email = normalizeEmail(body.email || "");
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const batchId = String(body.batchId || "").trim();
  const partnerId = String(body.partner || "").trim();
  const externalRef = typeof body.externalRef === "string" ? body.externalRef.trim() : "";
  if (!email || !email.includes("@")) { res.status(400).json({ ok: false, error: "Provide a valid email" }); return; }
  if (!batchId) { res.status(400).json({ ok: false, error: "Pick a cohort" }); return; }
  if (!partnerId) { res.status(400).json({ ok: false, error: "Pick a partner" }); return; }
  const [catalog, partners] = await Promise.all([loadCatalog(), loadPartners()]);
  const cohort = (catalog.batches || []).find((b) => b.id === batchId);
  const partner = partners.find((p) => p.id === partnerId);
  if (!cohort) { res.status(400).json({ ok: false, error: "Unknown cohort" }); return; }
  if (!partner) { res.status(400).json({ ok: false, error: "Unknown partner" }); return; }
  const existing = await listEnrollments(batchId);
  if (existing.some((e) => e.email === email)) { res.status(409).json({ ok: false, error: "That email is already enrolled in this cohort" }); return; }
  const result = await addEnrollment({
    email, name, batchId,
    paymentSource: "partner", partner: partnerId, externalRef,
    priceCents: Math.round((cohort.price || 0) * 100), cutPct: partner.cutPct || 0,
    onboarded: false, // PENDING — inert until "Start onboarding" (T28)
  });
  res.status(result.ok ? 200 : 400).json(result.ok ? { ok: true } : { ok: false, error: result.reason || "save failed" });
}

// --- POST ?resource=interest: public — capture a family's interest when a cohort is full (so we
// can notify them about the NEXT cohort). ---
async function saveInterest(req, res) {
  const result = await addInterest((await readBody(req)) || {});
  res.status(result.ok || result.reason ? 200 : 400).json(result);
}

// --- POST ?resource=tutor: public — a prospective live tutor submits their email + LinkedIn
// (Careers → "Teach with us"). We email it to the founder and store it. ---
async function saveTutorInterest(req, res) {
  const result = await addTutorInterest((await readBody(req)) || {});
  res.status(result.ok ? 200 : 400).json(result);
}

// --- POST ?resource=schedule: public — a visitor requests a different cohort schedule/timezone. ---
async function saveScheduleRequest(req, res) {
  const result = await addScheduleRequest((await readBody(req)) || {});
  res.status(result.ok ? 200 : 400).json(result);
}

// --- POST ?resource=question: public — a visitor submits a question not covered by the FAQ. ---
async function saveQuestion(req, res) {
  const result = await addQuestion((await readBody(req)) || {});
  res.status(result.ok ? 200 : 400).json(result);
}

// --- POST ?resource=showcase: public — a graduating student shares their build link + feedback
// at the capstone (gated client-side by the founder's showcaseEnabled flag). ---
async function saveShowcase(req, res) {
  const result = await addShowcase((await readBody(req)) || {});
  res.status(result.ok || result.reason ? 200 : 400).json(result);
}

export default async function handler(req, res) {
  if (req.method === "POST") {
    if (req.query && req.query.resource === "interest") return saveInterest(req, res); // public
    if (req.query && req.query.resource === "tutor") return saveTutorInterest(req, res); // public
    if (req.query && req.query.resource === "schedule") return saveScheduleRequest(req, res); // public
    if (req.query && req.query.resource === "question") return saveQuestion(req, res); // public
    if (req.query && req.query.resource === "showcase") return saveShowcase(req, res); // public
    if (req.query && req.query.resource === "scenarios") return makeScenarios(req, res); // public, AI-generated
    if (req.query && req.query.resource === "partner-enroll") return addPartnerEnrollment(req, res); // FOUNDER-gated inside
    return ingest(req, res);     // public: track an event
  }
  if (req.method === "GET") return read(req, res);        // founder: read funnel events
  if (req.method === "PUT") {                              // founder: save cohorts, admins, or settings
    if (req.query && req.query.resource === "founders") return saveFounders(req, res);
    if (req.query && req.query.resource === "settings") return saveSiteSettings(req, res);
    if (req.query && req.query.resource === "partners") return savePartnersList(req, res);
    if (req.query && req.query.resource === "ops") return saveOpsSettings(req, res);
    if (req.query && req.query.resource === "homework") return saveCourseHomework(req, res);
    if (req.query && req.query.resource === "objectives") return saveCourseObjectives(req, res);
    return saveCohorts(req, res);
  }
  if (req.method === "DELETE") {
    if (req.query && req.query.resource === "events") return clearFunnel(req, res); // founder: wipe the funnel stream
    return resetAccount(req, res); // founder: reset a test account
  }
  res.status(405).json({ error: "Method not allowed" });
}
