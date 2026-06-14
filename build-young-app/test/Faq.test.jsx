import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { Faq, FAQ_ITEMS } from "../src/Faq.jsx";

// The /faq page holds the full Q&A + "ask a question" form that moved off the landing page
// (T13 — fewer-scrolling sub-pages). Verify it renders every question + the ask form, and stays a11y.

describe("Faq page", () => {
  it("renders every FAQ question + the ask-a-question form", () => {
    render(<Faq onBack={() => {}} onHome={() => {}} onCall={() => {}} />);
    expect(screen.getByRole("heading", { name: /Questions parents ask/i })).toBeInTheDocument();
    FAQ_ITEMS.forEach((f) => expect(screen.getByText(f.q)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /Send my question/i })).toBeInTheDocument();
  });

  it("fires the Back callback", () => {
    const onBack = vi.fn();
    render(<Faq onBack={onBack} onHome={() => {}} onCall={() => {}} />);
    screen.getByRole("button", { name: /Back/i }).click();
    expect(onBack).toHaveBeenCalled();
  });

  it("has no serious/critical accessibility violations", async () => {
    const { container } = render(<Faq onBack={() => {}} onHome={() => {}} onCall={() => {}} />);
    const results = await axe(container);
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => v.id)).toEqual([]);
  });
});
