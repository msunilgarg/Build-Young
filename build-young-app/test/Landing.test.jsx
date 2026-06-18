import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { axe } from "jest-axe";
import App, { CONFIG, BATCHES } from "../src/App.jsx";
import { Landing } from "../src/Landing.jsx";
import { CohortsContext } from "../src/lib.js";

const noop = () => {};

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

  // Each cohort card shows its END date alongside the start — derived from start + pace (the seed
  // flagship fall-mw starts Sep 7, 2026 → 12 lessons end Nov 25, 2026). Render-pinned (visible string).
  it("shows each cohort's end date on the card", () => {
    render(<App />);
    expect(screen.getByText(/through Nov 25, 2026/)).toBeInTheDocument();
  });

  // The default-selected season tab must be the EARLIEST OPEN season (catalogSeasons is chronological),
  // not a hardcoded Fall — so a Summer cohort that precedes Fall opens selected. Render-pinned (we assert
  // aria-selected on the actual rendered tab, not the selection logic).
  it("defaults the season tab to the earliest open season (Summer before Fall)", () => {
    const catalog = [
      { id: "summer-1", season: "summer", track: "Builders", start: "Aug 10, 2026", day: "Weekdays · 4:00–7:00 PM PT", seats: 10, price: 999, zoom: "", stripeLink: "" },
      { id: "fall-mw", season: "fall", track: "Builders", start: "Sep 7, 2026", day: "Mondays & Wednesdays · 5:00–6:30 PM PT", seats: 10, price: 999, zoom: "", stripeLink: "" },
    ];
    render(
      <CohortsContext.Provider value={catalog}>
        <Landing onEnroll={noop} onCall={noop} onLegal={noop} onStory={noop} onCurriculum={noop} onFaq={noop} onLogin={noop} onDashboard={null} dashLabel="" testimonials={[]} />
      </CohortsContext.Provider>
    );
    expect(screen.getByRole("tab", { name: /Summer 2026/i }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: /^Fall 2026$/ }).getAttribute("aria-selected")).toBe("false");
  });

  // Tapping an unscheduled season (Winter, no cohorts) shows the "not yet scheduled" panel; its
  // "See Fall 2026 →" button must switch the selection without throwing. Guards against a stale state
  // setter in that branch (the panel renders in no other test, so a bad ref would slip through silently).
  it("the 'not yet scheduled' panel switches to Fall without crashing", () => {
    const catalog = [
      { id: "summer-1", season: "summer", track: "Builders", start: "Aug 10, 2026", day: "Weekdays · 4:00–7:00 PM PT", seats: 10, price: 999, zoom: "", stripeLink: "" },
      { id: "fall-mw", season: "fall", track: "Builders", start: "Sep 7, 2026", day: "Mondays & Wednesdays · 5:00–6:30 PM PT", seats: 10, price: 999, zoom: "", stripeLink: "" },
    ];
    render(
      <CohortsContext.Provider value={catalog}>
        <Landing onEnroll={noop} onCall={noop} onLegal={noop} onStory={noop} onCurriculum={noop} onFaq={noop} onLogin={noop} onDashboard={null} dashLabel="" testimonials={[]} />
      </CohortsContext.Provider>
    );
    fireEvent.click(screen.getByRole("tab", { name: /Winter 2027/i }));
    fireEvent.click(screen.getByRole("button", { name: /See Fall 2026/i }));
    expect(screen.getByRole("tab", { name: /^Fall 2026$/ }).getAttribute("aria-selected")).toBe("true");
  });
});

describe("Where-to-find-us partner strip (006-A)", () => {
  const renderLanding = (partners) => render(
    <CohortsContext.Provider value={BATCHES}>
      <Landing onEnroll={noop} onCall={noop} onLegal={noop} onStory={noop} onCurriculum={noop} onFaq={noop} onLogin={noop} onDashboard={null} dashLabel="" testimonials={[]} partners={partners} />
    </CohortsContext.Provider>
  );
  it("renders a compact strip linking OUT to featured partners; hidden when none", () => {
    const withP = renderLanding([{ id: "outschool", displayName: "Outschool", publicUrl: "https://outschool.com/byoung", blurb: "" }]);
    expect(withP.getByText(/Where to find us/i)).toBeInTheDocument();
    const link = withP.getByRole("link", { name: /Outschool/i });
    expect(link).toHaveAttribute("href", "https://outschool.com/byoung");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener"); // security: external link hygiene
    withP.unmount();

    const none = renderLanding([]);
    expect(none.queryByText(/Where to find us/i)).toBeNull(); // no empty shell when nothing featured
  });
});

describe("Partner with us modal (006-B)", () => {
  it("opens a simple interest modal from the nav link (org + email)", () => {
    render(<App />);
    fireEvent.click(screen.getAllByText(/Partner with us/i)[0]); // nav link (also in footer)
    const dialog = screen.getByRole("dialog", { name: /Partner with Build Young/i });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByLabelText("Organization")).toBeInTheDocument();
    expect(screen.getByLabelText("Your email")).toBeInTheDocument();
  });
});
