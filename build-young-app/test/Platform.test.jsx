import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import App, { CONFIG, BATCHES } from "../src/App.jsx";

// These exercise the self-contained DEMO flow (enroll → localStorage dashboard), so pin demo mode
// AND clear each cohort's Stripe link (empty link = demo checkout) regardless of the production catalog.
beforeEach(() => { CONFIG.authEnabled = false; CONFIG.previewAllWeeks = false; BATCHES.forEach((b) => { b.stripeLink = ""; }); });

// Only fail on the impact levels CLAUDE.md commits to (serious/critical).
async function expectNoSeriousA11y(container) {
  const results = await axe(container);
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => v.id)).toEqual([]);
}

describe("Course hub (per-week resources & catch-up)", () => {
  async function enrollToDashboard(user) {
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Enroll →" }));
    await screen.findByRole("heading", { name: /Reserve your seat/i });
    await user.type(screen.getByLabelText("Student name"), "Jordan Rivera");
    await user.type(screen.getByLabelText(/Email/i), "jordan@example.com");
    await user.click(screen.getByRole("checkbox", { name: /high school/i }));
    await user.click(screen.getByRole("button", { name: /Continue to payment/i }));
    await user.click(await screen.findByRole("button", { name: /Pay \$\d+ \(demo\)/i }));
    await user.click(await screen.findByRole("button", { name: /Open my dashboard/i }));
  }

  it("lands on the Dashboard tab before the course has started", async () => {
    const user = userEvent.setup();
    await enrollToDashboard(user);
    // A fresh enrollee (not started) sees the welcome/orientation home.
    expect(await screen.findByText(/WELCOME TO BUILD YOUNG/i)).toBeInTheDocument();
    expect(screen.getByText(/What to expect/i)).toBeInTheDocument();
    expect(screen.getByText(/Get set up before you build/i)).toBeInTheDocument();
    // The home tab is now called "Dashboard" (the old thin Dashboard tab was removed).
    expect(screen.getByRole("button", { name: "Dashboard" })).toBeInTheDocument();
  });

  it("opens a per-week hub: current week's materials show, future weeks are locked", async () => {
    const user = userEvent.setup();
    await enrollToDashboard(user);

    await user.click(await screen.findByRole("button", { name: "Course progress" }));
    expect(await screen.findByText(/Your course, lesson by lesson/i)).toBeInTheDocument();

    // Regression guard: the position chrome reads "Lesson", NEVER "WEEK N" / "THIS WEEK" — a missed
    // `WEEK ${s.week} · THIS WEEK` header shipped once because the verifier only read code + grepped
    // (and the grep pattern missed it). The current-lesson header must render with "LESSON 1".
    expect(screen.getByText(/LESSON 1 ·/i)).toBeInTheDocument();
    expect(screen.queryByText(/WEEK \d/)).toBeNull();
    expect(screen.queryByText(/THIS WEEK/)).toBeNull();

    // Lesson 1 is selected by default — its title shows in the left rail + the right pane.
    expect(screen.getAllByText(/Find a Problem Worth Solving/i).length).toBeGreaterThan(0);
    // The lesson is now tabbed; the activity (build plan) lives in the "Your exercise" tab.
    await user.click(screen.getByRole("button", { name: "Your exercise" }));
    expect(screen.getByText(/start from the customer/i)).toBeInTheDocument();

    // A future lesson is locked: selecting it shows the no-spoilers message (no content leaked).
    await user.click(screen.getByRole("button", { name: /Lesson 12 \(locked\)/i }));
    expect(await screen.findByText(/Unlocks when you reach Lesson 12/i)).toBeInTheDocument();
  });

  it("has no serious/critical accessibility violations on the Course hub", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(screen.getByRole("button", { name: "Enroll →" }));
    await screen.findByRole("heading", { name: /Reserve your seat/i });
    await user.type(screen.getByLabelText("Student name"), "Jordan Rivera");
    await user.type(screen.getByLabelText(/Email/i), "jordan@example.com");
    await user.click(screen.getByRole("checkbox", { name: /high school/i }));
    await user.click(screen.getByRole("button", { name: /Continue to payment/i }));
    await user.click(await screen.findByRole("button", { name: /Pay \$\d+ \(demo\)/i }));
    await user.click(await screen.findByRole("button", { name: /Open my dashboard/i }));
    await user.click(await screen.findByRole("button", { name: "Course progress" }));
    await screen.findByText(/Your course, lesson by lesson/i);
    await expectNoSeriousA11y(container);
  });
});
