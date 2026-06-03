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

const MAX_STATE_BYTES = 200 * 1024; // generous cap; the sim state is a few KB
const stateKey = (email) => `state:${email}`;
// Course is complete once the student has advanced past Week 12 into the check-in phase.
const isGraduated = (state) => !!state && (state.phase === "checkin" || state.done === true);

export default async function handler(req, res) {
  const session = requireUser(req);
  if (!session) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }

  if (req.method === "GET") {
    const raw = await kvGet(stateKey(session.email));
    const cert = await getCertByEmail(session.email);
    if (!raw) {
      res.status(200).json({ state: null, cert });
      return;
    }
    try {
      res.status(200).json({ state: typeof raw === "string" ? JSON.parse(raw) : raw, cert });
    } catch {
      res.status(200).json({ state: null, cert });
    }
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
