// /api/state — the server-authoritative simulation state, per signed-in student.
//   GET → { state }   (null if nothing saved yet)
//   PUT { state } → { ok }
// Auth-gated: the session cookie's email is the key, so a student can only read/write their own
// state. This is what makes the dashboard work across devices (replacing per-device localStorage).

import { requireUser } from "./_lib/auth.js";
import { kvGet, kvSet } from "./_lib/kv.js";

const MAX_STATE_BYTES = 200 * 1024; // generous cap; the sim state is a few KB
const stateKey = (email) => `state:${email}`;

export default async function handler(req, res) {
  const session = requireUser(req);
  if (!session) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }

  if (req.method === "GET") {
    const raw = await kvGet(stateKey(session.email));
    if (!raw) {
      res.status(200).json({ state: null });
      return;
    }
    try {
      res.status(200).json({ state: typeof raw === "string" ? JSON.parse(raw) : raw });
    } catch {
      res.status(200).json({ state: null });
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
    res.status(ok ? 200 : 500).json({ ok });
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
}
