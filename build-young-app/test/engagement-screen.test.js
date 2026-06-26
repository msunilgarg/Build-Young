import { describe, it, expect } from "vitest";
import { engagementScreen } from "../src/lib.js";
import { engagement, journeys } from "../src/funnel.js";

// SPECS/022: the funded/apply flow shares the `enroll` route with paid enrollment, so it's invisible in the
// whole-site Traffic & Top-paths panels. `engagementScreen` keys it as `enroll-scholarship` when the enroll
// flow is entered for a free ($0) cohort, so the founder console surfaces it as its own row/path.

describe("engagementScreen — the funded apply flow keys as its own screen (SPECS/022)", () => {
  const free = { id: "fall-free", price: 0 };
  const paid = { id: "fall-mw", price: 999 };

  it("enroll + a free ($0) cohort → 'enroll-scholarship'", () => {
    expect(engagementScreen("enroll", free)).toBe("enroll-scholarship");
    expect(engagementScreen("enroll", { id: "x", price: "0" })).toBe("enroll-scholarship"); // string price coerces
  });

  it("enroll + a paid cohort → plain 'enroll'", () => {
    expect(engagementScreen("enroll", paid)).toBe("enroll");
  });

  it("any other route keeps its route key, even with a free batch preselected", () => {
    expect(engagementScreen("home", free)).toBe("home");
    expect(engagementScreen("call", free)).toBe("call");
  });

  it("no batch preselected (generic enroll) → plain 'enroll' (never crashes on null/undefined)", () => {
    expect(engagementScreen("enroll", undefined)).toBe("enroll");
    expect(engagementScreen("enroll", null)).toBe("enroll");
  });
});

describe("engagement()/journeys() distinguish the scholarship-apply screen from enroll (SPECS/022)", () => {
  // sid "a": a scholarship applicant (home → scholarship application → left); sid "b": a paid enroller.
  const events = [
    { event: "screen_view", props: { screen: "home", ms: 1000, sid: "a" }, ts: 1 },
    { event: "screen_view", props: { screen: "enroll-scholarship", ms: 9000, sid: "a" }, ts: 2 },
    { event: "exit", props: { screen: "enroll-scholarship", sid: "a" }, ts: 3 },
    { event: "screen_view", props: { screen: "enroll", ms: 5000, sid: "b" }, ts: 1 },
    { event: "exit", props: { screen: "enroll", sid: "b" }, ts: 2 },
  ];

  it("'Which screens hold attention' lists enroll-scholarship and enroll as separate rows", () => {
    const screens = engagement(events).screens.map((s) => s.screen);
    expect(screens).toContain("enroll-scholarship");
    expect(screens).toContain("enroll");
  });

  it("'Where they leave' shows the scholarship-apply screen as its own exit", () => {
    const exits = engagement(events).exits.map((s) => s.screen);
    expect(exits).toContain("enroll-scholarship");
    expect(exits).toContain("enroll");
  });

  it("Top paths trace the scholarship apply visit as its own journey (home → enroll-scholarship)", () => {
    const { paths } = journeys(events);
    const schol = paths.find((p) => p.steps.includes("enroll-scholarship"));
    expect(schol).toBeTruthy();
    expect(schol.steps).toEqual(["home", "enroll-scholarship"]);
    // distinct from the paid-enroll journey
    expect(paths.find((p) => p.steps.includes("enroll") && !p.steps.includes("enroll-scholarship"))).toBeTruthy();
  });
});
