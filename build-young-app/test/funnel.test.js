import { describe, it, expect } from "vitest";
import {
  STAGES, EVENTS, cohortMeta, conversionRate, summarize, segments, toCSV, toDataRoom, ratePct, engagement,
} from "../src/funnel.js";

// Build one timestamped event.
const ev = (event, props = {}) => ({ event, ts: Date.now(), props });
const n = (count, make) => Array.from({ length: count }, (_, i) => make(i));

const FALL = cohortMeta("fall-mw");     // Builders / fall / $999
const WINTER = cohortMeta("winter-tt"); // Builders / winter / $999

describe("funnel definitions", () => {
  it("has the linear spine in order", () => {
    expect(STAGES.map((s) => s.key)).toEqual(["visited", "enroll_started", "enrolled", "class_started", "graduated"]);
  });
  it("conversionRate guards divide-by-zero", () => {
    expect(conversionRate(5, 10)).toBe(0.5);
    expect(conversionRate(3, 0)).toBe(0);
  });
  it("cohortMeta pulls season/track/price and carries no PII", () => {
    expect(FALL).toEqual({ batchId: "fall-mw", season: "fall", track: "Builders", priceCents: 99900 });
    expect(Object.keys(FALL)).not.toContain("email");
  });
});

describe("full single-student lifecycle", () => {
  // visited → enroll_started → enrolled → class_started → weeks 2..12 → graduated → check-in 1
  const events = [
    ev("visited"),
    ev("enroll_started", { ...FALL, fromCall: false }),
    ev("enrolled", { ...FALL, fromCall: false }),
    ev("class_started", FALL),
    ...n(11, (i) => ev("week_advanced", { ...FALL, week: i + 2 })), // weeks 2..12
    ev("graduated", FALL),
    ev("checkin_completed", { ...FALL, checkin: 1 }), // the single monthly check-in
  ];
  const s = summarize(events);

  it("counts one at every spine stage", () => {
    expect(s.counts).toEqual({ visited: 1, enroll_started: 1, enrolled: 1, class_started: 1, graduated: 1 });
  });
  it("computes 100% conversion down a complete lifecycle", () => {
    s.steps.forEach((step) => expect(step.rate).toBe(1));
    expect(s.overall).toBe(1);
    expect(ratePct(s.overall)).toBe("100%");
  });
  it("fills the week curve (2..12) and the check-in retention point(s)", () => {
    expect(s.weekCurve.map((w) => w.week)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(s.weekCurve.every((w) => w.value === 1)).toBe(true);
    expect(s.checkinCurve.map((c) => c.checkin)).toEqual([1]); // CHECKINS = 1
    expect(s.checkinCurve.every((c) => c.value === 1)).toBe(true);
  });
  it("derives revenue from the enrolled price with no refunds", () => {
    expect(s.revenue).toEqual({ grossCents: 99900, refundedCents: 0, netCents: 99900 });
  });
});

describe("aggregate funnel over many students", () => {
  const events = [
    ...n(100, () => ev("visited")),
    ...n(40, (i) => ev("enroll_started", { fromCall: i < 10 })),     // 10 came from a call
    ...n(12, () => ev("call_booked")),
    ...n(15, (i) => ev("enrolled", { ...FALL, fromCall: i < 5 })), // 15 fall, 5 via call
    ...n(5, () => ev("enrolled", { ...WINTER, fromCall: false })), // 5 winter
    ...n(16, () => ev("class_started", FALL)),
    ev("week_advanced", { ...FALL, week: 2 }), ev("week_advanced", { ...FALL, week: 2 }),
    ev("week_advanced", { ...FALL, week: 12 }),
    ...n(2, () => ev("withdrawn", { ...FALL, refundTier: "full", refundCents: 99900, stage: "before_start" })),
    ev("withdrawn", { ...FALL, refundTier: "prorated", refundCents: 82400, stage: "in_progress" }),
  ];
  const s = summarize(events);

  it("counts each spine stage", () => {
    expect(s.counts).toMatchObject({ visited: 100, enroll_started: 40, enrolled: 20, class_started: 16 });
  });
  it("computes the consecutive + overall conversion rates", () => {
    expect(s.steps[0].rate).toBeCloseTo(0.4); // visited → enroll_started
    expect(s.steps[1].rate).toBeCloseTo(0.5); // enroll_started → enrolled
    expect(s.steps[2].rate).toBeCloseTo(0.8); // enrolled → class_started
    expect(s.overall).toBeCloseTo(0.2);        // visited → enrolled
  });
  it("splits the call-assist vs. direct-enroll branches", () => {
    expect(s.calls).toEqual({ booked: 12, enrolledFromCall: 5, enrolledDirect: 15 });
  });
  it("tags withdrawals by refund tier and nets them out of revenue", () => {
    expect(s.withdrawals.total).toBe(3);
    expect(s.withdrawals.byTier).toEqual({ full: 2, prorated: 1, none: 0 });
    expect(s.revenue.grossCents).toBe(20 * 99900);
    expect(s.revenue.refundedCents).toBe(99900 + 99900 + 82400);
    expect(s.revenue.netCents).toBe(20 * 99900 - (99900 * 2 + 82400));
  });
  it("buckets withdrawals by cancellation reason (untagged → 'unspecified')", () => {
    expect(s.withdrawals.byReason).toEqual({ unspecified: 3 });
    const withReasons = summarize([
      ev("withdrawn", { ...FALL, refundTier: "full", reason: "cost" }),
      ev("withdrawn", { ...FALL, refundTier: "full", reason: "cost" }),
      ev("withdrawn", { ...FALL, refundTier: "prorated", reason: "schedule" }),
      ev("withdrawn", { ...FALL, refundTier: "full" }), // no reason
    ]).withdrawals;
    expect(withReasons.byReason).toEqual({ cost: 2, schedule: 1, unspecified: 1 });
  });
  it("reads the week-progression curve", () => {
    expect(s.weekCurve.find((w) => w.week === 2).value).toBe(2);
    expect(s.weekCurve.find((w) => w.week === 12).value).toBe(1);
  });

  it("segments by season (and the single Builders track) from the enrolled stage onward", () => {
    const seg = segments(events);
    const fall = seg.bySeason.find((x) => x.key === "fall").summary;
    const winter = seg.bySeason.find((x) => x.key === "winter").summary;
    const spring = seg.bySeason.find((x) => x.key === "spring").summary;
    expect(fall.counts.enrolled).toBe(15);
    expect(winter.counts.enrolled).toBe(5);
    expect(spring.counts.enrolled).toBe(0);

    // One combined track now: all 20 enrollments are "Builders".
    expect(seg.byTrack).toHaveLength(1);
    const builders = seg.byTrack.find((x) => x.key === "Builders").summary;
    expect(builders.counts.enrolled).toBe(20);
    // top-of-funnel events (no cohort) are excluded from a segment
    expect(fall.counts.visited).toBe(0);
  });
});

describe("data-room exports", () => {
  const events = [ev("visited"), ev("enrolled", { ...FALL, fromCall: true })];
  it("CSV has a header row + one row per event, no PII columns", () => {
    const csv = toCSV(events);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("ts,iso,event,season,track,batchId,week,checkin,refundTier,refundCents,priceCents,fromCall");
    expect(lines).toHaveLength(3);
    expect(csv).not.toMatch(/email|name/i);
  });
  it("JSON bundle carries events + summary + segments", () => {
    const room = toDataRoom(events);
    expect(room.eventCount).toBe(2);
    expect(room.summary.counts.enrolled).toBe(1);
    expect(room.segments.bySeason).toHaveLength(3);
    expect(Array.isArray(room.events)).toBe(true);
  });
  it("EVENTS lists every fired event name", () => {
    expect(EVENTS).toContain("week_advanced");
    expect(EVENTS).toContain("checkin_completed");
    expect(EVENTS).toContain("withdrawn");
    expect(EVENTS).toContain("screen_view");
    expect(EVENTS).toContain("exit");
  });
});

describe("traffic & engagement aggregation", () => {
  const events = [
    ev("visited", { source: "google.com" }),
    ev("visited", { source: "google.com" }),
    ev("visited", { source: "direct" }),
    ev("screen_view", { screen: "home", ms: 10000 }),
    ev("screen_view", { screen: "home", ms: 20000 }),
    ev("screen_view", { screen: "enroll", ms: 5000 }),
    ev("exit", { screen: "home" }),
    ev("exit", { screen: "home" }),
    ev("exit", { screen: "enroll" }),
  ];
  const eng = engagement(events);

  it("ranks visit sources by count, busiest first", () => {
    expect(eng.sources[0]).toEqual({ source: "google.com", count: 2 });
    expect(eng.sources.find((s) => s.source === "direct").count).toBe(1);
  });
  it("computes per-screen views + average dwell (ms)", () => {
    const home = eng.screens.find((s) => s.screen === "home");
    expect(home.views).toBe(2);
    expect(home.avgMs).toBe(15000); // (10000 + 20000) / 2
    expect(eng.screens[0].screen).toBe("home"); // most-viewed first
  });
  it("computes exit screens with count + share of all exits", () => {
    expect(eng.exitTotal).toBe(3);
    const home = eng.exits.find((s) => s.screen === "home");
    expect(home.count).toBe(2);
    expect(home.pct).toBeCloseTo(2 / 3, 5);
  });
  it("is empty + safe on no/garbage input", () => {
    expect(engagement([])).toEqual({ sources: [], screens: [], exits: [], exitTotal: 0 });
    expect(engagement(null).sources).toEqual([]);
  });
});
