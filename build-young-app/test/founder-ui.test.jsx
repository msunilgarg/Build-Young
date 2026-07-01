import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FounderDashboard } from "../src/App.jsx";
import { CohortsContext } from "../src/lib.js";

// The founder/admin dashboard is gated by the session cookie (server checks FOUNDER_EMAILS). These
// cover the gating + scaffold; the funnel math itself is covered in funnel.test.js.
afterEach(() => { vi.restoreAllMocks(); });

describe("FounderDashboard (account-gated)", () => {
  it("denies access when not signed in as a founder (403)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ status: 403, json: async () => ({}) })));
    render(<FounderDashboard onHome={() => {}} />);
    await waitFor(() => expect(screen.getByText(/Access denied/i)).toBeInTheDocument());
  });

  it("the Scholarship segment renders without crashing — Applied → Awarded view (SPECS/020)", async () => {
    const events = [
      { event: "free_application", ts: 1, props: { batchId: "free-fall" } },
      { event: "free_application", ts: 2, props: { batchId: "free-fall" } },
      { event: "enrolled", ts: 3, props: { season: "fall", track: "Builders", batchId: "free-fall", priceCents: 0, source: "free" } },
    ];
    vi.stubGlobal("fetch", vi.fn(async (url) => {
      if (String(url).includes("/api/cohorts")) return { status: 200, ok: true, json: async () => ({ batches: [], checkins: 1 }) };
      return { status: 200, json: async () => ({ events }) };
    }));
    const user = userEvent.setup();
    render(<FounderDashboard onHome={() => {}} />);
    await waitFor(() => expect(screen.getByText("Funnel")).toBeInTheDocument());
    await user.click(screen.getByText("Funnel"));
    await waitFor(() => expect(screen.getByText("Segment")).toBeInTheDocument());
    // Clicking "Scholarship" previously crashed (summary.counts.enrolled was undefined in this view).
    await user.click(screen.getByText("Scholarship"));
    expect(screen.getByText("Scholarship funnel")).toBeInTheDocument();   // the view re-labeled — render completed, no crash
  });

  it("'The funnel' renders as an HTML list — a small non-zero stage shows its label + count·% cleanly (no chart overlap)", async () => {
    // Reproduces the mobile glitch case: Visited 9, Enroll started 1 (→ "1 · 11.1%"). The old recharts
    // horizontal-bar funnel collided the label with the annotation; the HTML list renders both as plain text.
    const ts = new Date("2026-07-02T12:00:00Z").getTime();
    const events = [
      ...Array.from({ length: 9 }, (_, i) => ({ event: "visited", ts: ts + i, props: { source: "direct", sid: `v${i}` } })),
      { event: "enroll_started", ts: ts + 50, props: {} },
    ];
    vi.stubGlobal("fetch", vi.fn(async (url) => {
      if (String(url).includes("/api/cohorts")) return { status: 200, ok: true, json: async () => ({ batches: [], checkins: 0 }) };
      return { status: 200, json: async () => ({ events }) };
    }));
    const user = userEvent.setup();
    render(<FounderDashboard onHome={() => {}} />);
    await waitFor(() => expect(screen.getByText("Funnel")).toBeInTheDocument());
    await user.click(screen.getByText("Funnel"));
    await waitFor(() => expect(screen.getByText("The funnel")).toBeInTheDocument());
    // the stage label AND its "count · pct" annotation both render as plain text (jsdom couldn't render the old chart)
    expect(screen.getByText("Enroll started")).toBeInTheDocument();
    expect(screen.getByText("1 · 11.1%")).toBeInTheDocument();
  });

  it("'Which screens hold attention' shows the low-volume Scholarship application screen (not truncated off the top-8)", async () => {
    // 9 other screens with 2 views each all out-rank the single scholarship view, so under the old top-8 cap
    // "Scholarship application" was cut off the bottom. The scholarship view carries NO sid (so it doesn't
    // also appear in Top paths) — proving it shows specifically in the "Which screens hold attention" card.
    const others = ["home", "story", "curriculum", "faq", "enroll", "call", "login", "setpw", "founder"];
    const events = [];
    let ts = 1;
    for (const s of others) for (let i = 0; i < 2; i++) events.push({ event: "screen_view", ts: ts++, props: { screen: s, ms: 1000, sid: `${s}-${i}` } });
    events.push({ event: "screen_view", ts: ts++, props: { screen: "enroll-scholarship", ms: 1000 } }); // 1 view, no sid → ranks 10th
    vi.stubGlobal("fetch", vi.fn(async (url) => {
      if (String(url).includes("/api/cohorts")) return { status: 200, ok: true, json: async () => ({ batches: [], checkins: 0 }) };
      return { status: 200, json: async () => ({ events }) };
    }));
    const user = userEvent.setup();
    render(<FounderDashboard onHome={() => {}} />);
    await waitFor(() => expect(screen.getByText("Funnel")).toBeInTheDocument());
    await user.click(screen.getByText("Funnel"));
    await waitFor(() => expect(screen.getByText("Which screens hold attention")).toBeInTheDocument());
    expect(screen.getByText("Scholarship application")).toBeInTheDocument(); // surfaced despite ranking below the old top-8
  });

  it("renders the funnel scaffold + cohort editor for a founder session", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url) => {
      if (String(url).includes("/api/cohorts")) {
        return { status: 200, ok: true, json: async () => ({ batches: [{ id: "fall-mw", season: "fall", track: "Builders", start: "Sep 7, 2026", day: "Mon & Wed", price: 999, seats: 12, zoom: "", stripeLink: "" }], checkins: 1 }) };
      }
      return { status: 200, json: async () => ({ events: [] }) }; // /api/funnel
    }));
    const user = userEvent.setup();
    render(<FounderDashboard onHome={() => {}} />);
    // Default tab is now "Today" (teaching schedule); switch to Funnel for the analytics scaffold.
    await waitFor(() => expect(screen.getByText("Funnel")).toBeInTheDocument());
    await user.click(screen.getByText("Funnel"));
    await waitFor(() => expect(screen.getByText(/Drop-off — where you lose people/i)).toBeInTheDocument());
    expect(screen.getByText("Segment")).toBeInTheDocument();
    expect(screen.getByText("Traffic & engagement")).toBeInTheDocument();
    expect(screen.getByText("Where visitors come from")).toBeInTheDocument();

    // Cohorts & course tab: the cohort editor + recordings + homework.
    await user.click(screen.getByText("Cohorts & course"));
    expect(await screen.findByDisplayValue("fall-mw")).toBeInTheDocument();
    expect(screen.getByText(/\+ Add cohort/i)).toBeInTheDocument();
    expect(screen.getByText(/Class recordings/i)).toBeInTheDocument();
    expect(screen.getByText(/^Homework$/i)).toBeInTheDocument();

    // Students tab: partner enrollments / certificates / build plans / reset.
    await user.click(screen.getByText("Students"));
    expect(await screen.findByText(/Reset a test account/i)).toBeInTheDocument();
    // Manual partner-enrollment form (SPECS/005 T27) — saving is inert; onboarding is a separate step.
    expect(screen.getByText(/Partner enrollments/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add partner enrollment/i })).toBeInTheDocument();
  });

  it("cohort editor shows the cohort's REAL pace (derived from its saved schedule), not 1/2 defaults", async () => {
    // An accelerated cohort: 12 lessons, 4 a week, 1 sitting each (Aug 10 + offsets 0..17 → ends Aug 27).
    const accelerated = [[0], [1], [2], [3], [7], [8], [9], [10], [14], [15], [16], [17]];
    vi.stubGlobal("fetch", vi.fn(async (url) => {
      if (String(url).includes("/api/cohorts")) {
        return { status: 200, ok: true, json: async () => ({ batches: [{ id: "summer-1", season: "summer", track: "Builders", start: "Aug 10, 2026", day: "Weekdays · 4:00–7:00 PM PT", price: 999, seats: 10, zoom: "", stripeLink: "", lessons: accelerated }], checkins: 0 }) };
      }
      return { status: 200, json: async () => ({ events: [] }) };
    }));
    const user = userEvent.setup();
    render(<FounderDashboard onHome={() => {}} />);
    await waitFor(() => expect(screen.getByText("Funnel")).toBeInTheDocument());
    await user.click(screen.getByText("Funnel")); // leave the Today tab (its body also says "Cohorts & course")
    await user.click(screen.getByText("Cohorts & course"));
    await screen.findByDisplayValue("summer-1");
    // The pace inputs reflect the REAL saved schedule (4 / 1), NOT the generator defaults (1 / 2).
    expect(screen.getByLabelText(/Lessons per week for cohort 1/i)).toHaveValue(4);
    expect(screen.getByLabelText(/Sittings per lesson for cohort 1/i)).toHaveValue(1);
    // …and the derived end date is shown (start Aug 10 + offsets 0..17 → Aug 27).
    expect(screen.getByText(/Aug 27, 2026/)).toBeInTheDocument();

    // Settings tab: site settings + admins + partners + system status.
    await user.click(screen.getByText("Settings"));
    expect(await screen.findByText(/Site settings/i)).toBeInTheDocument();
    expect(screen.getByText(/System status/i)).toBeInTheDocument();
    expect(await screen.findByLabelText(/Booking link/i)).toBeInTheDocument();
    // The partners registry editor (third-party enrollment channel — SPECS/005+006).
    expect(screen.getByText(/Partners \(third-party enrollment\)/i)).toBeInTheDocument();
    expect(screen.getByText(/\+ Add partner/i)).toBeInTheDocument();
    // The Week-9 funnel scenario agent is the only student-facing AI agent left (SPECS/014 removed the
    // review + kit-polish agents and their console editors).
    expect(await screen.findByLabelText(/Scenario model/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Review model/i)).toBeNull();
    expect(screen.queryByLabelText(/Kit model/i)).toBeNull();
  });

  it("a PENDING partner enrollment shows a 'Start onboarding' action (SPECS/005 T28)", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url) => {
      const u = String(url);
      if (u.includes("resource=partner-enrollments")) return { status: 200, ok: true, json: async () => ({ enrollments: [{ email: "kid@school.org", batchId: "fall-mw", partner: "outschool", onboarded: false }] }) };
      if (u.includes("resource=partners")) return { status: 200, ok: true, json: async () => ({ partners: [{ id: "outschool", name: "Outschool", cutPct: 0.3 }] }) };
      if (u.includes("/api/cohorts")) return { status: 200, ok: true, json: async () => ({ batches: [{ id: "fall-mw", season: "fall", track: "Builders", start: "Sep 7, 2026", day: "Mon & Wed", price: 999, seats: 10 }], checkins: 0 }) };
      return { status: 200, json: async () => ({ events: [] }) };
    }));
    const user = userEvent.setup();
    render(<FounderDashboard onHome={() => {}} />);
    await waitFor(() => expect(screen.getByText("Funnel")).toBeInTheDocument());
    await user.click(screen.getByText("Students"));
    // The pending row exposes the explicit onboarding action (saving alone never onboards).
    expect(await screen.findByRole("button", { name: /Start onboarding/i })).toBeInTheDocument();
    expect(screen.getByText(/Pending/i)).toBeInTheDocument();
  });

  it("the funnel Segment selector includes a founder-created catalog season (Summer 2026)", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url) => {
      if (String(url).includes("/api/cohorts")) {
        return { status: 200, ok: true, json: async () => ({ batches: [{ id: "summer-1", season: "summer", track: "Builders", start: "Aug 10, 2026", day: "Weekdays", price: 999, seats: 10 }], checkins: 0 }) };
      }
      return { status: 200, json: async () => ({ events: [] }) };
    }));
    const user = userEvent.setup();
    // The dashboard reads the live catalog from CohortsContext (App provides it); supply a Summer cohort.
    const catalog = [{ id: "summer-1", season: "summer", track: "Builders", start: "Aug 10, 2026", day: "Weekdays", price: 999, seats: 10 }];
    render(<CohortsContext.Provider value={catalog}><FounderDashboard onHome={() => {}} /></CohortsContext.Provider>);
    await waitFor(() => expect(screen.getByText("Funnel")).toBeInTheDocument());
    await user.click(screen.getByText("Funnel"));
    // The Segment row reflects the LIVE catalog (catalogSeasons), so the Summer cohort shows — not just
    // the hardcoded Fall/Winter/Spring. Regression guard: the console matches the landing's season tabs.
    expect(await screen.findByText("Summer 2026")).toBeInTheDocument();
  });

  it("the 'All cohorts' list is ordered soonest-start-first (next cohort on top)", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url) => {
      if (String(url).includes("/api/cohorts")) return { status: 200, ok: true, json: async () => ({ batches: [], checkins: 0 }) };
      return { status: 200, json: async () => ({ events: [] }) };
    }));
    const catalog = [
      { id: "summer-1", season: "summer", track: "Builders", start: "Aug 10, 2026", day: "Weekdays", price: 999, seats: 10 },
      { id: "fall-mw", season: "fall", track: "Builders", start: "Sep 7, 2026", day: "Mon & Wed", price: 999, seats: 10 },
      { id: "winter-1", season: "winter", track: "Builders", start: "Jan 5, 2027", day: "Tue & Thu", price: 999, seats: 10 },
    ];
    render(<CohortsContext.Provider value={catalog}><FounderDashboard onHome={() => {}} /></CohortsContext.Provider>);
    await screen.findByText("All cohorts"); // default "Today" tab shows the roster
    const t = document.body.textContent || "";
    const iW = t.indexOf("winter-1"), iF = t.indexOf("fall-mw"), iS = t.indexOf("summer-1");
    // soonest start first: summer-1 (Aug 2026) → fall-mw (Sep 2026) → winter-1 (Jan 2027)
    expect(iS).toBeGreaterThanOrEqual(0);
    expect(iF).toBeGreaterThan(iS);
    expect(iW).toBeGreaterThan(iF);
  });
});

describe("FounderDashboard — Students tab declutter (T34)", () => {
  afterEach(() => { vi.restoreAllMocks(); });
  it("splits Students into Enrolled vs Inbound sub-views (one cluster at a time)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ status: 200, ok: true, json: async () => ({ events: [] }) })));
    const user = userEvent.setup();
    render(<FounderDashboard onHome={() => {}} />);
    await waitFor(() => expect(screen.getByText("Funnel")).toBeInTheDocument());
    await user.click(screen.getByText("Students"));
    // Default = Enrolled students: enrolled sections show, inbound ones are hidden.
    expect(screen.getByText("Partner enrollments")).toBeInTheDocument();
    expect(screen.getByText("Reset a test account")).toBeInTheDocument();
    expect(screen.queryByText("Tutor applications")).toBeNull();
    expect(screen.queryByText("Partner inquiries")).toBeNull();
    // Switch to Inbound: leads/requests show, enrolled sections hide.
    await user.click(screen.getByText(/Inbound/i));
    expect(screen.getByText("Tutor applications")).toBeInTheDocument();
    expect(screen.getByText("Partner inquiries")).toBeInTheDocument();
    expect(screen.getByText("Schedule requests")).toBeInTheDocument();
    expect(screen.queryByText("Partner enrollments")).toBeNull();
  });
});

describe("FounderDashboard — Failed payments card (T36)", () => {
  afterEach(() => { vi.restoreAllMocks(); });
  it("renders failed-payment rows from the founder-gated read, beside Refunds to issue", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url) => {
      if (String(url).includes("resource=payment-failures")) {
        return { status: 200, ok: true, json: async () => ({ failures: [
          { name: "Pat Payer", email: "pat@example.com", amountCents: 99900, batchId: "fall-mw", reason: "Your card was declined.", code: "card_declined", ts: 1718000000000 },
        ] }) };
      }
      return { status: 200, ok: true, json: async () => ({ events: [] }) };
    }));
    const user = userEvent.setup();
    render(<FounderDashboard onHome={() => {}} />);
    await waitFor(() => expect(screen.getByText("Funnel")).toBeInTheDocument());
    await user.click(screen.getByText("Students")); // default = Enrolled students cluster
    // The card heading sits next to "Refunds to issue", and the mocked failure row renders.
    expect(await screen.findByText("Failed payments")).toBeInTheDocument();
    expect(screen.getByText("Refunds to issue")).toBeInTheDocument();
    expect(await screen.findByText("Pat Payer")).toBeInTheDocument();
    expect(screen.getByText(/Your card was declined\./)).toBeInTheDocument();
  });
});
