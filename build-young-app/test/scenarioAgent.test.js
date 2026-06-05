import { describe, it, expect } from "vitest";
import {
  cleanStages, buildScenarioPrompt, parseJsonArray, sanitizeScenarios, generateScenarios,
} from "../api/_lib/scenarioAgent.js";

const STAGES = ["Visited", "Tried it", "Came back"];

describe("scenarioAgent pure helpers", () => {
  it("cleanStages trims, drops blanks, caps at 6", () => {
    expect(cleanStages([" A ", "", "B", null, 3])).toEqual(["A", "B"]);
    expect(cleanStages(Array(10).fill("x")).length).toBe(6);
    expect(cleanStages("nope")).toEqual([]);
  });

  it("buildScenarioPrompt names the stages and asks for JSON, without giving away the diagnosis", () => {
    const p = buildScenarioPrompt(STAGES, "advanced");
    expect(p).toContain("Visited");
    expect(p).toContain("Came back");
    expect(p).toContain("JSON array");
    expect(p.toLowerCase()).toContain("do not include any title");
  });

  it("parseJsonArray reads a bare array, an array buried in prose, and rejects junk", () => {
    expect(parseJsonArray('[{"counts":[1],"answer":"x"}]')).toHaveLength(1);
    expect(parseJsonArray('here you go:\n```json\n[{"a":1}]\n```')).toHaveLength(1);
    expect(parseJsonArray("not json")).toBeNull();
    expect(parseJsonArray('{"counts":[1]}')).toBeNull(); // object, not array
  });

  it("sanitizeScenarios keeps valid, drops malformed, clamps, caps at 4", () => {
    const raw = [
      { counts: [800, 150, 110], answer: "  big drop at the start  " }, // valid
      { counts: [800, 150], answer: "wrong length" },                    // dropped (length != 3)
      { counts: [800, "x", 110], answer: "non-numeric" },                // dropped
      { counts: [800, 150, 110] },                                        // dropped (no answer)
      { counts: [-5, 999999, 2.7], answer: "clamp me" },                  // clamped + rounded
      { counts: [1, 2, 3], answer: "a" }, { counts: [1, 2, 3], answer: "b" },
      { counts: [1, 2, 3], answer: "c" }, { counts: [1, 2, 3], answer: "d" }, // overflow past 4
    ];
    const out = sanitizeScenarios(raw, STAGES);
    expect(out.length).toBe(4);
    expect(out[0]).toEqual({ counts: [800, 150, 110], answer: "big drop at the start" });
    expect(out[1].counts).toEqual([1, 100000, 3]); // -5→1 (clamped low), 999999→100000 (clamped high), 2.7→3 (rounded)
  });

  it("sanitizeScenarios returns [] for <2 stages", () => {
    expect(sanitizeScenarios([{ counts: [1], answer: "x" }], ["only"])).toEqual([]);
  });
});

describe("generateScenarios (agent call)", () => {
  const okFetch = async () => ({
    ok: true,
    json: async () => ({ content: [{ type: "text", text: '[{"counts":[500,300,90],"answer":"reads well"}]' }] }),
  });

  it("returns [] with no api key (never calls fetch)", async () => {
    let called = false;
    const out = await generateScenarios({ stages: STAGES, apiKey: "", fetchImpl: async () => { called = true; return {}; } });
    expect(out).toEqual([]);
    expect(called).toBe(false);
  });

  it("calls Claude and returns sanitized scenarios", async () => {
    let url, opts;
    const out = await generateScenarios({
      stages: STAGES, level: "advanced", apiKey: "sk-test",
      fetchImpl: async (u, o) => { url = u; opts = o; return okFetch(); },
    });
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect(opts.headers["x-api-key"]).toBe("sk-test");
    expect(JSON.parse(opts.body).model).toBe("claude-opus-4-8");
    expect(out).toEqual([{ counts: [500, 300, 90], answer: "reads well" }]);
  });

  it("returns [] on a non-OK response", async () => {
    const out = await generateScenarios({ stages: STAGES, apiKey: "sk-test", fetchImpl: async () => ({ ok: false, json: async () => ({}) }) });
    expect(out).toEqual([]);
  });

  it("returns [] when fetch throws", async () => {
    const out = await generateScenarios({ stages: STAGES, apiKey: "sk-test", fetchImpl: async () => { throw new Error("network"); } });
    expect(out).toEqual([]);
  });
});
