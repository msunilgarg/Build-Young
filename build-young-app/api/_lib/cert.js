// ============================ COMPLETION CERTIFICATE (server) ============================
//
// Mints + stores the course-completion certificate and emails the student their certificate +
// LinkedIn "Add to profile" link. Kept under the Hobby 12-function cap by being a LIB: minting is
// triggered from /api/state (on graduation) and the public verification read is served by
// /api/cohorts (?cert=<id>) — no new serverless function.
//
// The certificate's name + cohort come from the AUTHORITATIVE user record + catalog (not from
// client-supplied sim state), so a student can't forge a cert for a different name.

import crypto from "node:crypto";
import { kvConfigured, kvGet, kvSet } from "./kv.js";
import { getUser } from "./auth.js";
import { loadCatalog } from "./cohortStore.js";
import { sendEmail } from "./sendEmail.js";
import { certName, certVerifyUrl, linkedInAddUrl } from "../../src/cert.js";

const certKey = (id) => `cert:${id}`;
const certForKey = (email) => `certfor:${email}`;
const BASE_URL = () => (process.env.PUBLIC_BASE_URL || "https://www.build-young.com").replace(/\/+$/, "");

const parse = (raw) => { try { return typeof raw === "string" ? JSON.parse(raw) : raw; } catch { return null; } };

// The cert a given student already holds (idempotency + dashboard fetch), or null.
export async function getCertByEmail(email) {
  if (!kvConfigured() || !email) return null;
  try {
    const id = await kvGet(certForKey(email));
    if (!id) return null;
    return parse(await kvGet(certKey(id)));
  } catch { return null; }
}

// The cert behind a public id — for the verification page (no auth).
export async function getCertById(id) {
  if (!kvConfigured() || !id) return null;
  try { return parse(await kvGet(certKey(id))); } catch { return null; }
}

// Issue a completion cert for `email` and email it. IDEMPOTENT: if one already exists it's
// returned and NO second email is sent. Returns the cert record (or null if KV unconfigured).
export async function issueCertForEmail(email) {
  if (!kvConfigured() || !email) return null;
  const existing = await getCertByEmail(email);
  if (existing) return existing;

  const user = await getUser(email);
  const batchId = (user && user.batchId) || null;
  let season = null, track = "Builders";
  try {
    const cat = await loadCatalog();
    const b = (cat.batches || []).find((x) => x.id === batchId);
    if (b) { season = b.season; track = b.track || "Builders"; }
  } catch { /* fall back to defaults */ }

  const certId = crypto.randomBytes(12).toString("hex");
  const rec = { certId, name: (user && user.name) || "", track, season, batchId, completedAt: Date.now() };
  try {
    await kvSet(certKey(certId), JSON.stringify(rec));
    await kvSet(certForKey(email), certId);
  } catch { return null; }

  // Email the certificate (best-effort — a failed send never blocks issuance).
  try {
    const url = certVerifyUrl(BASE_URL(), certId);
    const li = linkedInAddUrl({ track, certId, certUrl: url, issuedAt: rec.completedAt });
    const first = String(rec.name || "").trim().split(" ")[0] || "there";
    const subject = "Your Build Young certificate 🎓";
    const body = `Hi ${first},

Congratulations on completing the ${certName(track)}! You built something real, then learned to grow and manage what it earns — that's a rare thing to have done this young.

Here's your certificate of completion:
  •  View & share it: ${url}

Add it to your LinkedIn profile (a parent can help if you're under 16):
  •  ${li}

We're proud of what you built. Keep building.

— The Build Young Team`;
    await sendEmail({ to: email, subject, body });
  } catch { /* issuance already succeeded; email is best-effort */ }

  return rec;
}
