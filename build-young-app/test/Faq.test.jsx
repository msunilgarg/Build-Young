import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
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

  it("the college-applications FAQ is honest — evidence/story, never an admissions promise (POSITIONING guardrail)", () => {
    render(<Faq onBack={() => {}} onHome={() => {}} onCall={() => {}} />);
    expect(screen.getByText(/Will this help with college applications/i)).toBeInTheDocument();
    const a = ((FAQ_ITEMS.find((f) => /college applications/i.test(f.q)) || {}).a || "").toLowerCase();
    expect(a).toContain("not a guarantee of admission"); // honest disclaimer present (no outcome promise)
    expect(a).toMatch(/story|founder/);                  // framed as a founder story
    expect(a).not.toContain("boost");                    // no "boosts your chances"
    expect(a).not.toContain("get you in");               // no admissions-outcome promise
  });

  it("includes the scholarship / free-seats question, framed as funding-dependent + limited (SPECS/017)", () => {
    const item = FAQ_ITEMS.find((f) => /do you offer scholarships/i.test(f.q));
    expect(item).toBeTruthy();
    const a = item.a.toLowerCase();
    expect(a).toContain("by application");           // selective framing, not a cheap giveaway
    expect(a).toMatch(/funding|sponsor/);            // only when we have funding — not a standing offer
    expect(a).toContain("limited");                  // a limited number of seats
    expect(a).not.toMatch(/exclusive|elite|only the best/); // POSITIONING: not boastful
  });

  it("the paid-vs-scholarship FAQ makes clear scholarships are merit-based + not guaranteed, with paid as the fallback", () => {
    const item = FAQ_ITEMS.find((f) => /both paid and scholarship/i.test(f.q));
    expect(item).toBeTruthy();
    const a = item.a.toLowerCase();
    expect(a).toMatch(/merit/);                 // merit-based
    expect(a).toMatch(/aren't guaranteed|not guaranteed/); // not a given
    expect(a).toMatch(/paid cohort/);           // paid is the fallback if not selected
  });

  it("stays in sync with the FAQPage JSON-LD in index.html (count + the new scholarship entry)", () => {
    // POSITIONING standing rule: the FAQ copy and the index.html FAQ schema stay in lockstep. Assert COUNT
    // parity (each FAQ has a JSON-LD Question) — robust to the JSON-LD's stylistic punctuation (it drops
    // curly quotes + expands contractions) — plus that the new scholarship Q+A is actually mirrored.
    const html = readFileSync("index.html", "utf8"); // vitest cwd = package root
    const jsonLdQuestions = (html.match(/"@type":\s*"Question"/g) || []).length;
    expect(jsonLdQuestions).toBe(FAQ_ITEMS.length);
    const norm = (s) => String(s).replace(/[“”]/g, "").replace(/[‘’]/g, "'");
    const h = norm(html);
    const scholarship = FAQ_ITEMS.find((f) => /do you offer scholarships/i.test(f.q));
    expect(h).toContain(norm(scholarship.q));
    expect(h).toContain(norm(scholarship.a)); // the new entry is mirrored in the schema
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
