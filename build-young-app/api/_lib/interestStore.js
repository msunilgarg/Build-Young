// ============================ NEXT-COHORT INTEREST (KV-backed) ============================
//
// When a cohort is FULL, families can't enroll (no waitlist — students don't join mid-course), so
// we capture their interest for the NEXT cohort instead: { name, email, batchId, season, track }.
// Stored in a KV list (`interest:list`). The founder reads it (overflow demand); and when a new
// cohort is added, everyone on the list is emailed automatically, then the list is cleared so
// nobody is notified twice.

import { kvConfigured, kvCommand, kvDel } from "./kv.js";
import { normalizeEmail } from "./auth.js";
import { sendEmail } from "./sendEmail.js";
import { loadOps, loadSettings } from "./settingsStore.js";

// Default destination for founder notifications when no specific notifyEmail is configured: the
// public team alias (NOT a personal inbox). Founder-editable via the contact email / ops settings.
const TEAM_EMAIL = "team@build-young.com";

const KEY = "interest:list";
const SCHEDULE_KEY = "interest:schedule"; // visitors requesting a different schedule / timezone
const TUTOR_KEY = "interest:tutors"; // prospective live tutors — SEPARATE from cohort interest so
                                     // the new-cohort notification never emails applicants.
const PARTNER_LEAD_KEY = "interest:partner-leads"; // prospective PARTNERS (marketplaces/schools/orgs) — "Partner with us"
const BASE_URL = () => (process.env.PUBLIC_BASE_URL || "https://www.build-young.com").replace(/\/+$/, "");
const parse = (r) => { try { return typeof r === "string" ? JSON.parse(r) : r; } catch { return null; } };

export async function addInterest({ name, email, batchId, season, track }) {
  if (!kvConfigured()) return { ok: false, reason: "store not configured" };
  const e = normalizeEmail(email || "");
  if (!e || !e.includes("@")) return { ok: false, error: "A valid email is required." };
  const rec = JSON.stringify({ email: e, name: String(name || "").slice(0, 120), batchId: batchId || null, season: season || null, track: track || null, ts: Date.now() });
  try {
    await kvCommand(["RPUSH", KEY, rec]);
    await kvCommand(["LTRIM", KEY, "-5000", "-1"]);
  } catch { return { ok: false }; }
  return { ok: true };
}

// --- Prospective live tutors (Careers → "Teach with us") -------------------------------------
// Dead simple + mail-client-independent: the Careers form asks for just an email and POSTs here.
// We email it straight to the founder (so it lands in the inbox like a real application) AND store
// it under its own key as a reliable backstop the console can read. Never swept by
// notifyInterestOfNewCohorts. Returns { ok, emailed } so the form can confirm it went through.
export async function addTutorInterest({ email, linkedin }) {
  const e = normalizeEmail(email || "");
  if (!e || !e.includes("@")) return { ok: false, error: "Please enter a valid email." };
  const li = String(linkedin || "").trim().slice(0, 300);
  if (!li || !/linkedin\.com\//i.test(li)) return { ok: false, error: "Please enter a valid LinkedIn profile URL." };

  // Best-effort: drop it in KV so it's never lost even if email isn't configured.
  let stored = false;
  if (kvConfigured()) {
    const rec = JSON.stringify({ email: e, linkedin: li, ts: Date.now() });
    try {
      await kvCommand(["RPUSH", TUTOR_KEY, rec]);
      await kvCommand(["LTRIM", TUTOR_KEY, "-5000", "-1"]);
      stored = true;
    } catch { /* fall through to the email */ }
  }

  // Send it to the team: the console-configured notifications address if set, otherwise the
  // founder's public contact/team alias (never a personal inbox by default).
  let emailed = false;
  try {
    const [ops, settings] = await Promise.all([loadOps(), loadSettings()]);
    const to = (ops && ops.notifyEmail) || (settings && settings.contactEmail) || TEAM_EMAIL;
    const sent = await sendEmail({
      to,
      subject: "New live-tutor interest — Build Young",
      body: `Someone is interested in becoming a Build Young live tutor.\n\nTheir email: ${e}\nLinkedIn: ${li}\n\nReply to them directly to follow up.`,
      replyTo: e, // hitting "reply" reaches the applicant
    });
    emailed = !!(sent && sent.ok);
  } catch { /* keep going */ }

  // Success if we captured it either way; only fail if BOTH the store and the email fell through.
  if (!stored && !emailed) return { ok: false, error: "We couldn't submit that just now — please email us instead." };
  return { ok: true, emailed };
}

// --- Schedule/timezone requests (landing → "Tell us your ideal schedule") --------------------
// A visitor who can't make the listed times tells us their ideal days/times + timezone — a demand
// signal for future cohorts. Mirror of addTutorInterest: store in KV + email the team. They're
// auto-notified when new cohorts open (notifyScheduleRequestsOfNewCohorts). { ok, emailed }.
export async function addScheduleRequest({ email, preference, timezone }) {
  const e = normalizeEmail(email || "");
  if (!e || !e.includes("@")) return { ok: false, error: "Please enter a valid email." };
  const pref = String(preference || "").trim().slice(0, 500);
  const tz = String(timezone || "").trim().slice(0, 120);
  if (!pref && !tz) return { ok: false, error: "Tell us the day/time or timezone you'd prefer." };
  let stored = false;
  if (kvConfigured()) {
    const rec = JSON.stringify({ email: e, preference: pref, timezone: tz, ts: Date.now() });
    try { await kvCommand(["RPUSH", SCHEDULE_KEY, rec]); await kvCommand(["LTRIM", SCHEDULE_KEY, "-5000", "-1"]); stored = true; } catch { /* fall through */ }
  }
  let emailed = false;
  try {
    const [ops, settings] = await Promise.all([loadOps(), loadSettings()]);
    const to = (ops && ops.notifyEmail) || (settings && settings.contactEmail) || TEAM_EMAIL;
    const sent = await sendEmail({
      to,
      subject: "New schedule request — Build Young",
      body: `Someone wants a Build Young cohort on a different schedule.\n\nTheir email: ${e}\nPreferred days/times: ${pref || "(not specified)"}\nTimezone: ${tz || "(not specified)"}\n\nReply to them directly to follow up.`,
      replyTo: e,
    });
    emailed = !!(sent && sent.ok);
  } catch { /* keep going */ }
  if (!stored && !emailed) return { ok: false, error: "We couldn't submit that just now — please email us instead." };
  return { ok: true, emailed };
}

// Newest first.
export async function listScheduleRequests() {
  if (!kvConfigured()) return [];
  try { const raw = (await kvCommand(["LRANGE", SCHEDULE_KEY, "0", "-1"])) || []; return raw.map(parse).filter(Boolean).reverse(); } catch { return []; }
}

// When new cohorts open, email everyone who asked for a different schedule (a new time might fit),
// then clear the list. De-dupes by email. Best-effort; returns how many were emailed.
export async function notifyScheduleRequestsOfNewCohorts(newBatches) {
  if (!kvConfigured() || !Array.isArray(newBatches) || !newBatches.length) return { notified: 0 };
  const list = await listScheduleRequests();
  if (!list.length) return { notified: 0 };
  const byEmail = new Map();
  for (const r of list) if (r && r.email) byEmail.set(r.email, r);
  const lines = newBatches.map((b) => `  •  ${b.track || "Builders"} — ${b.day || ""}${b.start ? ` (starts ${b.start})` : ""}`).join("\n");
  let notified = 0;
  for (const r of byEmail.values()) {
    const subject = "New Build Young cohorts just opened — a time might work for you";
    const body = `Hi there,\n\nYou asked us about a different schedule for Build Young, so here's a heads-up — we just opened new cohort(s):\n\n${lines}\n\nSee if one fits and grab a seat:\n  •  ${BASE_URL()}/enroll\n\nIf these still don't work, just reply and tell us what would.\nThe Build Young Team`;
    try { const sent = await sendEmail({ to: r.email, subject, body }); if (sent && sent.ok) notified += 1; } catch { /* keep going */ }
  }
  try { await kvDel(SCHEDULE_KEY); } catch { /* best-effort */ }
  return { notified };
}

// Newest first.
export async function listTutorInterest() {
  if (!kvConfigured()) return [];
  try {
    const raw = (await kvCommand(["LRANGE", TUTOR_KEY, "0", "-1"])) || [];
    return raw.map(parse).filter(Boolean).reverse();
  } catch { return []; }
}

// "Partner with us" lead — a prospective partner (marketplace/school/org) leaves their org + email
// (+ optional note). Mirror of addTutorInterest: store in KV + email the team (best-effort, key-gated).
export async function addPartnerLead({ org, email, note }) {
  const e = normalizeEmail(email || "");
  if (!e || !e.includes("@")) return { ok: false, error: "Please enter a valid email." };
  const o = String(org || "").trim().slice(0, 200);
  if (!o) return { ok: false, error: "Please tell us your organization." };
  const n = String(note || "").trim().slice(0, 1000);

  let stored = false;
  if (kvConfigured()) {
    const rec = JSON.stringify({ org: o, email: e, note: n, ts: Date.now() });
    try {
      await kvCommand(["RPUSH", PARTNER_LEAD_KEY, rec]);
      await kvCommand(["LTRIM", PARTNER_LEAD_KEY, "-5000", "-1"]);
      stored = true;
    } catch { /* fall through to the email */ }
  }

  let emailed = false;
  try {
    const [ops, settings] = await Promise.all([loadOps(), loadSettings()]);
    const to = (ops && ops.notifyEmail) || (settings && settings.contactEmail) || TEAM_EMAIL;
    const sent = await sendEmail({
      to,
      subject: "New partner inquiry — Build Young",
      body: `An organization is interested in carrying Build Young ("Partner with us").\n\nOrganization: ${o}\nTheir email: ${e}\nNote: ${n || "(none)"}\n\nReply to them directly to follow up.`,
      replyTo: e, // hitting "reply" reaches the prospective partner
    });
    emailed = !!(sent && sent.ok);
  } catch { /* keep going */ }

  if (!stored && !emailed) return { ok: false, error: "We couldn't submit that just now — please email us instead." };
  return { ok: true, emailed };
}

export async function listPartnerLeads() {
  if (!kvConfigured()) return [];
  try {
    const raw = (await kvCommand(["LRANGE", PARTNER_LEAD_KEY, "0", "-1"])) || [];
    return raw.map(parse).filter(Boolean).reverse();
  } catch { return []; }
}

// Newest first.
export async function listInterest() {
  if (!kvConfigured()) return [];
  try {
    const raw = (await kvCommand(["LRANGE", KEY, "0", "-1"])) || [];
    return raw.map(parse).filter(Boolean).reverse();
  } catch { return []; }
}

export async function clearInterest() {
  if (!kvConfigured()) return;
  try { await kvDel(KEY); } catch { /* best-effort */ }
}

// Email everyone who's interested that a new cohort just opened, then clear the list (so nobody is
// emailed twice). De-dupes by email. Best-effort; returns how many were emailed.
export async function notifyInterestOfNewCohorts(newBatches) {
  if (!kvConfigured() || !Array.isArray(newBatches) || !newBatches.length) return { notified: 0 };
  const list = await listInterest();
  if (!list.length) return { notified: 0 };

  const byEmail = new Map();
  for (const r of list) if (r && r.email) byEmail.set(r.email, r); // keep latest per email
  const lines = newBatches.map((b) => `  •  ${b.track || "Builders"} — ${b.day || ""}${b.start ? ` (starts ${b.start})` : ""}`).join("\n");

  let notified = 0;
  for (const r of byEmail.values()) {
    const first = String(r.name || "").trim().split(" ")[0] || "there";
    const subject = "A new Build Young cohort just opened 🎉";
    const body = `Hi ${first},

Good news — a new Build Young cohort just opened, and you asked to hear about it:

${lines}

Seats are limited, so grab one before it fills up:
  •  ${BASE_URL()}/enroll

See you in class,
The Build Young Team`;
    try { const sent = await sendEmail({ to: r.email, subject, body }); if (sent && sent.ok) notified += 1; } catch { /* keep going */ }
  }
  await clearInterest();
  return { notified };
}
