// ============================ FUNNEL EVENT INGEST ============================
//
// Appends one aggregate-only funnel event to the durable stream in KV (a Redis list,
// `funnel:events`). Fired fire-and-forget by track() in src/App.jsx at each funnel stage.
//
// PRIVACY: only a whitelist of operational props is stored — season, track, batch id,
// week/check-in index, refund tier, cents, and a fromCall flag. Anything else (including any
// PII a caller might send) is dropped. No email/name is ever persisted here.

import { kvConfigured, kvCommand } from "./_lib/kv.js";

const KEY = "funnel:events";
const CAP = 100000; // keep only the most recent N events (LTRIM after each push)

const EVENTS = new Set([
  "visited", "enroll_started", "call_booked", "enrolled",
  "class_started", "week_advanced", "graduated", "checkin_completed", "withdrawn",
]);
const ALLOWED_PROPS = ["season", "track", "batchId", "week", "checkin", "refundTier", "refundCents", "priceCents", "fromCall", "stage"];

async function readRaw(req) {
  return await new Promise((resolve) => {
    let data = ""; req.on("data", (c) => { data += c; }); req.on("end", () => resolve(data)); req.on("error", () => resolve(""));
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }
  // No store configured (e.g. demo) → accept-but-no-op so the client never errors.
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
