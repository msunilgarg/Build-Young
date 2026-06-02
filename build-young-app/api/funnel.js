// ============================ FUNNEL: INGEST (POST) + READ (GET) ============================
//
// One serverless function for both ends of the funnel pipeline (kept together to stay under the
// Hobby-plan function cap):
//   • POST /api/funnel  — append one aggregate-only event to the durable stream (fired by
//     track() in src/App.jsx). No auth; a strict prop allowlist drops anything but operational
//     fields — NO email/name ever persisted.
//   • GET  /api/funnel?token=…  — read the raw stream for the founder dashboard + data-room
//     exports. Gated by the FOUNDER_TOKEN env var (timing-safe; 404 when unset, 403 on mismatch).
//
// The dashboard aggregates client-side via src/funnel.js (the single source of truth), so this
// endpoint is just gated storage.

import crypto from "node:crypto";
import { kvConfigured, kvCommand } from "./_lib/kv.js";

const KEY = "funnel:events";
const CAP = 100000; // keep only the most recent N events (LTRIM after each push)

const EVENTS = new Set([
  "visited", "enroll_started", "call_booked", "enrolled",
  "class_started", "week_advanced", "graduated", "checkin_completed", "withdrawn",
]);
const ALLOWED_PROPS = ["season", "track", "batchId", "week", "checkin", "refundTier", "refundCents", "priceCents", "fromCall", "stage"];

function timingSafeEq(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
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

// --- GET: founder-gated read of the stream ---
async function read(req, res) {
  const secret = process.env.FOUNDER_TOKEN;
  if (!secret) { res.status(404).json({ error: "Not found" }); return; }
  const token = (req.query && req.query.token) || (req.headers && req.headers["x-founder-token"]) || "";
  if (!timingSafeEq(token, secret)) { res.status(403).json({ error: "Forbidden" }); return; }
  if (!kvConfigured()) { res.status(200).json({ events: [] }); return; }

  let raw = [];
  try { raw = (await kvCommand(["LRANGE", KEY, "0", "-1"])) || []; } catch { raw = []; }
  const events = raw
    .map((r) => { try { return typeof r === "string" ? JSON.parse(r) : r; } catch { return null; } })
    .filter(Boolean);
  res.status(200).json({ events });
}

export default async function handler(req, res) {
  if (req.method === "POST") return ingest(req, res);
  if (req.method === "GET") return read(req, res);
  res.status(405).json({ error: "Method not allowed" });
}
