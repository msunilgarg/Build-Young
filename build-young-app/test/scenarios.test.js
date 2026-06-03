import { describe, it, expect } from "vitest";
import { SCENARIO_GROUPS, SCENARIOS, scenarioLabel } from "../src/scenarios.js";

describe("build scenarios", () => {
  it("has exactly 25 backup ideas across groups", () => {
    expect(SCENARIOS).toHaveLength(25);
    expect(SCENARIO_GROUPS.length).toBeGreaterThan(1);
    // every group has at least one item, and flat list == sum of groups
    const summed = SCENARIO_GROUPS.reduce((n, g) => n + g.items.length, 0);
    expect(summed).toBe(25);
  });

  it("every scenario has a unique id + a label", () => {
    const ids = SCENARIOS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(SCENARIOS.every((s) => s.id && s.label)).toBe(true);
  });

  it("scenarioLabel looks up by id", () => {
    expect(scenarioLabel(SCENARIOS[0].id)).toBe(SCENARIOS[0].label);
    expect(scenarioLabel("nope")).toBe("");
  });
});
