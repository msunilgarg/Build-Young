import { describe, it, expect } from "vitest";
import {
  validEmail, newState, advance, netWorth, holdingsTotal,
  takeSpree, investInstead, RISK_PRESETS, ASSETS, BATCHES, marketEventFor,
} from "../src/App.jsx";

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

describe("budget choices (Week 6) — the $500 decision", () => {
  it("takeSpree spends $500: cash and net worth both drop by 500", () => {
    const s = newState(STUDENT);
    const before = netWorth(s);
    takeSpree(s);
    expect(s.cash).toBe(-500);
    expect(netWorth(s)).toBe(before - 500);
  });

  it("investInstead MOVES $500 from cash into holdings — net worth is preserved (regression for the money-minting bug)", () => {
    const s = newState(STUDENT); // alloc defaults to balanced
    const before = netWorth(s);
    investInstead(s);
    expect(s.cash).toBe(-500);
    // exactly $500 distributed by allocation — stocks not double-counted
    expect(holdingsTotal(s)).toBeCloseTo(500, 6);
    expect(s.holdings.stocks).toBeCloseTo(500 * RISK_PRESETS.balanced.stocks, 6);
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
    // $50 contribution + $50 match on a $1,000 paycheck
    expect(next.retirement).toBeCloseTo(100, 6);
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

describe("BATCHES", () => {
  it("has 12 cohorts (3 seasons x 4) with unique ids", () => {
    expect(BATCHES).toHaveLength(12);
    expect(new Set(BATCHES.map((b) => b.id)).size).toBe(12);
  });
});
