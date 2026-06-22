// ============================ "CHECK MY WORK" REVIEW AGENT (server-only) ============================
//
// The Check step of the Agentic Engineering Process (SPECS/008): an INDEPENDENT review pass for a
// student's build — it grades what they built against THEIR OWN "Done when…" acceptance criteria
// (Lesson 2, s.shape.acceptance) and returns strengths + gaps + a verdict. Mirrors the repo's own
// independent verifier, and the Week-9 scenario agent's shape.
//
// Caller: POST /api/funnel?resource=review (student-initiated). The agent is Claude, called over plain
// `fetch` — NO new npm dep; the key (ANTHROPIC_API_KEY) is BUILD YOUNG's own and stays server-side
// (students never bring a key). Output is always run through `sanitizeReview` so a bad/odd model reply
// can never reach the student. When the agent is off / no key / any failure, the endpoint falls back to
// `localReview` (a deterministic self-check) so the step still teaches offline — never an error.
// Pure helpers (buildReviewPrompt / parseJsonObject / sanitizeReview / parseAcceptanceLines / localReview)
// are tested.

// Models the founder can pick in the dashboard (cheapest → most capable). Default Haiku — per-student,
// high-volume, and the task (grade a short build against a short checklist) doesn't need Opus.
export const REVIEW_MODELS = ["claude-haiku-4-5", "claude-sonnet-4-6", "claude-opus-4-8"];
export const REVIEW_MODEL = "claude-haiku-4-5";

// The prompt: an encouraging, specific review of the student's work vs. THEIR acceptance criteria.
export function buildReviewPrompt({ spec, acceptance, built } = {}) {
  return [
    `You are a kind, encouraging coach helping a teen founder who builds with AI. Be constructive and specific; never harsh, never a letter grade.`,
    `They were building toward this part of their product:`,
    String(spec || "(no spec provided)").slice(0, 4000),
    ``,
    `Their own "Done when…" acceptance criteria — what "done" means to THEM:`,
    String(acceptance || "(none written yet)").slice(0, 2000),
    ``,
    `What they say they built / are seeing right now:`,
    String(built || "(nothing pasted)").slice(0, 4000),
    ``,
    `Judge whether the work meets THEIR acceptance criteria. Lead with what's working, then the gaps as kind next steps.`,
    `Return ONLY a JSON object: {"verdict":"pass" or "gaps","strengths":["..."],"gaps":["..."]}.`,
    `"verdict" = "pass" if it meets the criteria, "gaps" if something's still missing. "strengths" = 1–4 short, specific things they did well. "gaps" = 0–4 short, specific, kind next steps, each tied to a criterion. Plain language for a 15–18 year old. No prose, no markdown.`,
  ].join("\n");
}

// Pull the first JSON object out of the model's text (tolerant of stray prose / markdown fences).
export function parseJsonObject(text) {
  if (typeof text !== "string") return null;
  try { const v = JSON.parse(text); return v && typeof v === "object" && !Array.isArray(v) ? v : null; } catch { /* fall through */ }
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a >= 0 && b > a) { try { const v = JSON.parse(text.slice(a, b + 1)); return v && typeof v === "object" && !Array.isArray(v) ? v : null; } catch { return null; } }
  return null;
}

// Coerce whatever the model returned into a safe review: a pass|gaps verdict + short strengths/gaps
// lists (capped count + length). Returns null if there's nothing useful (caller falls back to local).
export function sanitizeReview(raw) {
  if (!raw || typeof raw !== "object") return null;
  const verdict = raw.verdict === "pass" ? "pass" : "gaps";
  const list = (v) => (Array.isArray(v) ? v : [])
    .map((x) => (typeof x === "string" ? x.trim().slice(0, 240) : ""))
    .filter(Boolean)
    .slice(0, 6);
  const strengths = list(raw.strengths);
  const gaps = list(raw.gaps);
  if (!strengths.length && !gaps.length) return null; // empty review → let the caller fall back
  return { verdict, strengths, gaps };
}

// Split a student's "Done when…" text into individual criteria lines (bullets / newlines / semicolons).
export function parseAcceptanceLines(acceptance) {
  return String(acceptance || "")
    .split(/\n|•|;/)
    .map((l) => l.replace(/^[\s\-*•\d.)]+/, "").trim())
    .filter((l) => l.length > 3)
    .slice(0, 8);
}

// Deterministic offline fallback (no API key / agent disabled / any failure). A rough keyword self-check
// against the acceptance criteria — it teaches the habit (check every "Done when…" line) without a model.
// Never throws; always returns a valid review shape.
export function localReview({ acceptance, built } = {}) {
  const lines = parseAcceptanceLines(acceptance);
  const text = String(built || "").toLowerCase();
  if (!lines.length) {
    return { verdict: "gaps", strengths: [], gaps: ['Write your "Done when…" criteria in Lesson 2 first — then a check has something to grade against.'] };
  }
  const strengths = [];
  const gaps = [];
  for (const line of lines) {
    const words = line.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 4);
    const covered = text.length > 20 && words.some((w) => text.includes(w));
    if (covered) strengths.push(`Looks covered: ${line}`);
    else gaps.push(`Check this one yourself: ${line}`);
  }
  return { verdict: gaps.length === 0 ? "pass" : "gaps", strengths: strengths.slice(0, 6), gaps: gaps.slice(0, 6) };
}

// Call Claude and return a sanitized review, or null (no key, empty input, or any failure) — the
// endpoint then falls back to localReview, so the Check step always returns something useful.
export async function generateReview({ spec, acceptance, built, apiKey, model, fetchImpl } = {}) {
  const a = String(acceptance || "").trim();
  const b = String(built || "").trim();
  if (!apiKey || (!a && !b)) return null;
  const f = fetchImpl || (typeof fetch !== "undefined" ? fetch : null);
  if (!f) return null;
  let resp;
  try {
    resp = await f("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: model || REVIEW_MODEL,
        max_tokens: 800,
        messages: [{ role: "user", content: buildReviewPrompt({ spec, acceptance, built }) }],
      }),
    });
  } catch { return null; }
  if (!resp || !resp.ok) return null;
  let data; try { data = await resp.json(); } catch { return null; }
  const text = Array.isArray(data && data.content)
    ? data.content.filter((blk) => blk && blk.type === "text").map((blk) => blk.text).join("")
    : "";
  return sanitizeReview(parseJsonObject(text));
}
