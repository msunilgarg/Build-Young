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
});
