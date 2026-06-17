import { describe, it, expect } from "vitest";
import {
  validEmail, newState, advance, BATCHES,
  nextClassLabel, checkinDateLabel, classDateLabel, withdrawalEmail, refundFor,
  canWithdrawNow, REFUND_WEEKS, cohortStartInfo, enrollClosed, cohortClosed,
  coursePosition,
} from "../src/App.jsx";

const STUDENT = { name: "Jordan Rivera", email: "jordan@example.com", batch: "fall-mw", track: "Builders" };

describe("nextClassLabel", () => {
  // fall-mw starts "Sep 7, 2026" (a Monday), day "Mondays & Wednesdays · 5:00–6:30 PM PT".
  const batch = BATCHES.find((b) => b.id === "fall-mw");
  it("shows the concrete date + time for the current course week (not just the weekday)", () => {
    expect(nextClassLabel(batch, "course", 1)).toBe("Mon, Sep 7, 2026 · 5:00–6:30 PM PT");
    // Week N is start + (N-1)*7 days.
    expect(nextClassLabel(batch, "course", 3)).toBe("Mon, Sep 21, 2026 · 5:00–6:30 PM PT");
  });
  it("uses the follow-up check-in date once the course is over", () => {
    expect(nextClassLabel(batch, "checkin", 0)).toBe(checkinDateLabel(batch));
  });
  it("falls back to the recurring day label when start is unparseable", () => {
    const bad = { ...batch, start: "not-a-date" };
    expect(nextClassLabel(bad, "course", 1)).toBe(bad.day);
  });
});

describe("classDateLabel (refund-deadline dates)", () => {
  const batch = BATCHES.find((b) => b.id === "fall-mw"); // starts Sep 7, 2026 (Mon)
  it("returns the date-only label for a given course week (no time)", () => {
    expect(classDateLabel(batch, 1)).toBe("Mon, Sep 7, 2026");   // full-refund deadline
    expect(classDateLabel(batch, 4)).toBe("Mon, Sep 28, 2026");  // prorated-window close
  });
  it("returns empty string when start is unparseable", () => {
    expect(classDateLabel({ ...batch, start: "nope" }, 1)).toBe("");
  });
});

describe("withdrawalEmail (refund confirmation)", () => {
  const batch = BATCHES.find((b) => b.id === "fall-mw");
  it("confirms a full refund when the cohort hasn't started", () => {
    const s = newState(STUDENT);
    const mail = withdrawalEmail(s, batch, batch.price, true);
    expect(mail.type).toBe("withdrawal");
    expect(mail.subject).toMatch(/canceled/i);
    expect(mail.body).toContain("full refund");
    expect(mail.body).toContain(`$${batch.price.toLocaleString()}`);
    expect(mail.body).toContain("Jordan");
  });
  it("confirms a prorated refund mid-course (counts weeks not yet held)", () => {
    // Dashboard "Week 3" = 2 weeks attended (week increments on each advance).
    const s = newState(STUDENT); s.week = 3; s.started = true;
    const refund = refundFor(batch, true, 3);
    const mail = withdrawalEmail(s, batch, refund, false);
    expect(mail.subject).toMatch(/withdrawal is confirmed/i);
    expect(mail.body).toContain("prorated refund");
    expect(mail.body).toContain("30 hours not yet held"); // 12 - (3 - 1)
    expect(mail.body).toContain("Attended: 6 of 36 hours");        // not 3
    expect(mail.body).toContain(`$${refund.toLocaleString()}`);
  });
});

describe("canWithdrawNow (cancellation window)", () => {
  it("is the first week", () => {
    expect(REFUND_WEEKS).toBe(1);
  });
  it("allows cancellation before the cohort starts (full refund window)", () => {
    const s = newState(STUDENT); // started: false
    expect(canWithdrawNow(s)).toBe(true);
  });
  it("allows it through the refund window (week ≤ REFUND_WEEKS), then NEVER after", () => {
    for (let wk = 1; wk <= 12; wk++) {
      const s = newState(STUDENT); s.started = true; s.week = wk;
      expect(canWithdrawNow(s), `week ${wk}`).toBe(wk <= REFUND_WEEKS);
    }
  });
  it("is never available once the course is over (check-in / graduated)", () => {
    const s = newState(STUDENT); s.started = true; s.phase = "checkin"; s.week = 2; s.checkin = 0;
    expect(canWithdrawNow(s)).toBe(false);
  });
});

describe("cohortStartInfo (pre-start awareness)", () => {
  const batch = BATCHES.find((b) => b.id === "fall-mw"); // starts Sep 7, 2026
  it("counts down weeks/days when the cohort hasn't started", () => {
    const aMonthBefore = cohortStartInfo(batch, new Date("2026-08-07T12:00:00Z"));
    expect(aMonthBefore.beforeStart).toBe(true);
    expect(aMonthBefore.phrase).toMatch(/starts in \d+ weeks/);
    expect(aMonthBefore.shortDate).toMatch(/Sep/);

    const daysBefore = cohortStartInfo(batch, new Date("2026-09-04T12:00:00Z"));
    expect(daysBefore.beforeStart).toBe(true);
    expect(daysBefore.phrase).toMatch(/starts in \d+ days/);
  });
  it("is no longer before-start once the start date passes", () => {
    const after = cohortStartInfo(batch, new Date("2026-09-20T12:00:00Z"));
    expect(after.beforeStart).toBe(false);
    expect(after.phrase).toBe("in progress");
  });
  it("handles an unparseable start date gracefully", () => {
    expect(cohortStartInfo({ start: "nope" }).beforeStart).toBe(false);
    expect(cohortStartInfo(null).days).toBe(null);
  });
});

describe("enrollClosed / cohortClosed (last day to enroll = day before start)", () => {
  const batch = BATCHES.find((b) => b.id === "fall-mw"); // starts Sep 7, 2026
  it("stays open up to and including the day before the start", () => {
    expect(enrollClosed(batch, new Date("2026-09-06T23:00:00"))).toBe(false); // day before
    expect(enrollClosed(batch, new Date("2026-08-01T12:00:00"))).toBe(false); // weeks before
    expect(cohortClosed(batch, new Date("2026-09-06T12:00:00"))).toBe(false);
  });
  it("closes on the start date and after", () => {
    expect(enrollClosed(batch, new Date("2026-09-07T00:01:00"))).toBe(true);  // start day
    expect(enrollClosed(batch, new Date("2026-09-20T12:00:00"))).toBe(true);  // after
    expect(cohortClosed(batch, new Date("2026-09-07T12:00:00"))).toBe(true);
  });
  it("honors the founder-set `full` flag regardless of date", () => {
    expect(cohortClosed({ ...batch, full: true }, new Date("2026-08-01T12:00:00"))).toBe(true);
  });
  it("never auto-closes on an unparseable start", () => {
    expect(enrollClosed({ start: "nope" }, new Date("2030-01-01T12:00:00"))).toBe(false);
  });
});

describe("refundFor (weeks not yet held)", () => {
  const batch = BATCHES.find((b) => b.id === "fall-mw"); // $999
  it("is the full price before the cohort starts", () => {
    expect(refundFor(batch, false, 1)).toBe(batch.price);
  });
  it("refunds for every session not yet held (no off-by-one)", () => {
    // "Week 2" = 1 attended → 11 unheld; "Week 3" = 2 attended → 10 unheld.
    expect(refundFor(batch, true, 2)).toBe(Math.round((batch.price * 11) / 12)); // $916, not $833
    expect(refundFor(batch, true, 3)).toBe(Math.round((batch.price * 10) / 12)); // $833
  });
  it("never refunds more than full or less than zero across the course", () => {
    for (let wk = 1; wk <= 12; wk++) {
      const r = refundFor(batch, true, wk);
      expect(r).toBeLessThanOrEqual(batch.price);
      expect(r).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("validEmail", () => {
  it("accepts well-formed addresses", () => {
    expect(validEmail("a@b.com")).toBe(true);
    expect(validEmail("  jordan.rivera@example.co.uk ")).toBe(true);
  });
  it("rejects malformed / empty input", () => {
    for (const bad of ["", "a", "a@b", "a@b.", "@b.com", "no spaces@x.com ok", undefined, null]) {
      expect(validEmail(bad)).toBe(false);
    }
  });
});

describe("newState", () => {
  it("starts a student at Week 1 with a welcome email and not-started flag", () => {
    const s = newState(STUDENT);
    expect(s.started).toBe(false);
    expect(s.week).toBe(1);
    expect(s.phase).toBe("course");
    expect(s.done).toBe(false);
    expect(s.emails).toHaveLength(1);
    expect(s.emails[0].type).toBe("welcome");
  });
});

describe("advance (week progression)", () => {
  it("moves to the next week and flips `started`, without mutating the previous state", () => {
    const prev = newState(STUDENT);
    const next = advance(prev);
    // immutability: the input is untouched
    expect(prev.week).toBe(1);
    expect(prev.started).toBe(false);
    // progression
    expect(next.week).toBe(2);
    expect(next.started).toBe(true);
    expect(next.done).toBe(false);
  });

  it("advancing from Week 11 lands on Week 12 but is not yet graduated", () => {
    const s = newState(STUDENT); s.week = 11; s.started = true;
    const next = advance(s);
    expect(next.week).toBe(12);
    expect(next.done).toBe(false);
  });

  it("finishing Week 12 graduates the student (done:true, week capped at 12)", () => {
    const s = newState(STUDENT); s.week = 12; s.started = true;
    const next = advance(s);
    expect(next.week).toBe(12);
    expect(next.done).toBe(true);
  });
});

describe("coursePosition (calendar-driven progression, PT-anchored)", () => {
  // fall-mw: Week 1 = Mon Sep 7, 2026 (PT). Week N anchor = start + 7*(N-1) days; final class
  // (Week 12 session 2) = Nov 25, 2026; graduation is the day AFTER that.
  const batch = BATCHES.find((b) => b.id === "fall-mw");

  it("before the cohort starts → week 1, not started, not done", () => {
    expect(coursePosition(batch, new Date("2026-08-01T12:00:00Z"))).toEqual({ week: 1, started: false, done: false });
  });

  it("on the start day (PT) → started, week 1", () => {
    // Noon PT on Sep 7 is unambiguously the start day.
    expect(coursePosition(batch, new Date("2026-09-07T19:00:00Z"))).toEqual({ week: 1, started: true, done: false });
  });

  it("counts weeks from the start: +7 days → week 2, +14 → week 3", () => {
    expect(coursePosition(batch, new Date("2026-09-14T19:00:00Z")).week).toBe(2);
    expect(coursePosition(batch, new Date("2026-09-21T19:00:00Z")).week).toBe(3);
  });

  it("caps at week 12 and graduates the day after the final class", () => {
    // Week 12 anchor = Nov 23; final class (session 2) = Nov 25. Still week 12, not yet done.
    expect(coursePosition(batch, new Date("2026-11-23T19:00:00Z"))).toMatchObject({ week: 12, done: false });
    // The day after the final class → graduated.
    expect(coursePosition(batch, new Date("2026-11-26T19:00:00Z")).done).toBe(true);
  });

  it("is anchored to Pacific Time, not the UTC instant, near midnight", () => {
    // 2026-09-07T04:00Z is Sep 6, 9pm PT → still BEFORE the cohort starts.
    expect(coursePosition(batch, new Date("2026-09-07T04:00:00Z")).started).toBe(false);
    // 2026-09-07T08:00Z is Sep 7, 1am PT → the cohort has started.
    expect(coursePosition(batch, new Date("2026-09-07T08:00:00Z")).started).toBe(true);
  });

  it("returns a safe default for an unparseable start date", () => {
    expect(coursePosition({ start: "nope" }, new Date("2026-09-07T19:00:00Z"))).toEqual({ week: 1, started: false, done: false });
  });
});

describe("BATCHES", () => {
  it("has the open Fall cohorts (2, on alternating day-pairs) with unique ids; Winter/Spring not yet scheduled", () => {
    expect(BATCHES).toHaveLength(2);
    expect(new Set(BATCHES.map((b) => b.id)).size).toBe(BATCHES.length);
    expect(BATCHES.every((b) => b.track === "Builders")).toBe(true);
    expect(BATCHES.every((b) => b.season === "fall")).toBe(true);
  });
});
