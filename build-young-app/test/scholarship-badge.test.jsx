import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import App, { CONFIG, BATCHES } from "../src/App.jsx";

// SPECS/017 — a $0 (free) cohort promotes a "Scholarship seats" badge on its public landing card; paid
// cohorts don't. We toggle a BATCH's price (like landing-lean.test.jsx toggles stripeLink) and restore it.
describe("Scholarship badge on the landing cohort card (SPECS/017)", () => {
  let savedPrices;
  beforeEach(() => {
    CONFIG.authEnabled = false;
    savedPrices = BATCHES.map((b) => b.price);
    BATCHES.forEach((b) => { b.stripeLink = ""; });
  });
  afterEach(() => { BATCHES.forEach((b, i) => { b.price = savedPrices[i]; }); });

  it("shows the 'Scholarship seats' badge + 'By application' on a $0 cohort", () => {
    BATCHES.forEach((b) => { b.price = 999; });
    BATCHES[0].price = 0; // make the first cohort free
    const text = render(<App />).container.textContent || "";
    expect(text).toContain("Scholarship seats");
    expect(text).toContain("By application");
    expect(text).toContain("Fully funded"); // the price slot reads "Fully funded", never "Free" (SPECS/017)
  });

  it("hides the badge when every cohort is paid", () => {
    BATCHES.forEach((b) => { b.price = 999; });
    const text = render(<App />).container.textContent || "";
    expect(text).not.toContain("Scholarship seats");
  });
});
