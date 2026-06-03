// ============================ STUDENT SHOWCASE (KV-backed) ============================
//
// At the capstone (the last class), a graduating student can share what they BUILT — a link to
// their live product + a short bit of feedback we can use as a testimonial. Gated behind the
// founder's `showcaseEnabled` flag (OFF by default). Stored in a KV list (`showcase:list`); the
// founder reads it from the console. Opt-in, with an explicit consent flag — and because these
// are MINORS, the founder should confirm parental consent before any public/marketing use.

import { kvConfigured, kvCommand, kvDel } from "./kv.js";

const KEY = "showcase:list";
const parse = (r) => { try { return typeof r === "string" ? JSON.parse(r) : r; } catch { return null; } };

export async function addShowcase({ link, feedback, name, batchId, consent }) {
  const l = String(link || "").trim().slice(0, 400);
  const fb = String(feedback || "").trim().slice(0, 2000);
  if (!l && !fb) return { ok: false, error: "Add a link or some feedback to share." };
  if (!kvConfigured()) return { ok: false, reason: "store not configured" };
  const rec = JSON.stringify({
    link: l,
    feedback: fb,
    name: String(name || "").trim().slice(0, 120),
    batchId: batchId || null,
    consent: consent === true,
    ts: Date.now(),
  });
  try {
    await kvCommand(["RPUSH", KEY, rec]);
    await kvCommand(["LTRIM", KEY, "-5000", "-1"]);
  } catch { return { ok: false }; }
  return { ok: true };
}

// Newest first.
export async function listShowcase() {
  if (!kvConfigured()) return [];
  try {
    const raw = (await kvCommand(["LRANGE", KEY, "0", "-1"])) || [];
    return raw.map(parse).filter(Boolean).reverse();
  } catch { return []; }
}

export async function clearShowcase() {
  if (!kvConfigured()) return;
  try { await kvDel(KEY); } catch { /* best-effort */ }
}
