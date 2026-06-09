import { describe, it, expect } from "vitest";
import { journeys } from "../src/funnel.js";

// Build a path-relevant event the way the client does: screen_view (a screen the visitor was on)
// and exit (the visit ended), both tagged with the anonymous per-visit `sid`.
const view = (sid, screen, ts) => ({ event: "screen_view", ts, props: { sid, screen } });
const exit = (sid, screen, ts) => ({ event: "exit", ts, props: { sid, screen } });

describe("journeys (per-visit ordered paths)", () => {
  it("reconstructs a visit's path in time order and marks where it left", () => {
    const evs = [
      view("a", "home", 1),
      view("a", "enroll", 2),
      view("a", "home", 3),
      view("a", "call", 4),
      exit("a", "call", 5),
    ];
    const { paths, sessions } = journeys(evs);
    expect(sessions).toBe(1);
    expect(paths).toHaveLength(1);
    expect(paths[0].steps).toEqual(["home", "enroll", "home", "call"]);
    expect(paths[0].left).toBe(true);
    expect(paths[0].count).toBe(1);
  });

  it("orders by timestamp regardless of event order in the array", () => {
    const evs = [view("a", "call", 4), view("a", "home", 1), view("a", "enroll", 2)];
    expect(journeys(evs).paths[0].steps).toEqual(["home", "enroll", "call"]);
  });

  it("collapses consecutive repeats of the same screen (e.g. a tab-away/return)", () => {
    const evs = [view("a", "home", 1), view("a", "home", 2), view("a", "enroll", 3)];
    expect(journeys(evs).paths[0].steps).toEqual(["home", "enroll"]);
  });

  it("counts identical paths together and sorts most common first", () => {
    const mk = (sid) => [view(sid, "home", 1), exit(sid, "home", 2)];
    const evs = [
      ...mk("a"), ...mk("b"), ...mk("c"), // 3× home → left
      view("d", "home", 1), view("d", "enroll", 2), exit("d", "enroll", 3), // 1× home → enroll → left
    ];
    const { paths, sessions } = journeys(evs);
    expect(sessions).toBe(4);
    expect(paths[0].steps).toEqual(["home"]);
    expect(paths[0].left).toBe(true);
    expect(paths[0].count).toBe(3);
    expect(paths[1].steps).toEqual(["home", "enroll"]);
    expect(paths[1].count).toBe(1);
  });

  it("a path with no exit yet is not marked as left", () => {
    const evs = [view("a", "home", 1), view("a", "enroll", 2)];
    const p = journeys(evs).paths[0];
    expect(p.steps).toEqual(["home", "enroll"]);
    expect(p.left).toBe(false);
  });

  it("ignores events without a sid (legacy/anonymous-only) and an exit with no views", () => {
    const evs = [
      { event: "screen_view", ts: 1, props: { screen: "home" } }, // no sid
      exit("z", "home", 2), // exit but no screen_view for z
      { event: "visited", ts: 1, props: { sid: "a", source: "direct" } }, // not a path event
    ];
    expect(journeys(evs)).toEqual({ paths: [], sessions: 0 });
  });

  it("respects the limit", () => {
    const evs = [];
    for (let i = 0; i < 20; i++) { evs.push(view(`s${i}`, `screen${i}`, 1), exit(`s${i}`, `screen${i}`, 2)); }
    expect(journeys(evs, { limit: 5 }).paths).toHaveLength(5);
  });

  it("is empty + safe on no/garbage input", () => {
    expect(journeys(null)).toEqual({ paths: [], sessions: 0 });
    expect(journeys(undefined)).toEqual({ paths: [], sessions: 0 });
    expect(journeys([{}, null, { event: "exit" }])).toEqual({ paths: [], sessions: 0 });
  });
});
