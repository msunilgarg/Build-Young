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

const KEY = "interest:list";
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
