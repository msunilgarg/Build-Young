import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { About } from "../src/About.jsx";

// The /about page holds the founder essay + "More than money" narrative that moved off the landing
// page (T13 — fewer-scrolling sub-pages). It must render that copy verbatim and stay accessible.

describe("About (Our story page)", () => {
  it("renders the founder essay + mission narrative that moved off the landing page", () => {
    render(<About onBack={() => {}} onHome={() => {}} onEnroll={() => {}} onCall={() => {}} />);
    expect(screen.getByRole("heading", { name: /More than money/i })).toBeInTheDocument();
    expect(screen.getByText(/Why this exists/i)).toBeInTheDocument();
    expect(screen.getByText(/Sunil Garg/i)).toBeInTheDocument();
    expect(screen.getByText(/Start building young, and time does the rest\./i)).toBeInTheDocument();
  });

  // The founder "Why this exists" opening must NAME AI (mirrors the landing teaser, which deep-links
  // here) — they're the same sentence and must not drift apart. Render-pinned (visible string).
  it("the founder 'Why this exists' opening references AI", () => {
    render(<About onBack={() => {}} onHome={() => {}} onEnroll={() => {}} onCall={() => {}} />);
    expect(screen.getByText(/how fast AI is changing it under them/i)).toBeInTheDocument();
  });

  it("fires the navigation + conversion callbacks", () => {
    const onBack = vi.fn(), onEnroll = vi.fn(), onCall = vi.fn();
    render(<About onBack={onBack} onHome={() => {}} onEnroll={onEnroll} onCall={onCall} />);
    screen.getByRole("button", { name: /Back/i }).click();
    screen.getByRole("button", { name: /Pick a batch & enroll/i }).click();
    screen.getByRole("button", { name: /Talk to us/i }).click();
    expect(onBack).toHaveBeenCalled();
    expect(onEnroll).toHaveBeenCalled();
    expect(onCall).toHaveBeenCalled();
  });

  it("has no serious/critical accessibility violations", async () => {
    const { container } = render(<About onBack={() => {}} onHome={() => {}} onEnroll={() => {}} onCall={() => {}} />);
    const results = await axe(container);
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => v.id)).toEqual([]);
  });
});
