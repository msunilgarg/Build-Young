// ============================ FUNNEL SCENARIO AGENT (server-only) ============================
//
// Generates Week-9 practice funnels from a student's OWN funnel metrics (the steps they listed in
// Week 8). Two callers:
//   • on demand — POST /api/funnel?resource=scenarios (the "Simulate more advanced scenarios" button)
//   • day before class — a scheduled job can pre-generate per enrolled student (needs auth + KV).
//
// The agent is Claude (model below), called over plain `fetch` — NO new npm dep, key stays server-
// side (ANTHROPIC_API_KEY). Output is always run through `sanitizeScenarios` so a bad/odd model
// response can never reach the student: each scenario must have one count per stage + a short read.
// Pure helpers (cleanStages / buildScenarioPrompt / parseJsonArray / sanitizeScenarios) are tested.

// The skill default. Easy to swap to a cheaper model (e.g. claude-haiku-4-5) for high-volume cron use.
export const SCENARIO_MODEL = "claude-opus-4-8";

export function cleanStages(stages) {
  return (Array.isArray(stages) ? stages : [])
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean)
    .slice(0, 6);
}

// The prompt: produce realistic, story-bearing funnels over the student's OWN stages, each with a
// short diagnosis. We DON'T ask for titles — naming the problem would give the exercise away.
export function buildScenarioPrompt(stages, level) {
  const adv = level === "advanced";
  return [
    `You are a product-analytics coach for teen founders. A student built a product and tracks this funnel, top to bottom:`,
    stages.map((s, i) => `${i + 1}. ${s}`).join("\n"),
    ``,
    `Generate ${adv ? "3 harder, less-obvious" : "3"} practice funnels for them to read — each a DIFFERENT realistic story (e.g. weak first step, weak retention, low traffic but strong conversion, a leaky middle, a spike that doesn't stick).`,
    adv ? `Make them subtler than textbook cases: more than one thing slightly off, or a number that looks fine until you compute the conversion.` : ``,
    `For EACH funnel give:`,
    `- "counts": an array of ${stages.length} whole numbers, one per stage in order, generally decreasing (a few hundred at the top is realistic for a new product).`,
    `- "answer": 1–3 sentences telling the student what the data is telling them — where people drop off, what it means, and what to try. Refer to the stages by name. Plain, encouraging language for a 15–18 year old.`,
    `Do NOT include any title or label that names the diagnosis — the student must work it out from the numbers.`,
    `Return ONLY a JSON array like: [{"counts":[...], "answer":"..."}, ...]. No prose, no markdown.`,
  ].filter(Boolean).join("\n");
}

// Pull the first JSON array out of the model's text (tolerant of stray prose/markdown fences).
export function parseJsonArray(text) {
  if (typeof text !== "string") return null;
  try { const v = JSON.parse(text); return Array.isArray(v) ? v : null; } catch { /* fall through */ }
  const a = text.indexOf("["), b = text.lastIndexOf("]");
  if (a >= 0 && b > a) { try { const v = JSON.parse(text.slice(a, b + 1)); return Array.isArray(v) ? v : null; } catch { return null; } }
  return null;
}

// Coerce whatever the model returned into safe scenarios: one positive integer per stage + a short
// answer. Drops anything malformed; caps at 4 scenarios and clamps counts to sane bounds.
export function sanitizeScenarios(raw, stages) {
  const n = cleanStages(stages).length;
  if (!Array.isArray(raw) || n < 2) return [];
  const out = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const counts = Array.isArray(item.counts) ? item.counts : null;
    if (!counts || counts.length !== n) continue;
    const nums = counts.map((c) => Math.max(1, Math.min(100000, Math.round(Number(c)))));
    if (nums.some((c) => !Number.isFinite(c))) continue;
    const answer = typeof item.answer === "string" ? item.answer.trim().slice(0, 600) : "";
    if (!answer) continue;
    out.push({ counts: nums, answer });
    if (out.length >= 4) break;
  }
  return out;
}

// Call Claude and return sanitized scenarios. Returns [] (never throws) if no key, bad input, or any
// failure — the client falls back to a local generator so the button always does something.
export async function generateScenarios({ stages, level, apiKey, fetchImpl, model } = {}) {
  const clean = cleanStages(stages);
  if (!apiKey || clean.length < 2) return [];
  const f = fetchImpl || (typeof fetch !== "undefined" ? fetch : null);
  if (!f) return [];
  let resp;
  try {
    resp = await f("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: model || SCENARIO_MODEL,
        max_tokens: 1500,
        thinking: { type: "adaptive" },
        output_config: { effort: "low" },
        messages: [{ role: "user", content: buildScenarioPrompt(clean, level) }],
      }),
    });
  } catch { return []; }
  if (!resp || !resp.ok) return [];
  let data; try { data = await resp.json(); } catch { return []; }
  const text = Array.isArray(data && data.content)
    ? data.content.filter((b) => b && b.type === "text").map((b) => b.text).join("")
    : "";
  return sanitizeScenarios(parseJsonArray(text), clean);
}
