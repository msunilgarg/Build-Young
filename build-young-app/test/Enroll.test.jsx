import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import App, { CONFIG, BATCHES } from "../src/App.jsx";

// These exercise the self-contained DEMO flow, so pin demo mode AND clear each cohort's Stripe link
// (empty link = demo checkout) regardless of the production catalog. The auth + Stripe paths are
// covered separately in auth-ui.test.jsx / auth-endpoints.test.js.
beforeEach(() => { CONFIG.authEnabled = false; CONFIG.previewAllWeeks = false; BATCHES.forEach((b) => { b.stripeLink = ""; }); });

// Only fail on the impact levels CLAUDE.md commits to (serious/critical).
async function expectNoSeriousA11y(container) {
  const results = await axe(container);
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => v.id)).toEqual([]);
}

describe("Enroll flow", () => {
  it("navigates from the landing nav to the enroll page", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Enroll →" }));
    expect(await screen.findByRole("heading", { name: /Reserve your seat/i })).toBeInTheDocument();
  });

  it("gates 'Continue to payment' on a valid email AND the high-school confirmation", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Enroll →" }));
    await screen.findByRole("heading", { name: /Reserve your seat/i });

    const cont = screen.getByRole("button", { name: /Continue to payment/i });
    expect(cont).toBeDisabled();

    await user.type(screen.getByLabelText("Student name"), "Jordan Rivera");
    await user.type(screen.getByLabelText(/Email/i), "not-an-email");
    expect(cont).toBeDisabled(); // invalid email still blocks

    await user.clear(screen.getByLabelText(/Email/i));
    await user.type(screen.getByLabelText(/Email/i), "jordan@example.com");
    expect(cont).toBeDisabled(); // valid email, but high-school box not yet confirmed

    await user.click(screen.getByRole("checkbox", { name: /high school/i }));
    expect(cont).toBeEnabled();
  });

  it("has no serious/critical accessibility violations on step 1", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(screen.getByRole("button", { name: "Enroll →" }));
    await screen.findByRole("heading", { name: /Reserve your seat/i });
    await expectNoSeriousA11y(container);
  });
});
