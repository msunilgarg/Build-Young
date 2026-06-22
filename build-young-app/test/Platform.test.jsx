import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import App, { CONFIG, BATCHES } from "../src/App.jsx";
import { Platform, ShapePlan, BuildLayer } from "../src/Platform.jsx";

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

  it("shows the named 'Agentic Engineering Process' (Spec → Build → Check → Ship) primer in Lesson 1", async () => {
    const user = userEvent.setup();
    await enrollToDashboard(user);
    await user.click(await screen.findByRole("button", { name: "Course progress" }));
    await user.click(await screen.findByRole("button", { name: "Your exercise" }));
    // The named method + each of its four steps (asserted via each step's distinctive line — Spec /
    // Build / Check / Ship — so the test pins the rendered content, not a bare label that might recur).
    expect(screen.getByText(/The Agentic Engineering Process/)).toBeInTheDocument();
    expect(screen.getByText(/decide what "done" looks like before you build/)).toBeInTheDocument(); // Spec
    expect(screen.getByText(/build the next small slice/)).toBeInTheDocument();                      // Build
    expect(screen.getByText(/you can't grade your own homework/)).toBeInTheDocument();               // Check
    expect(screen.getByText(/put the working slice live/)).toBeInTheDocument();                      // Ship
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

describe("Lesson 2 spec — 'Done when…' acceptance criteria (SPECS/008 T38)", () => {
  // Render ShapePlan directly with a stateful harness so the controlled field round-trips through s.shape
  // (avoids the course calendar deciding which lesson is current/unlocked).
  function ShapeHarness() {
    const [st, setSt] = useState({ shape: {} });
    return <ShapePlan s={st} setS={setSt} bare />;
  }

  it("has a 'Done when…' acceptance field, distinct from 'What success looks like', that round-trips into s.shape", async () => {
    const user = userEvent.setup();
    render(<ShapeHarness />);
    // Both fields exist and are distinct (the vision line AND the sharper checkable criteria).
    expect(screen.getByLabelText(/What success looks like/i)).toBeInTheDocument();
    const field = screen.getByLabelText(/Done when.*acceptance criteria/i);
    expect(field).toHaveValue(""); // starts empty
    await user.type(field, "Done when a user signs up, logs in, and sees saved notes after a refresh.");
    // Round-trips through s.shape.acceptance (controlled value persists via the harness's setState).
    expect(field).toHaveValue("Done when a user signs up, logs in, and sees saved notes after a refresh.");
  });
});

describe("Check my work — the Check step (SPECS/008 T40)", () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  // Render a build week's BuildLayer directly with a stateful harness (avoids the course calendar lock).
  function CheckHarness() {
    const [st, setSt] = useState({ shape: { product: "a notes app", acceptance: "Done when login works" }, review: {} });
    return <BuildLayer week={3} s={st} setS={setSt} bare />;
  }

  it("runs an independent check and renders the verdict + strengths/gaps from the agent reply", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ configured: true, review: { verdict: "gaps", strengths: ["Login works nicely"], gaps: ["Add password reset"] } }) })));
    const user = userEvent.setup();
    render(<CheckHarness />);
    await user.type(screen.getByLabelText(/What I built/i), "I added login");
    await user.click(screen.getByRole("button", { name: /Check my work/i }));
    // The returned review renders: verdict (gaps), a strength first, then a gap (as a "next step").
    expect(await screen.findByText(/A few things to check/i)).toBeInTheDocument();
    expect(screen.getByText(/Login works nicely/)).toBeInTheDocument();
    expect(screen.getByText(/Add password reset/)).toBeInTheDocument();
  });

  it("never errors offline — falls back to a local self-check from the acceptance criteria", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    const user = userEvent.setup();
    render(<CheckHarness />);
    await user.type(screen.getByLabelText(/What I built/i), "nothing relevant here");
    await user.click(screen.getByRole("button", { name: /Check my work/i }));
    // localReview flags the unmet criterion as a self-check next step (no crash, a result still renders).
    expect(await screen.findByText(/Done when login works/)).toBeInTheDocument();
  });
});

describe("partner students don't self-withdraw (SPECS/005 T31)", () => {
  const baseStudent = { name: "Kid", email: "kid@school.org", batch: "fall-mw", track: "Builders" };
  const mk = (paymentSource) => ({ student: baseStudent, paymentSource, started: false, week: 1, phase: "course", checkin: 0, done: false, emails: [] });
  const noop = () => {};

  it("a direct (not-started) student CAN cancel; a partner student sees NO withdraw control or refund copy", () => {
    const direct = render(<Platform state={mk("")} setState={noop} onExit={noop} onHome={noop} />);
    expect(direct.getByRole("button", { name: /Cancel enrollment/i })).toBeInTheDocument();
    direct.unmount();

    const partner = render(<Platform state={mk("partner")} setState={noop} onExit={noop} onHome={noop} />);
    expect(partner.queryByRole("button", { name: /Cancel enrollment|Withdraw/i })).toBeNull();
    // none of the refund/cancel copy reaches a partner student
    expect(partner.queryByText(/full refund|75% refund|refund window/i)).toBeNull();
  });
});
