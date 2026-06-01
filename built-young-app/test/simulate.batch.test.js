// Runs the offline batch-simulation harness for a Middle School and a High School cohort,
// writes the per-student + per-cohort output files to simulation-output/, and asserts the
// core invariants. This is the supported way to RUN the harness (App.jsx imports React/JSX,
// so the harness must execute under Vitest's transform pipeline).

import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runCohort, cohortCsv, studentForFile, PERSONAS, PAY, HOME, CAR, PE_BUY } from "../scripts/simulateBatch.js";

const usd = (v) => "$" + Math.round(v).toLocaleString();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// simulation-output lives at the built-young-app/ root, next to src/ and scripts/.
const OUT_ROOT = path.resolve(__dirname, "..", "simulation-output");

const COHORTS = ["fall-ms-mon", "fall-hs-wed"]; // a Middle School + a High School batch
const results = {};

beforeAll(() => {
  fs.mkdirSync(OUT_ROOT, { recursive: true });
  for (const batchId of COHORTS) {
    const res = runCohort(batchId);
    results[batchId] = res;
    const dir = path.join(OUT_ROOT, batchId);
    fs.mkdirSync(dir, { recursive: true });
    // Per-student journey files.
    for (const st of res.students) {
      fs.writeFileSync(
        path.join(dir, st.profile.slug + ".json"),
        JSON.stringify(studentForFile(st), null, 2) + "\n",
      );
    }
    // Cohort rollups.
    fs.writeFileSync(path.join(dir, "cohort-summary.json"), JSON.stringify(res.summary, null, 2) + "\n");
    fs.writeFileSync(path.join(dir, "cohort.csv"), cohortCsv(res.students));
  }
  writeReadme(results);
});

describe.each(COHORTS)("cohort %s", (batchId) => {
  it("has exactly 15 students", () => {
    expect(results[batchId].students).toHaveLength(15);
  });

  it("every student completed all 18 periods (12 weeks + 6 check-ins) and graduated", () => {
    for (const st of results[batchId].students) {
      expect(st.weekByWeek).toHaveLength(18);
      expect(st._internal.state.done).toBe(true);
      expect(st._internal.state.checkin).toBe(6);
      // last period is the 6th check-in
      expect(st.weekByWeek[st.weekByWeek.length - 1].period).toBe("Check-in 6 of 6");
      expect(st.funnel).toContain("graduated");
    }
  });

  it("every final net worth is a finite number", () => {
    for (const st of results[batchId].students) {
      expect(Number.isFinite(st.final.finalNetWorth)).toBe(true);
    }
  });

  it("the prize ranking is sorted high→low, contiguous 1..15, with a unique #1", () => {
    const summary = results[batchId].summary;
    const ranks = summary.ranking;
    expect(ranks).toHaveLength(15);
    // descending net worth
    for (let i = 1; i < ranks.length; i++) {
      expect(ranks[i - 1].finalNetWorth).toBeGreaterThanOrEqual(ranks[i].finalNetWorth);
      expect(ranks[i].rank).toBe(i + 1);
    }
    expect(ranks[0].rank).toBe(1);
    // unique #1: nobody else ties the top net worth exactly
    const top = ranks[0].finalNetWorth;
    expect(ranks.filter((r) => r.finalNetWorth === top)).toHaveLength(1);
    expect(summary.prizeWinner.name).toBe(ranks[0].name);
  });

  it("captures the welcome email + per-period recaps + the 3-email media drips", () => {
    for (const st of results[batchId].students) {
      const types = st.emailsReceived.map((e) => e.type);
      expect(types).toContain("welcome");
      expect(types).toContain("followup");
      expect(types).toContain("media");
      // 10 live-market weeks (W3–W12) × 3 drip emails each = 30 media emails.
      expect(st.emailsReceived.filter((e) => e.type === "media")).toHaveLength(30);
    }
  });

  it("wrote per-student JSON, cohort-summary.json, and cohort.csv to disk", () => {
    const dir = path.join(OUT_ROOT, batchId);
    expect(fs.existsSync(path.join(dir, "cohort-summary.json"))).toBe(true);
    expect(fs.existsSync(path.join(dir, "cohort.csv"))).toBe(true);
    for (const st of results[batchId].students) {
      expect(fs.existsSync(path.join(dir, st.profile.slug + ".json"))).toBe(true);
    }
  });
});

describe("reproducibility & wiring", () => {
  it("is deterministic: re-running a cohort yields identical net worths", () => {
    const a = runCohort("fall-hs-wed").students.map((s) => s.final.finalNetWorth);
    const b = runCohort("fall-hs-wed").students.map((s) => s.final.finalNetWorth);
    expect(a).toEqual(b);
  });

  it("does not leak the seeded PRNG: Math.random is restored after a run", () => {
    const before = Math.random;
    runCohort("fall-ms-mon");
    expect(Math.random).toBe(before);
  });

  it("ships 15 distinct personas with the right tracks per batch", () => {
    expect(PERSONAS).toHaveLength(15);
    expect(results["fall-ms-mon"].students.every((s) => s.profile.track === "Middle School")).toBe(true);
    expect(results["fall-hs-wed"].students.every((s) => s.profile.track === "High School")).toBe(true);
  });

  it("wrote the top-level README", () => {
    expect(fs.existsSync(path.join(OUT_ROOT, "README.md"))).toBe(true);
  });
});

function writeReadme(results) {
  const lines = [];
  lines.push("# Built Young — cohort simulation output");
  lines.push("");
  lines.push("All money here is **simulated**. Built Young is financial education, not licensed");
  lines.push("financial advice. These files are generated by an offline harness that drives the");
  lines.push("real dashboard simulation engine (the same `advance()` used in the student app),");
  lines.push("so the numbers match what a student would see in the live simulation.");
  lines.push("");
  lines.push("## How it was generated");
  lines.push("");
  lines.push("- Harness: `scripts/simulateBatch.js` (`runCohort(batchId)`).");
  lines.push("- Runner: `test/simulate.batch.test.js` (run with `npm run simulate` or `npm test`).");
  lines.push("- The engine is imported READ-ONLY from `src/App.jsx` + `src/marketMedia.js`.");
  lines.push("- Each student is run through the full lifecycle: 12 weekly classes (`phase:\"course\"`)");
  lines.push("  then 6 monthly check-ins (`phase:\"checkin\"`), 18 periods total. Each period applies");
  lines.push(`  one ${usd(PAY)} paycheck (split per the student's settings), then the period's shared`);
  lines.push("  market event from `marketEventFor(...)`, then that week's decisions.");
  lines.push("- **Reproducible:** the only randomness is the hustle bonus in `advance()`. The harness");
  lines.push("  installs a seeded PRNG (seed 12345, mixed with the batch id) and restores `Math.random`");
  lines.push("  afterward, so re-running produces identical files.");
  lines.push("");
  lines.push("## Funnel modeled");
  lines.push("");
  lines.push("discover (source) → (maybe) book a free 15-min call → enroll → engage weekly →");
  lines.push("complete the course → finish 6 check-ins → graduate. Each student's `funnel` field");
  lines.push("records their stage progression, and `discoverySource` / `bookedCall` capture the top.");
  lines.push("");
  lines.push("## Files");
  lines.push("");
  lines.push("```");
  lines.push("simulation-output/");
  lines.push("  README.md                 ← this file");
  for (const batchId of Object.keys(results)) {
    lines.push(`  ${batchId}/`);
    lines.push("    cohort-summary.json     ← roster, prize ranking, averages/min/max, risk breakdown, notable outcomes");
    lines.push("    cohort.csv              ← one row per student for spreadsheet review");
    lines.push("    <student-slug>.json     ← full per-student journey (15 files)");
  }
  lines.push("```");
  lines.push("");
  lines.push("Each per-student file contains: `profile` (name, email, track, discovery source,");
  lines.push("booked-call flag, persona, settings), `funnel`, `weekByWeek` (per-period market event,");
  lines.push("human-readable decisions, net worth, cash, savings, retirement, holdings, credit score,");
  lines.push("home/car/card/PE/insurance state), `emailsReceived` (welcome + recaps + the 3-email");
  lines.push("pre-class market-news drips), and `final` (net worth, breakdown, credit score, narrative).");
  lines.push("");
  lines.push("## The 15 personas");
  lines.push("");
  lines.push("Each cohort runs the same 15 named personas with distinct, deterministic behavior");
  lines.push("profiles spanning risk style, savings/brokerage/401(k) rates, home/car timing, credit-card");
  lines.push("behavior (never / pays in full / carries a balance), hustle, spree-vs-invest, mid-course");
  lines.push("rebalancing, insurance, and alt-asset buys (bullion / REIT / PE). A couple are deliberately");
  lines.push("low-engagement (skip optional buys, minimal contributions) to model the students who miss it.");
  lines.push("");
  for (const p of PERSONAS) {
    lines.push(`- **${p.name}** (${p.risk}) — ${p.description}`);
  }
  lines.push("");
  lines.push("## A note on the engine's economics (a real, teachable finding)");
  lines.push("");
  lines.push(`On a ${usd(PAY)}/period salary re-tuned to a realistic young-adult budget, students are`);
  lines.push("LIQUIDITY-constrained. Big lump purchases are gated by available funds, exactly as the");
  lines.push("dashboard's disabled buy buttons enforce, so the harness models the realistic behavior of");
  lines.push(`*saving toward a goal and buying when it's affordable*. In practice: a **car** (${usd(CAR.down)}`);
  lines.push(`down) is reachable for steady savers; a **home** (${usd(HOME.down)} down) is only reachable by`);
  lines.push(`max-rate savers, and only by the final check-ins; and the **${usd(PE_BUY)} private-equity** buy`);
  lines.push("is effectively unreachable for everyone within the 18 periods given how little cash");
  lines.push("accumulates — so no persona clears it this run (the field is still captured, always $0).");
  lines.push("Heavy auto-investors finish with the largest invested base but stay cash-poor — a genuine");
  lines.push("trade-off worth showing students.");
  lines.push("");
  lines.push("## Headline results");
  lines.push("");
  const fmt = (n) => "$" + Math.round(n).toLocaleString("en-US");
  for (const [batchId, res] of Object.entries(results)) {
    const s = res.summary;
    lines.push(`### ${batchId} — ${s.track} (${s.day})`);
    lines.push("");
    lines.push(`- Students: ${s.studentCount} · Tuition: ${fmt(s.price)}`);
    lines.push(`- Average final net worth: **${fmt(s.averageNetWorth)}** (min ${fmt(s.minNetWorth)}, max ${fmt(s.maxNetWorth)})`);
    lines.push(`- Tuition-prize winner (highest portfolio value): **${s.prizeWinner.name}** at ${fmt(s.prizeWinner.netWorth)}`);
    const rb = Object.entries(s.distributionByRiskStyle)
      .map(([k, v]) => `${k} ${v.count} (avg ${fmt(v.avgNetWorth)})`).join(", ");
    lines.push(`- By risk style: ${rb}`);
    lines.push("");
  }
  fs.writeFileSync(path.join(OUT_ROOT, "README.md"), lines.join("\n") + "\n");
}
