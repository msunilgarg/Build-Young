import { describe, it, expect } from "vitest";
import {
  STAGES, EVENTS, cohortMeta, conversionRate, summarize, segments, toCSV, toDataRoom, ratePct, engagement, revenueBySource, settlementSummary,
} from "../src/funnel.js";

// Build one timestamped event.
const ev = (event, props = {}) => ({ event, ts: Date.now(), props });
const n = (count, make) => Array.from({ length: count }, (_, i) => make(i));

const FALL = cohortMeta("fall-mw");     // Builders / fall / $999
// Winter has no live batch (not yet scheduled), but the funnel still segments by season —
// synthesize a winter cohort's meta to exercise per-season aggregation.
const WINTER = { batchId: "winter-tt", season: "winter", track: "Builders", priceCents: 99900 };

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
  // visited → enroll_started → enrolled → class_started → weeks 2..12 → graduated
  // (12 weeks flat — no separate check-in)
  const events = [
    ev("visited"),
    ev("enroll_started", { ...FALL, fromCall: false }),
    ev("enrolled", { ...FALL, fromCall: false }),
    ev("class_started", FALL),
    ...n(11, (i) => ev("week_advanced", { ...FALL, week: i + 2 })), // weeks 2..12
    ev("graduated", FALL),
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
  it("fills the week curve (2..12); the check-in curve is empty (CHECKINS = 0)", () => {
    expect(s.weekCurve.map((w) => w.week)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(s.weekCurve.every((w) => w.value === 1)).toBe(true);
    expect(s.checkinCurve).toEqual([]); // no separate check-in
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
    ev("visited", { source: "google.com", country: "US" }),
    ev("visited", { source: "google.com", country: "US" }),
    ev("visited", { source: "direct", country: "IN" }),
    ev("screen_view", { screen: "home", ms: 10000 }),
    ev("screen_view", { screen: "home", ms: 20000 }),
    ev("screen_view", { screen: "enroll", ms: 5000 }),
    ev("exit", { screen: "home", sid: "s1" }),    // session s1 hides on home...
    ev("exit", { screen: "enroll", sid: "s1" }),  // ...then leaves from enroll → s1 counts ONCE, as enroll (last)
    ev("exit", { screen: "home", sid: "s2" }),     // session s2 leaves from home
    ev("hesitation", { reason: "cost" }),
    ev("hesitation", { reason: "cost" }),
    ev("hesitation", { reason: "schedule" }),
  ];
  const eng = engagement(events);

  it("ranks visit sources by count, busiest first", () => {
    expect(eng.sources[0]).toEqual({ source: "google.com", count: 2 });
    expect(eng.sources.find((s) => s.source === "direct").count).toBe(1);
  });
  it("ranks visitor countries by count, most common first", () => {
    expect(eng.countries[0]).toEqual({ country: "US", count: 2 });
    expect(eng.countries.find((c) => c.country === "IN").count).toBe(1);
  });
  it("computes per-screen views + average dwell (ms)", () => {
    const home = eng.screens.find((s) => s.screen === "home");
    expect(home.views).toBe(2);
    expect(home.avgMs).toBe(15000); // (10000 + 20000) / 2
    expect(eng.screens[0].screen).toBe("home"); // most-viewed first
  });
  it("dedupes exits to ONE per session (sid) — the last screen the session was on", () => {
    expect(eng.exitTotal).toBe(2); // two sessions (s1, s2), not the 3 raw exit events
    expect(eng.exits.find((s) => s.screen === "enroll").count).toBe(1); // s1's LAST exit
    expect(eng.exits.find((s) => s.screen === "home").count).toBe(1);   // s2
    eng.exits.forEach((x) => expect(x.pct).toBeCloseTo(1 / 2, 5));
  });
  it("ranks hesitation reasons by count, most common first", () => {
    expect(eng.hesitations[0]).toEqual({ reason: "cost", count: 2 });
    expect(eng.hesitations.find((h) => h.reason === "schedule").count).toBe(1);
  });
  it("is empty + safe on no/garbage input", () => {
    expect(engagement([])).toEqual({ sources: [], countries: [], usStates: [], sourceCountry: [], screens: [], exits: [], exitTotal: 0, hesitations: [] });
    expect(engagement(null).sources).toEqual([]);
  });
});

describe("revenueBySource — channel mix (direct vs each partner); partner seats count at NET", () => {
  it("groups enrolled events by source, sums count + cents, sorts by revenue", () => {
    const events = [
      ev("enrolled", { ...FALL }),                                            // direct (no source) — gross 99900
      ev("enrolled", { ...FALL }),                                            // direct — gross 99900
      ev("enrolled", { batchId: "fall-mw", season: "fall", track: "Builders", priceCents: 69930, source: "partner:outschool" }), // net of 30% cut
      ev("enrolled", { batchId: "fall-mw", season: "fall", track: "Builders", priceCents: 69930, source: "partner:outschool" }),
      ev("enrolled", { batchId: "fall-mw", season: "fall", track: "Builders", priceCents: 84915, source: "partner:varsity" }),    // net of 15% cut
      ev("visited", { source: "google" }),                                    // not an enrolled event → ignored
    ];
    const out = revenueBySource(events);
    expect(out.map((s) => s.source)).toEqual(["direct", "partner:outschool", "partner:varsity"]); // by cents desc
    expect(out.find((s) => s.source === "direct")).toEqual({ source: "direct", count: 2, cents: 199800 });
    expect(out.find((s) => s.source === "partner:outschool")).toEqual({ source: "partner:outschool", count: 2, cents: 139860 });
    expect(out.find((s) => s.source === "partner:varsity")).toEqual({ source: "partner:varsity", count: 1, cents: 84915 });
  });
  it("the partner NET still lands in the topline summarize().revenue (single source of truth)", () => {
    const events = [
      ev("enrolled", { ...FALL }),                                            // 99900 gross
      ev("enrolled", { batchId: "fall-mw", season: "fall", track: "Builders", priceCents: 69930, source: "partner:outschool" }), // 69930 net
    ];
    expect(summarize(events).revenue.grossCents).toBe(169830); // 99900 + 69930 (net) — partner counted at net
    expect(revenueBySource(events).reduce((s, x) => s + x.cents, 0)).toBe(169830); // slices sum to the topline
  });
  it("empty / non-array → []", () => {
    expect(revenueBySource([])).toEqual([]);
    expect(revenueBySource(null)).toEqual([]);
  });
});

describe("settlementSummary — per-partner owed vs paid (T30)", () => {
  const partners = [
    { id: "outschool", name: "Outschool", cutPct: 0.3, payments: [{ date: "2026-09-01", amountCents: 50000, note: "wire" }] },
    { id: "varsity", name: "Varsity", cutPct: 0.15, payments: [] },
  ];
  const enrollments = [
    { paymentSource: "partner", partner: "outschool", priceCents: 99900, cutPct: 0.3, onboarded: true },
    { paymentSource: "partner", partner: "outschool", priceCents: 99900, cutPct: 0.3, onboarded: true },
    { paymentSource: "partner", partner: "outschool", priceCents: 99900, cutPct: 0.3, onboarded: false }, // PENDING → not owed
    { paymentSource: "partner", partner: "varsity", priceCents: 99900, cutPct: 0.15, onboarded: true },
  ];
  it("counts only onboarded seats; nets the cut; subtracts recorded payments", () => {
    const out = settlementSummary(partners, enrollments);
    const os = out.find((s) => s.id === "outschool");
    expect(os.seats).toBe(2); // pending seat excluded
    expect(os.grossCents).toBe(199800);
    expect(os.cutCents).toBe(2 * Math.round(99900 * 0.3)); // 2 × 29970 = 59940
    expect(os.netOwedCents).toBe(199800 - 59940); // 139860
    expect(os.receivedCents).toBe(50000);
    expect(os.outstandingCents).toBe(139860 - 50000); // 89860
    const v = out.find((s) => s.id === "varsity");
    expect(v).toMatchObject({ seats: 1, grossCents: 99900, receivedCents: 0, outstandingCents: 99900 - Math.round(99900 * 0.15) });
  });
  it("empty/garbage → safe", () => {
    expect(settlementSummary([], [])).toEqual([]);
    expect(settlementSummary(null, null)).toEqual([]);
  });
});

describe("toDataRoom — accounting export carries the settlement ledger (T30)", () => {
  it("merges an `extra` (e.g. settlement) into the bundle without breaking the base shape", () => {
    const room = toDataRoom([ev("enrolled", { ...FALL })], { settlement: [{ id: "outschool", outstandingCents: 89860 }] });
    expect(room.eventCount).toBe(1);
    expect(room.summary.counts.enrolled).toBe(1);
    expect(room.settlement).toEqual([{ id: "outschool", outstandingCents: 89860 }]);
    // back-compat: no extra → no settlement key
    expect(toDataRoom([]).settlement).toBeUndefined();
  });
});

describe("segments — includes a catalog-only season present in the events (not just predefined)", () => {
  it("breaks out a founder-created 'summer' cohort that has enrollments", () => {
    const events = [
      ev("enrolled", { ...FALL }),
      ev("enrolled", { batchId: "summer-1", season: "summer", track: "Builders", priceCents: 99900 }),
    ];
    const seg = segments(events);
    const summer = seg.bySeason.find((s) => s.key === "summer");
    expect(summer).toBeTruthy();                 // not dropped just because it isn't predefined
    expect(summer.summary.counts.enrolled).toBe(1);
    // predefined seasons still present + first
    expect(seg.bySeason.slice(0, 3).map((s) => s.key)).toEqual(["fall", "winter", "spring"]);
  });
});
