import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { FounderDashboard } from "../src/App.jsx";

// The founder/admin dashboard is gated by the session cookie (server checks FOUNDER_EMAILS). These
// cover the gating + scaffold; the funnel math itself is covered in funnel.test.js.
afterEach(() => { vi.restoreAllMocks(); });

describe("FounderDashboard (account-gated)", () => {
  it("denies access when not signed in as a founder (403)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ status: 403, json: async () => ({}) })));
    render(<FounderDashboard onHome={() => {}} />);
    await waitFor(() => expect(screen.getByText(/Access denied/i)).toBeInTheDocument());
  });

  it("renders the funnel scaffold + cohort editor for a founder session", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url) => {
      if (String(url).includes("/api/cohorts")) {
        return { status: 200, ok: true, json: async () => ({ batches: [{ id: "fall-mw", season: "fall", track: "Builders", start: "Sep 7, 2026", day: "Mon & Wed", price: 999, seats: 12, zoom: "", stripeLink: "" }], checkins: 1 }) };
      }
      return { status: 200, json: async () => ({ events: [] }) }; // /api/funnel
    }));
    render(<FounderDashboard onHome={() => {}} />);
    await waitFor(() => expect(screen.getByText(/Drop-off — where you lose people/i)).toBeInTheDocument());
    expect(screen.getByText("Segment")).toBeInTheDocument();
    expect(screen.getByText("Traffic & engagement")).toBeInTheDocument();
    expect(screen.getByText("Where visitors come from")).toBeInTheDocument();
    expect(screen.getByText(/Site settings/i)).toBeInTheDocument();
    expect(screen.getByText(/Cohorts & schedule/i)).toBeInTheDocument();
    expect(await screen.findByDisplayValue("fall-mw")).toBeInTheDocument();
    expect(screen.getByText(/\+ Add cohort/i)).toBeInTheDocument();
    expect(screen.getByText(/Reset a test account/i)).toBeInTheDocument();
    expect(screen.getByText(/System status/i)).toBeInTheDocument();
    // the booking-link field from the settings editor (hydrated from /api/cohorts)
    expect(await screen.findByLabelText(/Booking link/i)).toBeInTheDocument();
  });
});
