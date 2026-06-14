import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { Curriculum } from "../src/Curriculum.jsx";

// The /curriculum page holds the 3-act "How it works" journey + "Where the work happens" detail that
// moved off the landing page (T13 — fewer-scrolling sub-pages). Verify it renders + stays accessible.

describe("Curriculum (How it works page)", () => {
  it("renders the 3-act journey + where-the-work detail", () => {
    render(<Curriculum onBack={() => {}} onHome={() => {}} onEnroll={() => {}} onCall={() => {}} />);
    expect(screen.getByRole("heading", { name: /How it works/i })).toBeInTheDocument();
    expect(screen.getByText(/Where the/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Act 1/i).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /Show what each week covers/i }).length).toBe(3);
  });

  it("fires the navigation + conversion callbacks", () => {
    const onBack = vi.fn(), onEnroll = vi.fn(), onCall = vi.fn();
    render(<Curriculum onBack={onBack} onHome={() => {}} onEnroll={onEnroll} onCall={onCall} />);
    screen.getByRole("button", { name: /Back/i }).click();
    screen.getByRole("button", { name: /Pick a batch & enroll/i }).click();
    screen.getByRole("button", { name: /Talk to us/i }).click();
    expect(onBack).toHaveBeenCalled();
    expect(onEnroll).toHaveBeenCalled();
    expect(onCall).toHaveBeenCalled();
  });

  it("has no serious/critical accessibility violations", async () => {
    const { container } = render(<Curriculum onBack={() => {}} onHome={() => {}} onEnroll={() => {}} onCall={() => {}} />);
    const results = await axe(container);
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => v.id)).toEqual([]);
  });
});
