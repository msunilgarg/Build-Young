import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import App, { CONFIG, BATCHES } from "../src/App.jsx";
import { Platform, ShapePlan, BuildLayer, GoLiveChecklist, FounderStoryPanel } from "../src/Platform.jsx";

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

  it("the 'create your repo' pre-req explains what a repo is + links the starter template when set (SPECS/009 T44)", async () => {
    CONFIG.starterRepoUrl = "https://github.com/build-young/starter";
    const user = userEvent.setup();
    await enrollToDashboard(user);
    expect(await screen.findByText(/Get set up before you build/i)).toBeInTheDocument();
    expect(screen.getByText(/is just your project's folder/i)).toBeInTheDocument();           // what's a repo
    expect(screen.getByRole("link", { name: /Use this template/i })).toBeInTheDocument();      // one-click template
    CONFIG.starterRepoUrl = "";
  });

  it("hides the 'Use this template' link when no starter repo URL is set — the explainer still shows", async () => {
    CONFIG.starterRepoUrl = "";
    const user = userEvent.setup();
    await enrollToDashboard(user);
    expect(screen.getByText(/is just your project's folder/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Use this template/i })).toBeNull();
  });

  it("the per-lesson Pre-req tab shows the right setup note (prereqWeek matches 'Lesson N', not 'Week Infinity')", async () => {
    const user = userEvent.setup();
    await enrollToDashboard(user);
    await user.click(await screen.findByRole("button", { name: "Course progress" }));
    await user.click(await screen.findByRole("button", { name: /Pre-req/i }));
    // Lesson 1: building hasn't started, so it points at Lesson 3 — NOT the old "Week Infinity" artifact.
    expect(await screen.findByText(/your first tools come in Lesson 3/i)).toBeInTheDocument();
    expect(screen.queryByText(/Infinity/)).toBeNull();
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

  it("shows the named 'Agentic Engineering Process' primer in Lesson 2 (not Lesson 1)", () => {
    render(<ShapeHarness />);
    // Assert the primer card via its UNIQUE intro line — the kit's PLAYBOOK.md preview (also on this
    // lesson now) embeds the same step descriptions, so match a phrase only the primer card uses.
    expect(screen.getByText(/You'll repeat these four steps every time you build something/)).toBeInTheDocument();
    expect(screen.getAllByText(/The Agentic Engineering Process/).length).toBeGreaterThan(0);
  });
});

describe("Lesson 2 project kit (SPECS/009 T43)", () => {
  // Render ShapePlan directly (it gets the kit from s.build + s.shape).
  function KitHarness() {
    const [st, setSt] = useState({
      build: { promise: "Quiz yourself from your own notes in 2 minutes." },
      shape: { product: "A notes-to-quiz web app for students.", acceptance: "Done when notes become a quiz." },
    });
    return <ShapePlan s={st} setS={setSt} bare />;
  }

  it("offers 'Set up with Claude Code' + per-file download, and the setup prompt embeds the four files built from the spec", () => {
    render(<KitHarness />);
    expect(screen.getByText(/Your project kit/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Set up with Claude Code/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Polish with AI/i })).toBeInTheDocument(); // optional AI polish (T45)
    // a download button per kit file
    expect(screen.getByRole("button", { name: /^CLAUDE\.md$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^PLAYBOOK\.md$/ })).toBeInTheDocument();
    // the setup prompt (readonly preview = the exact text "Set up with Claude Code" copies) embeds all
    // four files, built from the live spec — so pasting it into Claude Code writes the real kit.
    const prompt = screen.getByLabelText(/Project kit setup prompt/i).value;
    for (const f of ["CLAUDE.md", "SPEC.md", "POSITIONING.md", "PLAYBOOK.md"]) expect(prompt).toContain(`===== ${f} =====`);
    expect(prompt).toContain("A notes-to-quiz web app for students.");      // spec product → kit
    expect(prompt).toContain("Quiz yourself from your own notes");          // promise → POSITIONING
    expect(prompt).toContain("Done when notes become a quiz.");             // acceptance → SPEC.md
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

  it("lets the student refine the 'Done when…' criteria in the build week (syncs to s.shape.acceptance)", async () => {
    const user = userEvent.setup();
    render(<CheckHarness />);
    // The criteria field is editable here, pre-filled from the Lesson-2 spec (single source of truth).
    const crit = screen.getByLabelText(/Your Done-when criteria/i);
    expect(crit).toHaveValue("Done when login works");
    await user.clear(crit);
    await user.type(crit, "Done when login works AND notes persist after refresh.");
    // Round-trips through the same s.shape.acceptance Lesson 2 reads/writes.
    expect(crit).toHaveValue("Done when login works AND notes persist after refresh.");
  });

  it("never errors offline — falls back to a local self-check from the acceptance criteria", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    const user = userEvent.setup();
    render(<CheckHarness />);
    await user.type(screen.getByLabelText(/What I built/i), "nothing relevant here");
    await user.click(screen.getByRole("button", { name: /Check my work/i }));
    // localReview flags the unmet criterion as a self-check next step (no crash, a result still renders).
    // Assert via the fallback's distinctive phrasing — the criterion text itself now also appears in the
    // editable criteria field, so match the localReview-only prefix to stay unambiguous.
    expect(await screen.findByText(/Check this one yourself/)).toBeInTheDocument();
  });
});

describe("Lesson 7 Go Live = the 'Ship' step (SPECS/008 T41)", () => {
  it("names Go Live as the Ship step of the Agentic Engineering Process", () => {
    function GoLiveHarness() {
      const [st, setSt] = useState({ golive: [] });
      return <GoLiveChecklist s={st} setS={setSt} bare />;
    }
    render(<GoLiveHarness />);
    // The launch checklist is explicitly named the loop's "Ship" step (copy only — mechanics unchanged).
    expect(screen.getByText(/Ship/)).toBeInTheDocument();
    expect(screen.getByText(/Agentic Engineering Process/)).toBeInTheDocument();
  });
});

describe("Capstone founder story (SPECS/010 T47)", () => {
  function StoryHarness({ final }) {
    const [st] = useState({
      build: { promise: "Quiz yourself from your notes in 2 min." },
      shape: { product: "A notes-to-quiz app." },
      reflect: { 11: { whatBuilt: "NoteQuiz — turns notes into a quiz.", whoUses: "my classmates and two study groups", proud: "a friend used it for a real test", next: "spaced repetition" } },
    });
    return <FounderStoryPanel s={st} final={final} />;
  }

  it("Lesson 11 drafts the founder story from the reflection + shows the worked sample", () => {
    render(<StoryHarness />);
    expect(screen.getByText(/Draft your founder story/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Copy my founder story/i })).toBeInTheDocument();
    const story = screen.getByLabelText(/Your founder story/i).value;
    expect(story).toContain("NoteQuiz — turns notes into a quiz."); // reflection → the generated story
    expect(story).toContain("my classmates and two study groups");  // whoUses → story
    // the worked sample (a model story for Build Young) renders so students see what good looks like
    expect(screen.getByText(/A worked founder story/i)).toBeInTheDocument();
    expect(screen.getByText(/Build Young — a 12-week program/)).toBeInTheDocument();
  });

  it("Lesson 12 frames the same story as the final version for the presentation", () => {
    render(<StoryHarness final />);
    expect(screen.getByText(/for your presentation/i)).toBeInTheDocument();
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
