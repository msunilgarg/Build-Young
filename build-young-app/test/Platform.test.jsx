import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import App, { CONFIG, BATCHES } from "../src/App.jsx";
import { Platform, AgenticProcessPrimer, BuildLayer, ProjectKitPanel, GoLiveChecklist, FounderStoryPanel, SteeringBeat } from "../src/Platform.jsx";

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
    // Lesson 1: building hasn't started, so it points at Lesson 2 — NOT the old "Week Infinity" artifact.
    expect(await screen.findByText(/your first tools come in Lesson 2/i)).toBeInTheDocument();
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

// Clipboard spy: capture what a "Copy"/"Set up & build" button writes, without userEvent's own clipboard.
function spyClipboard() {
  const writeText = vi.fn(() => Promise.resolve());
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  return writeText;
}

describe("Lesson 2 — acceptance criteria + the method primer (SPECS/012 + 013)", () => {
  it("the acceptance-criteria field is written in the build week (step ②)", async () => {
    const user = userEvent.setup();
    function BuildHarness() { const [st, setSt] = useState({ shape: {} }); return <BuildLayer week={2} s={st} setS={setSt} bare />; }
    render(<BuildHarness />);
    const field = screen.getByLabelText(/Your acceptance criteria/i);
    expect(field).toHaveValue(""); // starts empty
    await user.type(field, "A user signs up, logs in, and sees saved notes after a refresh.");
    expect(field).toHaveValue("A user signs up, logs in, and sees saved notes after a refresh.");
  });

  it("shows the named 'Agentic Engineering Process' primer (rendered at the head of Lesson 2)", () => {
    render(<AgenticProcessPrimer />);
    expect(screen.getByText(/You'll repeat these four steps every time you build something/)).toBeInTheDocument();
    expect(screen.getAllByText(/The Agentic Engineering Process/).length).toBeGreaterThan(0);
  });

  it("Lesson 2 no longer asks for a separate product vision ('What success looks like' is gone)", () => {
    function BuildHarness() { const [st, setSt] = useState({ shape: {} }); return <BuildLayer week={2} s={st} setS={setSt} bare />; }
    render(<BuildHarness />);
    expect(screen.queryByLabelText(/What success looks like/i)).toBeNull();
  });
});

describe("③ Build it with Claude Code — the kit handoff (SPECS/009 + 013)", () => {
  function KitHarness({ week = 2 }) {
    const [st] = useState({
      build: { promise: "Quiz yourself from your own notes in 2 minutes." },
      shape: { product: "A notes-to-quiz web app for students.", accept: { product: "A user can paste notes and get a quiz." } },
    });
    return <ProjectKitPanel s={st} week={week} />;
  }

  it("is the ③ Build step: one 'Set up & build' action, no per-file grid, no preview", () => {
    render(<KitHarness />);
    expect(screen.getByText(/③ Build it with Claude Code/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Set up & build with Claude Code/i })).toBeInTheDocument();
    // the bulk per-file download grid is GONE (no standalone CLAUDE.md / PLAYBOOK.md download buttons)
    expect(screen.queryByRole("button", { name: /^CLAUDE\.md$/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^PLAYBOOK\.md$/ })).toBeNull();
    // the setup-prompt preview is GONE
    expect(screen.queryByLabelText(/setup prompt/i)).toBeNull();
    // only THIS lesson's file is offered as a fallback download
    expect(screen.getByText(/Download this lesson's file/i)).toBeInTheDocument();
  });

  it("the 'Set up & build' prompt writes all kit files AND builds this lesson's feature", () => {
    const writeText = spyClipboard();
    render(<KitHarness week={2} />);
    fireEvent.click(screen.getByRole("button", { name: /Set up & build with Claude Code/i }));
    expect(writeText).toHaveBeenCalled();
    const prompt = writeText.mock.calls[0][0];
    for (const f of ["CLAUDE.md", "SPECS/000-overview.md", "SPECS/core-product.md", "PITCH.md", "PLAYBOOK.md"]) expect(prompt).toContain(`===== ${f} =====`);
    expect(prompt).toContain("A notes-to-quiz web app for students.");   // spec → kit
    expect(prompt).toContain("Quiz yourself from your own notes");       // promise → PITCH
    expect(prompt).toContain("A user can paste notes and get a quiz.");  // acceptance → SPECS/core-product.md
    expect(prompt).toMatch(/Now build this lesson's feature/);           // it BUILDS, not just sets up
    expect(prompt).toContain("SPECS/core-product.md");                   // names this week's spec file
  });
});

describe("Build week loop — four steps, every week (SPECS/013)", () => {
  function BuildHarness({ week }) {
    const [st, setSt] = useState({ shape: { product: "a notes-to-quiz app", accept: { product: "Notes paste in and a quiz comes out." } } });
    return <BuildLayer week={week} s={st} setS={setSt} bare />;
  }

  it("shows the four steps in order: ① spec → ② acceptance → ③ build → ④ verify", () => {
    const { container } = render(<BuildHarness week={2} />);
    const t = container.textContent;
    const i1 = t.indexOf("① Write your spec");
    const i2 = t.indexOf("② Write your acceptance criteria");
    const i3 = t.indexOf("③ Build it with Claude Code");
    const i4 = t.indexOf("④ Check your work");
    expect(i1).toBeGreaterThan(-1);
    expect(i2).toBeGreaterThan(i1);
    expect(i3).toBeGreaterThan(i2);
    expect(i4).toBeGreaterThan(i3);
    // the file badge appears on the steps
    expect(screen.getAllByText("SPECS/core-product.md").length).toBeGreaterThan(0);
  });

  it("Lesson 6 (polish & iterate) builds SPECS/polish-and-iterate.md via the kit", () => {
    const writeText = spyClipboard();
    function L6() { const [st, setSt] = useState({ shape: { polish: "smooth the rough edges" } }); return <BuildLayer week={6} s={st} setS={setSt} bare />; }
    render(<L6 />);
    expect(screen.getAllByText(/Polish & iterate/i).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /Set up & build with Claude Code/i }));
    const prompt = writeText.mock.calls[0][0];
    expect(prompt).toContain("SPECS/polish-and-iterate.md");
    expect(prompt).toMatch(/Now build this lesson's feature/);
  });

  it("every build week carries the living pitch — the editor renders + flows into PITCH.md (SPECS/019)", () => {
    const writeText = spyClipboard();
    function L4() { const [st, setSt] = useState({ shape: { payments: "subscriptions" }, build: { edge: "quizzes from YOUR notes — no generic banks" } }); return <BuildLayer week={4} s={st} setS={setSt} bare />; }
    render(<L4 />);
    // the collapsible "Your pitch" editor is present on the build week, incl. the new "why us" field
    expect(screen.getByText(/Your pitch — who it's for/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Why yours vs the alternative/i)).toBeInTheDocument();
    // and the ③ build prompt writes PITCH.md, carrying the pitch the student can tweak here
    fireEvent.click(screen.getByRole("button", { name: /Set up & build with Claude Code/i }));
    const prompt = writeText.mock.calls[0][0];
    expect(prompt).toContain("===== PITCH.md =====");
    expect(prompt).toContain("quizzes from YOUR notes — no generic banks");
  });

  it("every build week carries the living Engineering rules — seeded with the defaults, flows into PLAYBOOK.md (SPECS/021)", async () => {
    const user = userEvent.setup();
    const writeText = spyClipboard();
    function L5() { const [st, setSt] = useState({ shape: { production: "go live" } }); return <BuildLayer week={5} s={st} setS={setSt} bare />; }
    render(<L5 />);
    // the collapsible "Engineering rules" editor is present, seeded with the defaults (not empty, not "undefined")
    const editor = screen.getByLabelText(/Your engineering rules/i);
    expect(editor.value).toMatch(/One feature = one short spec/);   // the seeded DEFAULT_ENGINEERING_RULES
    expect(editor.value).not.toMatch(/undefined/);
    // editing it flows into the regenerated PLAYBOOK.md on the ③ build
    await user.clear(editor);
    await user.type(editor, "- Never ship on a Friday.");
    fireEvent.click(screen.getByRole("button", { name: /Set up & build with Claude Code/i }));
    const prompt = writeText.mock.calls[0][0];
    expect(prompt).toContain("===== PLAYBOOK.md =====");
    expect(prompt).toContain("## Engineering rules");
    expect(prompt).toContain("- Never ship on a Friday.");
  });

  it("acceptance is PER-FEATURE — each week reads/writes its own s.shape.accept[key]", async () => {
    const user = userEvent.setup();
    function AccountsHarness() { const [st, setSt] = useState({ shape: { accept: { product: "product criteria" } } }); return <BuildLayer week={3} s={st} setS={setSt} bare />; }
    render(<AccountsHarness />);
    const crit = screen.getByLabelText(/Your acceptance criteria/i);
    expect(crit).toHaveValue("");                                  // accounts has no criteria yet
    await user.type(crit, "Login works on any device.");
    expect(crit).toHaveValue("Login works on any device.");
  });
});

describe("Is it going somewhere? — steering & knowing when to stop (SPECS/023)", () => {
  it("renders the converging-vs-spinning signal + the steer/stop moves", () => {
    render(<SteeringBeat week={4} />);
    expect(screen.getByText(/steering your build/i)).toBeInTheDocument();          // the named beat
    expect(screen.getByText(/errors shrink, the changes get smaller/i)).toBeInTheDocument(); // "going somewhere"
    expect(screen.getByText(/Going nowhere \(spinning\)/i)).toBeInTheDocument();   // the spin tell
    expect(screen.getByText(/Re-read your spec\./i)).toBeInTheDocument();          // a steer/stop move
    expect(screen.getByText(/out-plan/i)).toBeInTheDocument();                     // the honest hook
  });

  it("Lesson 3 shows the fuller intro (after a spin in Lesson 2); a later build week stays compact", () => {
    const { unmount } = render(<SteeringBeat week={3} />);
    expect(screen.getByText(/goes in circles/i)).toBeInTheDocument();   // fuller intro present at L3
    unmount();
    render(<SteeringBeat week={5} />);
    expect(screen.queryByText(/goes in circles/i)).toBeNull();          // compact thereafter — no intro
  });

  it("ties the spin to Engineering rules and shows a worked example", () => {
    render(<SteeringBeat week={3} />);
    expect(screen.getByText(/Engineering rules/i)).toBeInTheDocument();
    expect(screen.getByText(/See an example/i)).toBeInTheDocument();
    expect(screen.getByText(/cut it in half/i)).toBeInTheDocument();    // the example's captured rule
  });

  it("sits AFTER ④ Check and feeds the Engineering rules below (③ Build → ④ Check → steering → rules)", () => {
    function H() { const [st, setSt] = useState({ shape: { product: "a notes app" } }); return <BuildLayer week={2} s={st} setS={setSt} bare />; }
    const { container } = render(<H />);
    const t = container.textContent;
    const i3 = t.indexOf("③ Build it with Claude Code");
    const i4 = t.indexOf("④ Check your work");
    const iS = t.indexOf("Is it going somewhere?");
    const iR = t.indexOf("Your engineering rules");
    expect(i3).toBeGreaterThan(-1);
    expect(i4).toBeGreaterThan(i3);   // Check comes after Build
    expect(iS).toBeGreaterThan(i4);   // steering comes after Check
    expect(iR).toBeGreaterThan(iS);   // and feeds the Engineering rules below
  });
});

describe("④ Check your work — the student's own independent verifier agent (SPECS/013)", () => {
  function VerifyHarness({ week = 3 }) {
    const [st, setSt] = useState({ shape: { accounts: "a notes app", accept: { accounts: "Login works" } } });
    return <BuildLayer week={week} s={st} setS={setSt} bare />;
  }

  it("is a handoff to the student's Claude — no in-app 'what I built' / 'Check my work' button", () => {
    render(<VerifyHarness />);
    expect(screen.getByText(/④ Check your work — with an independent agent/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/What I built/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /^Check my work$/i })).toBeNull();
  });

  it("copies a verifier handoff naming this feature's spec file + an independent agent", () => {
    const writeText = spyClipboard();
    render(<VerifyHarness week={3} />);
    // The ④ box has the only button literally named "Copy" (③ uses "Set up & build…").
    fireEvent.click(screen.getByRole("button", { name: /^Copy$/ }));
    const prompt = writeText.mock.calls[0][0];
    expect(prompt).toMatch(/independent verifier/i);
    expect(prompt).toContain("SPECS/accounts.md");
    expect(prompt).toMatch(/PASS or GAPS/);
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
