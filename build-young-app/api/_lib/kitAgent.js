// ============================ PROJECT-KIT POLISH AGENT (server-only, SPECS/009 T45) ============================
//
// OPTIONAL layer on top of the deterministic project kit (src/projectKit.js). When configured, it asks
// Claude to sharpen the four generated files (CLAUDE.md / SPEC.md / POSITIONING.md / PLAYBOOK.md) while
// keeping the SAME filenames, structure, guardrails, and the "Done when…" acceptance contract. The
// deterministic `buildProjectKit` is BOTH the model's starting point AND the fallback — so off / no key /
// any failure ⇒ the student gets the plain deterministic kit, never an error.
//
// Mirrors api/_lib/reviewAgent.js (key stays server-side: ANTHROPIC_API_KEY; output sanitized). Reuses
// buildProjectKit (src/) and parseJsonObject (reviewAgent) so nothing is duplicated.

import { buildProjectKit, KIT_FILES } from "../../src/projectKit.js";
import { parseJsonObject } from "./reviewAgent.js";

export const KIT_MODELS = ["claude-haiku-4-5", "claude-sonnet-4-6", "claude-opus-4-8"];
export const KIT_MODEL = "claude-haiku-4-5";

// Ask Claude to improve the kit — same files, same guardrails, just sharper/clearer. The deterministic
// base is the starting point so it can only refine, not invent a different structure.
export function buildKitPrompt({ base } = {}) {
  const b = base || {};
  return [
    "You are helping a teen founder polish the guide files their AI build partner will read every session.",
    "Below are the project files (CLAUDE.md, a SPECS/ folder with one spec per feature plus an overview, POSITIONING.md, PLAYBOOK.md) generated from their specs.",
    "Improve them: clearer, more specific, more useful to an AI building the product — but KEEP the same filenames (and the SPECS/ paths), the same section structure, every guardrail (never homemade passwords; use Stripe, never handle cards; keep secrets off the browser), and the \"Done when…\" acceptance criteria. Don't invent product facts they didn't give; tighten what's there.",
    "",
    ...KIT_FILES.map((f) => `===== ${f} =====\n${b[f] || ""}`),
    "",
    `Return ONLY a JSON object mapping each filename to its improved markdown content, exactly these keys: ${JSON.stringify(KIT_FILES)}. No prose, no markdown fences.`,
  ].join("\n");
}

// Coerce the model reply into a complete kit: EXACTLY the four files, each a string, each capped; any
// missing/non-string file falls back to the deterministic base — so the result is always complete + safe.
export function sanitizeKit(raw, base) {
  const b = base || {};
  const out = {};
  for (const f of KIT_FILES) {
    const v = raw && typeof raw[f] === "string" ? raw[f].trim() : "";
    out[f] = v ? v.slice(0, 20000) : String(b[f] || "");
  }
  return out;
}

// Call Claude and return a sanitized, polished kit — or null (no key, bad input, non-JSON reply, or any
// failure) so the endpoint falls back to the deterministic kit. Never throws.
export async function generateKit({ build, shape, apiKey, model, fetchImpl } = {}) {
  const base = buildProjectKit({ build, shape });
  if (!apiKey) return null;
  const f = fetchImpl || (typeof fetch !== "undefined" ? fetch : null);
  if (!f) return null;
  let resp;
  try {
    resp = await f("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: model || KIT_MODEL,
        max_tokens: 4000,
        messages: [{ role: "user", content: buildKitPrompt({ base }) }],
      }),
    });
  } catch { return null; }
  if (!resp || !resp.ok) return null;
  let data; try { data = await resp.json(); } catch { return null; }
  const text = Array.isArray(data && data.content)
    ? data.content.filter((blk) => blk && blk.type === "text").map((blk) => blk.text).join("")
    : "";
  const obj = parseJsonObject(text);
  if (!obj) return null; // not usable JSON → fall back to the deterministic kit
  return sanitizeKit(obj, base);
}
