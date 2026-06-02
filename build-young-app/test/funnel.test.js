import { describe, it, expect } from "vitest";
import {
  STAGES, EVENTS, cohortMeta, conversionRate, summarize, segments, toCSV, toDataRoom, ratePct,
} from "../src/funnel.js";

// Build one timestamped event.
const ev = (event, props = {}) => ({ event, ts: Date.now(), props });
const n = (count, make) => Array.from({ length: count }, (_, i) => make(i));

const MS_FALL = cohortMeta("fall-ms-mon");   // Middle School / fall / $899
const HS_WINTER = cohortMeta("winter-hs-wed"); // High School / winter / $899

describe("funnel definitions", () => {
  it("has the linear spine in order", () => {
    expect(STAGES.map((s) => s.key)).toEqual(["visited", "enroll_started", "enrolled", "class_started", "graduated"]);
  });
  it("conversionRate guards divide-by-zero", () => {
    expect(conversionRate(5, 10)).toBe(0.5);
    expect(conversionRate(3, 0)).toBe(0);
  });
  it("cohortMeta pulls season/track/price and carries no PII", () => {
    expect(MS_FALL).toEqual({ batchId: "fall-ms-mon", season: "fall", track: "Middle School", priceCents: 89900 });
    expect(Object.keys(MS_FALL)).not.toContain("email");
  });
});

describe("full single-student lifecycle", () => {
  // visited → enroll_started → enrolled → class_started → weeks 2..12 → graduated → check-ins 1..6
  const events = [
    ev("visited"),
    ev("enroll_started", { ...MS_FALL, fromCall: false }),
    ev("enrolled", { ...MS_FALL, fromCall: false }),
    ev("class_started", MS_FALL),
    ...n(11, (i) => ev("week_advanced", { ...MS_FALL, week: i + 2 })), // weeks 2..12
    ev("graduated", MS_FALL),
    ...n(6, (i) => ev("checkin_completed", { ...MS_FALL, checkin: i + 1 })), // months 1..6
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
  it("fills the week curve (2..12) and check-in curve (1..6)", () => {
    expect(s.weekCurve.map((w) => w.week)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(s.weekCurve.every((w) => w.value === 1)).toBe(true);
    expect(s.checkinCurve.map((c) => c.checkin)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(s.checkinCurve.every((c) => c.value === 1)).toBe(true);
  });
  it("derives revenue from the enrolled price with no refunds", () => {
    expect(s.revenue).toEqual({ grossCents: 89900, refundedCents: 0, netCents: 89900 });
  });
});

describe("aggregate funnel over many students", () => {
  const events = [
    ...n(100, () => ev("visited")),
    ...n(40, (i) => ev("enroll_started", { fromCall: i < 10 })),     // 10 came from a call
    ...n(12, () => ev("call_booked")),
    ...n(15, (i) => ev("enrolled", { ...MS_FALL, fromCall: i < 5 })), // 15 fall MS, 5 via call
    ...n(5, () => ev("enrolled", { ...HS_WINTER, fromCall: false })), // 5 winter HS
    ...n(16, () => ev("class_started", MS_FALL)),
    ev("week_advanced", { ...MS_FALL, week: 2 }), ev("week_advanced", { ...MS_FALL, week: 2 }),
    ev("week_advanced", { ...MS_FALL, week: 12 }),
    ...n(2, () => ev("withdrawn", { ...MS_FALL, refundTier: "full", refundCents: 89900, stage: "before_start" })),
    ev("withdrawn", { ...MS_FALL, refundTier: "prorated", refundCents: 82400, stage: "in_progress" }),
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
    expect(s.revenue.grossCents).toBe(20 * 89900);
    expect(s.revenue.refundedCents).toBe(89900 + 89900 + 82400);
    expect(s.revenue.netCents).toBe(20 * 89900 - (89900 * 2 + 82400));
  });
  it("reads the week-progression curve", () => {
    expect(s.weekCurve.find((w) => w.week === 2).value).toBe(2);
    expect(s.weekCurve.find((w) => w.week === 12).value).toBe(1);
  });

  it("segments by season and track (from the enrolled stage onward)", () => {
    const seg = segments(events);
    const fall = seg.bySeason.find((x) => x.key === "fall").summary;
    const winter = seg.bySeason.find((x) => x.key === "winter").summary;
    const spring = seg.bySeason.find((x) => x.key === "spring").summary;
    expect(fall.counts.enrolled).toBe(15);
    expect(winter.counts.enrolled).toBe(5);
    expect(spring.counts.enrolled).toBe(0);

    const ms = seg.byTrack.find((x) => x.key === "Middle School").summary;
    const hs = seg.byTrack.find((x) => x.key === "High School").summary;
    expect(ms.counts.enrolled).toBe(15);
    expect(hs.counts.enrolled).toBe(5);
    // top-of-funnel events (no cohort) are excluded from a segment
    expect(fall.counts.visited).toBe(0);
  });
});

describe("data-room exports", () => {
  const events = [ev("visited"), ev("enrolled", { ...MS_FALL, fromCall: true })];
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
  });
});
