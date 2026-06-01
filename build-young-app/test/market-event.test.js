import { describe, it, expect } from "vitest";
import handler from "../api/market-event.js";
import { marketEventFor, MEDIA } from "../api/_lib/marketSchedule.js";

// Minimal req/res harness matching the other api tests' style.
function makeRes() {
  return {
    statusCode: 0,
    payload: null,
    status(code) { this.statusCode = code; return this; },
    json(obj) { this.payload = obj; return this; },
  };
}
function call({ method = "GET", query } = {}) {
  const res = makeRes();
  handler({ method, query }, res);
  return res;
}

describe("/api/market-event — returns the SINGLE current event", () => {
  it("returns the correct single course-week event with media for a live-market week", () => {
    const res = call({ query: { phase: "course", week: "8" } });
    expect(res.statusCode).toBe(200);
    const ev = res.payload.event;
    const expected = marketEventFor("course", 8, 0);
    expect(ev.h).toBe(expected.h); // "The Fed hikes rates" (first investing week)
    expect(ev.d).toBe(expected.d);
    expect(ev.e).toEqual(expected.e);
    // live-market weeks (8–12) carry their authored media inline
    expect(ev.media).toEqual(MEDIA[expected.h]);
    expect(ev.media.resources.length).toBeGreaterThan(0);
  });

  it("returns the flat setup event (no media) for the build/setup weeks (1–7)", () => {
    for (const week of ["1", "7"]) {
      const res = call({ query: { phase: "course", week } });
      expect(res.statusCode).toBe(200);
      const ev = res.payload.event;
      expect(ev.h).toBe("Markets are quiet");
      expect(ev).not.toHaveProperty("media"); // flat weeks have no authored media
    }
  });

  it("returns the correct single check-in event", () => {
    const res = call({ query: { phase: "checkin", checkin: "0" } });
    expect(res.statusCode).toBe(200);
    expect(res.payload.event.h).toBe(marketEventFor("checkin", 0, 0).h); // "Q1 — Inflation cools"
    const res5 = call({ query: { phase: "checkin", checkin: "5" } });
    expect(res5.payload.event.h).toBe(marketEventFor("checkin", 0, 5).h); // "Q6 — Volatile finish"
  });

  it("NEVER returns an array / the full schedule — only one event object", () => {
    const res = call({ query: { phase: "course", week: "12" } });
    expect(Array.isArray(res.payload.event)).toBe(false);
    expect(typeof res.payload.event).toBe("object");
    // no field on the response leaks the full arrays
    const json = JSON.stringify(res.payload);
    // a distinctive OTHER week's headline must not appear in a single-week response
    expect(json).not.toContain("The Fed hikes rates"); // that's week 8, not requested
    expect(json).not.toContain("Inflation runs hot"); // week 9, not requested
    // and the response carries exactly one event headline
    expect(res.payload.event.h).toBe("Soft landing hopes"); // week 12 = MACRO[4]
  });

  it("validates inputs: bad phase, out-of-range week, non-integer", () => {
    expect(call({ query: { phase: "bogus", week: "3" } }).statusCode).toBe(400);
    expect(call({ query: {} }).statusCode).toBe(400);
    expect(call({ query: { phase: "course", week: "0" } }).statusCode).toBe(400);
    expect(call({ query: { phase: "course", week: "13" } }).statusCode).toBe(400);
    expect(call({ query: { phase: "course", week: "abc" } }).statusCode).toBe(400);
    expect(call({ query: { phase: "course", week: "2.5" } }).statusCode).toBe(400);
    expect(call({ query: { phase: "checkin", checkin: "-1" } }).statusCode).toBe(400);
    expect(call({ query: { phase: "checkin", checkin: "x" } }).statusCode).toBe(400);
  });

  it("rejects non-GET methods", () => {
    const res = makeRes();
    handler({ method: "POST", query: { phase: "course", week: "3" } }, res);
    expect(res.statusCode).toBe(405);
  });

  it("parses params from req.url when req.query is absent (non-Vercel host)", () => {
    const res = makeRes();
    handler({ method: "GET", url: "/api/market-event?phase=course&week=9" }, res);
    expect(res.statusCode).toBe(200);
    expect(res.payload.event.h).toBe("Inflation runs hot"); // week 9 = MACRO[1]
  });
});
