import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { FounderDashboard } from "../src/App.jsx";

// The founder route is token-gated by /api/funnel. These cover the gating branches (which don't
// mount the lazy recharts chart) — the funnel math itself is covered in funnel.test.js.
afterEach(() => { vi.restoreAllMocks(); });

describe("FounderDashboard gating", () => {
  it("shows a configuration message when analytics isn't set up (404)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ status: 404, json: async () => ({}) })));
    render(<FounderDashboard token="whatever" onHome={() => {}} />);
    await waitFor(() => expect(screen.getByText(/isn’t configured yet/i)).toBeInTheDocument());
  });

  it("denies access on an invalid token (403)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ status: 403, json: async () => ({}) })));
    render(<FounderDashboard token="bad" onHome={() => {}} />);
    await waitFor(() => expect(screen.getByText(/Access denied/i)).toBeInTheDocument());
  });

  it("renders the segment controls once events load", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ status: 200, json: async () => ({ events: [] }) })));
    render(<FounderDashboard token="ok" onHome={() => {}} />);
    // Plain-DOM controls render regardless of the (lazy) chart; assert the funnel scaffold is there.
    await waitFor(() => expect(screen.getByText(/Stage-to-stage conversion/i)).toBeInTheDocument());
    expect(screen.getByText("Segment")).toBeInTheDocument();
    expect(screen.getByText(/No events recorded yet/i)).toBeInTheDocument();
  });
});
