import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import App, { CONFIG, BATCHES } from "../src/App.jsx";

// These exercise the self-contained DEMO flow, so pin demo mode AND clear each cohort's Stripe link
// (empty link = demo checkout) regardless of the production catalog.
beforeEach(() => { CONFIG.authEnabled = false; CONFIG.previewAllWeeks = false; BATCHES.forEach((b) => { b.stripeLink = ""; }); });

// Only fail on the impact levels CLAUDE.md commits to (serious/critical).
async function expectNoSeriousA11y(container) {
  const results = await axe(container);
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => v.id)).toEqual([]);
}

describe("Landing", () => {
  it("renders the canonical tagline and primary CTAs", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: /Raising builders, not consumers\./i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enroll →" })).toBeInTheDocument();
  });

  it("has no serious/critical accessibility violations", async () => {
    const { container } = render(<App />);
    await expectNoSeriousA11y(container);
  });

  // The "Upcoming batches" intro must NOT hardcode the flagship cadence/day-pairs — cohort pace is now
  // per-cohort (an accelerated Summer cohort isn't "twice a week" on Mon/Wed or Tue/Thu), so the blanket
  // claim was wrong. It states the invariant (12 lessons / 36 hrs) and defers schedule to the per-cohort
  // cards. Render-pinned per playbook §9 (copy verified by the rendered string, not a grep).
  it("batches intro states the invariant, not a hardcoded cadence", () => {
    render(<App />);
    const heading = screen.getByRole("heading", { name: "Upcoming batches" });
    const intro = heading.nextElementSibling; // the intro <p> right after the heading
    expect(intro.textContent).toMatch(/12 lessons \(36 hrs\)/);
    expect(intro.textContent).toMatch(/Each cohort sets its own pace/);
    // banned: the old blanket cadence/day-pairs that no longer hold for every cohort
    expect(intro.textContent).not.toMatch(/twice a week/i);
    expect(intro.textContent).not.toMatch(/Mondays & Wednesdays/);
    // and the CTA voice rule (POSITIONING.md): "Talk to us", never "…first"
    expect(intro.parentElement.textContent).not.toMatch(/Talk to us first/);
  });
});
