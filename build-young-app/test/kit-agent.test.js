import { describe, it, expect } from "vitest";
import { buildKitPrompt, sanitizeKit, generateKit, KIT_MODEL } from "../api/_lib/kitAgent.js";
import { buildProjectKit, KIT_FILES } from "../src/projectKit.js";

// SPECS/009 T45: the OPTIONAL project-kit polish agent. Pure helpers tested here; the model call is
// key-gated (no key under test → generateKit returns null and the endpoint falls back to the
// deterministic buildProjectKit kit).

const BASE = buildProjectKit({
  build: { promise: "Quiz from your notes in 2 min." },
  shape: { product: "A notes-to-quiz app.", acceptance: "Done when notes become a quiz." },
});

describe("buildKitPrompt", () => {
  it("includes the deterministic base files + a keep-the-guardrails instruction + the JSON shape", () => {
    const p = buildKitPrompt({ base: BASE });
    for (const f of KIT_FILES) expect(p).toContain(`===== ${f} =====`);
    expect(p).toContain("A notes-to-quiz app.");           // base content is the starting point
    expect(p).toMatch(/never homemade passwords|never handle cards|secrets off the browser/i);
    expect(p).toMatch(/Done when/);                        // keep the acceptance contract
    expect(p).toContain(JSON.stringify(KIT_FILES));        // asks for exactly the four keys
  });
  it("is safe with no base", () => { expect(() => buildKitPrompt()).not.toThrow(); });
});

describe("sanitizeKit", () => {
  it("returns EXACTLY the kit files as strings, falling back to base for missing/non-string ones", () => {
    const raw = { "CLAUDE.md": "  polished claude  ", "POSITIONING.md": 42 /* non-string */ /* SPECS + PLAYBOOK missing */ };
    const out = sanitizeKit(raw, BASE);
    expect(Object.keys(out).sort()).toEqual([...KIT_FILES].sort());
    expect(out["CLAUDE.md"]).toBe("polished claude");       // trimmed, kept
    expect(out["POSITIONING.md"]).toBe(BASE["POSITIONING.md"]); // non-string → base
    expect(out["SPECS/core-product.md"]).toBe(BASE["SPECS/core-product.md"]); // missing → base
    expect(out["PLAYBOOK.md"]).toBe(BASE["PLAYBOOK.md"]);    // missing → base
  });
  it("caps each file's length and is safe on junk/null", () => {
    const out = sanitizeKit({ "CLAUDE.md": "x".repeat(50000) }, BASE);
    expect(out["CLAUDE.md"].length).toBe(20000);
    expect(Object.keys(sanitizeKit(null, BASE)).sort()).toEqual([...KIT_FILES].sort()); // all from base
    for (const f of KIT_FILES) expect(typeof sanitizeKit(null, BASE)[f]).toBe("string");
  });
});

describe("generateKit (key-gated)", () => {
  const input = { build: { promise: "p" }, shape: { product: "x", acceptance: "done when x" } };
  it("returns null without an API key (no throw) → endpoint falls back to the deterministic kit", async () => {
    expect(await generateKit(input)).toBeNull();
  });
  it("calls the model and sanitizes a valid JSON reply into a complete kit", async () => {
    const reply = {}; KIT_FILES.forEach((f, i) => { reply[f] = `AI ${i}`; });
    const fetchImpl = async () => ({ ok: true, json: async () => ({ content: [{ type: "text", text: JSON.stringify(reply) }] }) });
    const out = await generateKit({ ...input, apiKey: "sk-test", model: KIT_MODEL, fetchImpl });
    expect(out).toEqual(reply);
  });
  it("returns null when the model errors or replies with non-JSON (→ deterministic fallback)", async () => {
    expect(await generateKit({ ...input, apiKey: "sk-test", fetchImpl: async () => ({ ok: false }) })).toBeNull();
    const nonJson = async () => ({ ok: true, json: async () => ({ content: [{ type: "text", text: "sorry, no json here" }] }) });
    expect(await generateKit({ ...input, apiKey: "sk-test", fetchImpl: nonJson })).toBeNull();
  });
});
