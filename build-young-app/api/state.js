// /api/state — the server-authoritative simulation state, per signed-in student.
//   GET → { state, cert }   (state null if nothing saved; cert = completion cert if issued)
//   PUT { state } → { ok, cert }
// Auth-gated: the session cookie's email is the key, so a student can only read/write their own
// state. This is what makes the dashboard work across devices (replacing per-device localStorage).
//
// On a PUT where the state shows the course is complete (advanced into the check-in phase), we
// mint the completion certificate + email it — idempotently — so the cert is issued exactly once,
// server-side, from the authoritative account record (see api/_lib/cert.js).

import { requireUser } from "./_lib/auth.js";
import { kvGet, kvSet } from "./_lib/kv.js";
import { issueCertForEmail, getCertByEmail } from "./_lib/cert.js";
import { indexStudent } from "./_lib/buildPlans.js";

const MAX_STATE_BYTES = 200 * 1024; // generous cap; the sim state is a few KB
const stateKey = (email) => `state:${email}`;
// Course is complete once the student has finished Week 12 (done) or moved into the post-course
// check-in phase — always AFTER Week 11. We require the explicit done/checkin flag (not merely
// "phase !== course") plus a Week-12 guard so the cert is never minted before the course is
// genuinely complete, even from a malformed/legacy state.
const isGraduated = (state) => !!state
  && (state.done === true || state.phase === "checkin")
  && (typeof state.week !== "number" || state.week >= 12);

export default async function handler(req, res) {
  const session = requireUser(req);
  if (!session) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }

  if (req.method === "GET") {
    const raw = await kvGet(stateKey(session.email));
    const parsed = (() => { try { return raw == null ? null : (typeof raw === "string" ? JSON.parse(raw) : raw); } catch { return null; } })();
    // Only hand back the certificate once the saved state shows the course is actually complete —
    // so a cert minted in earlier testing can't surface on a student who is mid-course.
    const cert = isGraduated(parsed) ? await getCertByEmail(session.email) : null;
    res.status(200).json({ state: parsed, cert });
    return;
  }

  if (req.method === "PUT") {
    const { state } = req.body || {};
    if (state == null || typeof state !== "object") {
      res.status(400).json({ error: "state object required" });
      return;
    }
    const serialized = JSON.stringify(state);
    if (serialized.length > MAX_STATE_BYTES) {
      res.status(413).json({ error: "state too large" });
      return;
    }
    const ok = await kvSet(stateKey(session.email), serialized);
    if (ok) indexStudent(session.email); // track this student for the founder's build-plan view (fire-and-forget)
    // Issue the completion certificate the first time we persist a graduated state (idempotent;
    // emails once). Never block the state save on it.
    let cert = null;
    if (ok && isGraduated(state)) {
      try { cert = await issueCertForEmail(session.email); } catch { /* best-effort */ }
    }
    res.status(ok ? 200 : 500).json({ ok, cert });
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
}
