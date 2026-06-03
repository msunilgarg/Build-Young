import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import App, { CONFIG, BATCHES } from "../src/App.jsx";

// These exercise the self-contained DEMO flow (enroll → localStorage dashboard), so pin demo mode
// AND clear each cohort's Stripe link (empty link = demo checkout) regardless of the production
// catalog. The auth + Stripe paths are covered separately in auth-ui.test.jsx / auth-endpoints.test.js.
beforeEach(() => { CONFIG.authEnabled = false; BATCHES.forEach((b) => { b.stripeLink = ""; }); });

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

describe("Enroll flow", () => {
  it("navigates from the landing nav to the enroll page", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Enroll →" }));
    expect(await screen.findByRole("heading", { name: /Reserve your seat/i })).toBeInTheDocument();
  });

  it("gates 'Continue to payment' on a valid email AND the 13+ confirmation", async () => {
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
    expect(cont).toBeDisabled(); // valid email, but 13+ not yet confirmed

    await user.click(screen.getByRole("checkbox", { name: /13 or older/i }));
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

describe("Legal modal", () => {
  it("opens Privacy in-app from the footer and closes on Escape", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText("Privacy"));
    const heading = await screen.findByRole("heading", { name: "Privacy Policy" });
    expect(heading).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("heading", { name: "Privacy Policy" })).not.toBeInTheDocument();
  });

  it("does not link to standalone .html files in the footer (in-app modal instead)", () => {
    const { container } = render(<App />);
    const footer = container.querySelector("footer");
    const htmlLinks = within(footer).queryAllByRole("link").filter((a) => /\.html(\?|#|$)/.test(a.getAttribute("href") || ""));
    expect(htmlLinks).toEqual([]);
  });
});

describe("Tuition prize", () => {
  it("advertises the highest-portfolio tuition prize on the landing pricing section", () => {
    render(<App />);
    expect(screen.getByText(/Win your tuition back/i)).toBeInTheDocument();
    expect(screen.getByText(/highest portfolio value/i)).toBeInTheDocument();
  });

  it("states the prize in the in-app Terms", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText("Terms"));
    expect(await screen.findByRole("heading", { name: "Tuition prize" })).toBeInTheDocument();
  });
});

describe("Course hub (per-week resources & catch-up)", () => {
  async function enrollToDashboard(user) {
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Enroll →" }));
    await screen.findByRole("heading", { name: /Reserve your seat/i });
    await user.type(screen.getByLabelText("Student name"), "Jordan Rivera");
    await user.type(screen.getByLabelText(/Email/i), "jordan@example.com");
    await user.click(screen.getByRole("checkbox", { name: /13 or older/i }));
    await user.click(screen.getByRole("button", { name: /Continue to payment/i }));
    await user.click(await screen.findByRole("button", { name: /Pay \$\d+ \(demo\)/i }));
    await user.click(await screen.findByRole("button", { name: /Open my dashboard/i }));
  }

  it("lands on the Overview tab before the course has started", async () => {
    const user = userEvent.setup();
    await enrollToDashboard(user);
    // A fresh enrollee (not started) sees the welcome/orientation, not the live dashboard.
    expect(await screen.findByText(/WELCOME TO BUILD YOUNG/i)).toBeInTheDocument();
    expect(screen.getByText(/What to expect/i)).toBeInTheDocument();
    expect(screen.getByText(/How each week works/i)).toBeInTheDocument();
    // And the Overview tab itself is present in the nav.
    expect(screen.getByRole("button", { name: "Overview" })).toBeInTheDocument();
  });

  it("opens a per-week hub: current week's materials show, future weeks are locked", async () => {
    const user = userEvent.setup();
    await enrollToDashboard(user);

    await user.click(await screen.findByRole("button", { name: "Course progress" }));
    expect(await screen.findByText(/Your course, week by week/i)).toBeInTheDocument();

    // Week 1 is selected by default — its title shows in the left rail + the right pane.
    expect(screen.getAllByText(/Find a Problem Worth Solving/i).length).toBeGreaterThan(0);
    // Week 1's activity is the build plan (start from the customer).
    expect(screen.getByText(/start from the customer/i)).toBeInTheDocument();

    // A future week is locked: selecting it shows the no-spoilers message (no content leaked).
    await user.click(screen.getByRole("button", { name: /Week 12 \(locked\)/i }));
    expect(await screen.findByText(/Unlocks when you reach Week 12/i)).toBeInTheDocument();
  });

  it("has no serious/critical accessibility violations on the Course hub", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(screen.getByRole("button", { name: "Enroll →" }));
    await screen.findByRole("heading", { name: /Reserve your seat/i });
    await user.type(screen.getByLabelText("Student name"), "Jordan Rivera");
    await user.type(screen.getByLabelText(/Email/i), "jordan@example.com");
    await user.click(screen.getByRole("checkbox", { name: /13 or older/i }));
    await user.click(screen.getByRole("button", { name: /Continue to payment/i }));
    await user.click(await screen.findByRole("button", { name: /Pay \$\d+ \(demo\)/i }));
    await user.click(await screen.findByRole("button", { name: /Open my dashboard/i }));
    await user.click(await screen.findByRole("button", { name: "Course progress" }));
    await screen.findByText(/Your course, week by week/i);
    await expectNoSeriousA11y(container);
  });
});
