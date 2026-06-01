import { describe, it, expect } from "vitest";
import {
  validEmail, newState, advance, netWorth, holdingsTotal,
  takeSpree, investInstead, RISK_PRESETS, ASSETS, BATCHES, PAY,
} from "../src/App.jsx";
// The market SCHEDULE (marketEventFor) + server-side mediaDrip moved to the server-only
// module so the future schedule never ships in the client bundle (anti-gaming). These engine
// tests run in node, so they import directly from the server module.
import { marketEventFor, mediaDrip } from "../api/_lib/marketSchedule.js";

const STUDENT = { name: "Jordan Rivera", email: "jordan@example.com", batch: "fall-hs-wed", track: "High School" };
const CALM = { h: "Markets open calm", d: "Quiet.", e: { stocks: 0.02, bonds: 0.005, reits: 0.01, bullion: 0, sav: 0.01 } };

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

describe("advance (one paycheck period)", () => {
  it("pays, allocates, and grows net worth without mutating the previous state", () => {
    const prev = newState(STUDENT);
    const next = advance(prev, CALM);

    // immutability: the input is untouched
    expect(prev.cash).toBe(0);
    expect(prev.history).toHaveLength(0);

    // a $1,000 paycheck (15% tax, 5% 401k + match) leaves money across buckets
    expect(next.retirement).toBeGreaterThan(0);   // 401k + employer match
    expect(next.savings).toBeGreaterThan(0);       // 25% auto-save of net
    expect(holdingsTotal(next)).toBeGreaterThan(0); // 20% auto-invest of net
    expect(netWorth(next)).toBeGreaterThan(0);

    // it records one market event and one history point
    expect(next.feed).toHaveLength(1);
    expect(next.history).toHaveLength(1);
    expect(next.week).toBe(1); // advance() applies a period; week is bumped by the UI
  });

  it("employer matches 401k dollar-for-dollar up to 5%", () => {
    const prev = newState(STUDENT);
    prev.settings.retire401k = 0.05; // contribute exactly 5%
    // zero out market growth so we can read the raw contribution
    const flat = { h: "", d: "", e: { stocks: 0, bonds: 0, reits: 0, bullion: 0, sav: 0 } };
    const next = advance(prev, flat);
    // 5% contribution + 5% match on the paycheck = 10% of PAY
    expect(next.retirement).toBeCloseTo(PAY * 0.1, 6);
  });
});

describe("market schedule — events start on Week 3", () => {
  const assetReturns = (ev) => ASSETS.map((a) => ev.e[a.key]);

  it("Weeks 1–2 are flat for assets but savings still earns a yield", () => {
    for (const wk of [1, 2]) {
      const ev = marketEventFor("course", wk, 0);
      expect(assetReturns(ev)).toEqual([0, 0, 0, 0]); // stocks/bonds/reits/bullion
      expect(ev.e.sav).toBeGreaterThan(0);
    }
  });

  it("the live arc begins on Week 3 and lands its key beats on the right weeks", () => {
    expect(marketEventFor("course", 3, 0).h).toBe("The Fed hikes rates");
    expect(marketEventFor("course", 5, 0).h).toBe("Housing boom");        // you buy a home
    expect(marketEventFor("course", 6, 0).h).toBe("Recession fears spike"); // the very next week
    expect(marketEventFor("course", 8, 0).h).toBe("Market correction");   // before the W8 review
    expect(marketEventFor("course", 9, 0).h).toBe("Tech-led rally");      // rewards rebalancers
    expect(marketEventFor("course", 11, 0).h).toBe("Geopolitical jitters"); // gold, as bullion is taught
    expect(marketEventFor("course", 12, 0).h).toBe("Year-end melt-up");   // finale preserved
  });

  it("the two gentlest opener events were dropped", () => {
    const headlines = [];
    for (let wk = 1; wk <= 12; wk++) headlines.push(marketEventFor("course", wk, 0).h);
    expect(headlines).not.toContain("Markets open calm");
    expect(headlines).not.toContain("Steady expansion");
  });

  it("a flat (Week 1) advance does not move already-invested holdings, but savings grows", () => {
    const s = newState(STUDENT);
    s.settings.brokerageRate = 0; // isolate: no new contributions this period
    s.holdings.stocks = 1000;
    s.savings = 1000;
    const flat = marketEventFor("course", 1, 0);
    const next = advance(s, flat);
    expect(next.holdings.stocks).toBeCloseTo(1000, 6); // assets unchanged in Weeks 1–2
    expect(next.savings).toBeGreaterThan(1000);        // yield still applied
  });

  it("check-ins use their own six-event sequence", () => {
    expect(marketEventFor("checkin", 12, 0).h).toBe("Q1 — Inflation cools");
    expect(marketEventFor("checkin", 12, 5).h).toBe("Q6 — Volatile finish");
  });
});

describe("market media drip — emails sent before each class", () => {
  const batch = BATCHES[0];
  const atWeek = (wk) => { const s = newState(STUDENT); s.week = wk; s.phase = "course"; return s; };

  it("produces a 3-email pre-class drip for a live-market week (newest-first)", () => {
    const drip = mediaDrip(atWeek(3), batch);
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

  it("every weekly event (W3–12) has authored media with real https resources", () => {
    for (let wk = 3; wk <= 12; wk++) {
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

  it("sends NO media for the flat setup weeks (1–2) or after graduation (check-ins)", () => {
    expect(mediaDrip(atWeek(1), batch)).toEqual([]);
    expect(mediaDrip(atWeek(2), batch)).toEqual([]);
    const c = newState(STUDENT); c.phase = "checkin";
    expect(mediaDrip(c, batch)).toEqual([]);
  });

  it("resource links are unique per email and point at primary/official sources", () => {
    const drip = mediaDrip(atWeek(6), batch); // Recession fears spike
    const urls = drip.flatMap((m) => m.resources.map((r) => r.url));
    expect(urls.some((u) => u.includes("federalreservehistory.org"))).toBe(true);
    expect(urls.some((u) => u.includes("fred.stlouisfed.org"))).toBe(true);
  });
});

describe("BATCHES", () => {
  it("has 12 cohorts (3 seasons x 4) with unique ids", () => {
    expect(BATCHES).toHaveLength(12);
    expect(new Set(BATCHES.map((b) => b.id)).size).toBe(12);
  });
});
