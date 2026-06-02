import { describe, it, expect } from "vitest";
import {
  validEmail, newState, advance, netWorth, holdingsTotal,
  takeSpree, investInstead, RISK_PRESETS, ASSETS, BATCHES, PAY,
  nextClassLabel, checkinDateLabel, classDateLabel, withdrawalEmail, refundFor,
  canWithdrawNow, REFUND_WEEKS, cohortStartInfo,
} from "../src/App.jsx";
// The market SCHEDULE (marketEventFor) + server-side mediaDrip moved to the server-only
// module so the future schedule never ships in the client bundle (anti-gaming). These engine
// tests run in node, so they import directly from the server module.
import { marketEventFor, mediaDrip } from "../api/_lib/marketSchedule.js";

const STUDENT = { name: "Jordan Rivera", email: "jordan@example.com", batch: "fall-mw", track: "Builders" };
const CALM = { h: "Markets open calm", d: "Quiet.", e: { stocks: 0.02, bonds: 0.005, reits: 0.01, bullion: 0, sav: 0.01 } };

describe("nextClassLabel", () => {
  // fall-mw starts "Sep 7, 2026" (a Monday), day "Mondays & Wednesdays · 5:00–6:30 PM PST".
  const batch = BATCHES.find((b) => b.id === "fall-mw");
  it("shows the concrete date + time for the current course week (not just the weekday)", () => {
    expect(nextClassLabel(batch, "course", 1)).toBe("Mon, Sep 7, 2026 · 5:00–6:30 PM PST");
    // Week N is start + (N-1)*7 days.
    expect(nextClassLabel(batch, "course", 3)).toBe("Mon, Sep 21, 2026 · 5:00–6:30 PM PST");
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
  it("confirms a prorated refund mid-course (counts sessions not yet held)", () => {
    // Dashboard "Week 3" = 2 sessions attended (week increments on each advance).
    const s = newState(STUDENT); s.week = 3; s.started = true;
    const refund = refundFor(batch, true, 3);
    const mail = withdrawalEmail(s, batch, refund, false);
    expect(mail.subject).toMatch(/withdrawal is confirmed/i);
    expect(mail.body).toContain("prorated refund");
    expect(mail.body).toContain("10 sessions not yet held"); // 12 - (3 - 1)
    expect(mail.body).toContain("Attended: 2 of 12");        // not 3
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

describe("refundFor (sessions not yet held)", () => {
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

describe("RISK_PRESETS", () => {
  it("every preset's allocation sums to 100%", () => {
    for (const [name, alloc] of Object.entries(RISK_PRESETS)) {
      const sum = ASSETS.reduce((a, x) => a + (alloc[x.key] || 0), 0);
      expect(sum, name).toBeCloseTo(1, 6);
    }
  });
});

describe("newState", () => {
  it("starts a student at zero with a welcome email and not-started flag", () => {
    const s = newState(STUDENT);
    expect(s.started).toBe(false);
    expect(s.week).toBe(1);
    expect(s.cash).toBe(0);
    expect(netWorth(s)).toBe(0);
    expect(s.emails).toHaveLength(1);
    expect(s.emails[0].type).toBe("welcome");
  });
});

describe("budget choices (Week 6) — the spree decision", () => {
  // The spree amount is derived from the sim economy; assert the relationship, not a literal.
  it("takeSpree spends the spree amount: cash and net worth both drop by it", () => {
    const s = newState(STUDENT);
    const before = netWorth(s);
    takeSpree(s);
    const spent = -s.cash; // cash went from 0 to negative
    expect(spent).toBeGreaterThan(0);
    expect(netWorth(s)).toBeCloseTo(before - spent, 6);
  });

  it("investInstead MOVES the spree amount from cash into holdings — net worth preserved (regression for the money-minting bug)", () => {
    const s = newState(STUDENT); // alloc defaults to balanced
    const before = netWorth(s);
    investInstead(s);
    const spent = -s.cash;
    expect(spent).toBeGreaterThan(0);
    // the full amount is distributed by allocation — stocks not double-counted
    expect(holdingsTotal(s)).toBeCloseTo(spent, 6);
    expect(s.holdings.stocks).toBeCloseTo(spent * RISK_PRESETS.balanced.stocks, 6);
    // money only changed form; net worth must be unchanged
    expect(netWorth(s)).toBeCloseTo(before, 6);
  });
});

describe("advance (one income period)", () => {
  it("earns from the build, allocates, and grows net worth without mutating the previous state", () => {
    const prev = newState(STUDENT);
    prev.week = 8; // a finance-act week: the build is established and earning steady income
    const next = advance(prev, CALM);

    // immutability: the input is untouched
    expect(prev.cash).toBe(0);
    expect(prev.history).toHaveLength(0);

    // business income (15% tax, retirement set-aside, auto-save/invest) lands across buckets
    expect(next.retirement).toBeGreaterThan(0);   // self-directed retirement
    expect(next.savings).toBeGreaterThan(0);       // auto-save of net
    expect(holdingsTotal(next)).toBeGreaterThan(0); // auto-invest of net
    expect(netWorth(next)).toBeGreaterThan(0);

    // it records one market event and one history point
    expect(next.feed).toHaveLength(1);
    expect(next.history).toHaveLength(1);
  });

  it("the build act earns no income early (weeks 1–3 are pre-revenue)", () => {
    const prev = newState(STUDENT); // week 1
    const next = advance(prev, CALM);
    expect(next.retirement).toBe(0);
    expect(next.savings).toBe(0);
    expect(holdingsTotal(next)).toBe(0);
  });

  it("retirement is a self-directed set-aside with NO employer match", () => {
    const prev = newState(STUDENT);
    prev.week = 8;                   // established income
    prev.settings.retire401k = 0.05; // set aside 5%
    const flat = { h: "", d: "", e: { stocks: 0, bonds: 0, reits: 0, bullion: 0, sav: 0 } };
    const next = advance(prev, flat);
    // 5% of steady income — no match (self-employed builder)
    expect(next.retirement).toBeCloseTo(PAY * 0.05, 6);
  });
});

describe("market schedule — events run in the finance act (Weeks 8–12)", () => {
  const assetReturns = (ev) => ASSETS.map((a) => ev.e[a.key]);

  it("Weeks 1–7 (build act + finance setup) are flat for assets but savings still earns a yield", () => {
    for (const wk of [1, 3, 6, 7]) {
      const ev = marketEventFor("course", wk, 0);
      expect(assetReturns(ev)).toEqual([0, 0, 0, 0]); // stocks/bonds/reits/bullion
      expect(ev.e.sav).toBeGreaterThan(0);
    }
  });

  it("the live arc begins on Week 8 (the first investing week)", () => {
    expect(marketEventFor("course", 8, 0).h).toBe("The Fed hikes rates"); // MACRO[0]
    expect(marketEventFor("course", 9, 0).h).toBe("Inflation runs hot");  // MACRO[1]
    expect(marketEventFor("course", 12, 0).h).toBe("Soft landing hopes"); // MACRO[4]
  });

  it("a flat (build-act) advance does not move already-invested holdings, but savings grows", () => {
    const s = newState(STUDENT);
    s.week = 1;
    s.settings.brokerageRate = 0; // isolate: no new contributions this period
    s.holdings.stocks = 1000;
    s.savings = 1000;
    const flat = marketEventFor("course", 1, 0);
    const next = advance(s, flat);
    expect(next.holdings.stocks).toBeCloseTo(1000, 6); // assets unchanged before week 8
    expect(next.savings).toBeGreaterThan(1000);        // yield still applied
  });

  it("check-ins use their own six-event sequence", () => {
    expect(marketEventFor("checkin", 12, 0).h).toBe("Q1 — Inflation cools");
    expect(marketEventFor("checkin", 12, 5).h).toBe("Q6 — Volatile finish");
  });
});

describe("market media drip — emails sent before each investing class", () => {
  const batch = BATCHES[0];
  const atWeek = (wk) => { const s = newState(STUDENT); s.week = wk; s.phase = "course"; return s; };

  it("produces a 3-email pre-class drip for a live-market week (newest-first)", () => {
    const drip = mediaDrip(atWeek(8), batch);
    expect(drip).toHaveLength(3);
    expect(drip.map((m) => m.day)).toEqual([1, 2, 3]); // day -1 leads the inbox
    expect(drip.map((m) => m.when)).toEqual([
      "1 day before class", "2 days before class", "3 days before class",
    ]);
    for (const m of drip) {
      expect(m.type).toBe("media");
      expect(m.subject).toBeTruthy();
      expect(m.body).toContain("Jordan"); // personalized
    }
    // the breaking email names the event; the challenge email poses a research question
    expect(drip[2].subject).toContain("The Fed hikes rates");
    expect(drip[0].subject.toLowerCase()).toContain("class tomorrow");
  });

  it("every live-market week (W8–12) has authored media with real https resources", () => {
    for (let wk = 8; wk <= 12; wk++) {
      const drip = mediaDrip(atWeek(wk), batch);
      expect(drip.length, `week ${wk}`).toBe(3);
      for (const m of drip) {
        expect(m.resources.length).toBeGreaterThan(0);
        for (const r of m.resources) {
          expect(r.label).toBeTruthy();
          expect(r.url, `week ${wk} link`).toMatch(/^https:\/\//);
        }
      }
    }
  });

  it("sends NO media for the build/setup weeks (1–7) or after graduation (check-ins)", () => {
    expect(mediaDrip(atWeek(1), batch)).toEqual([]);
    expect(mediaDrip(atWeek(7), batch)).toEqual([]);
    const c = newState(STUDENT); c.phase = "checkin";
    expect(mediaDrip(c, batch)).toEqual([]);
  });

  it("resource links point at primary/official sources", () => {
    const drip = mediaDrip(atWeek(8), batch); // The Fed hikes rates
    const urls = drip.flatMap((m) => m.resources.map((r) => r.url));
    expect(urls.some((u) => u.includes("federalreserve"))).toBe(true);
    expect(urls.some((u) => u.includes("fred.stlouisfed.org"))).toBe(true);
  });
});

describe("BATCHES", () => {
  it("has 6 Builders cohorts (3 seasons x 2) with unique ids", () => {
    expect(BATCHES).toHaveLength(6);
    expect(new Set(BATCHES.map((b) => b.id)).size).toBe(6);
    expect(BATCHES.every((b) => b.track === "Builders")).toBe(true);
  });
});
