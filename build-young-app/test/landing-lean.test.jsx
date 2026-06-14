import { describe, it, expect, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import App, { CONFIG, BATCHES } from "../src/App.jsx";

// ── T13 PERMANENT HEIGHT GUARD ──────────────────────────────────────────────────────────────────
// T13 cut the landing page's mobile scroll height ~60% (11,157px → 4,501px, measured) by moving the
// long-form blocks onto their own routes (/about, /curriculum, /faq). This guard keeps it that way:
// it FAILS if a future change re-inflates the landing by moving that bulk back onto it.
//
// Why a content-volume proxy, not a literal px assertion: the test suite runs under jsdom, which has
// NO layout engine — `scrollHeight` is always 0 — so a real px measurement isn't possible here. The
// landing's rendered TEXT VOLUME + DOM-node count are a deterministic, browser-free proxy that tracks
// the thing that actually grows the page (prose blocks). The ceilings below sit ~30–40% above today's
// lean values, so ordinary copy edits pass, but re-adding the founder essay (~3.5k chars) or the full
// FAQ (~3k chars) blows past them — exactly the regression T13 prevents. The real px (≤ 5,579 = 50% of
// the 11,157px pre-T13 baseline) is verified out-of-band with a headless browser, e.g.:
//   node -e 'measure document.documentElement.scrollHeight at width 390 on the built app' (see the PR).
//
// If you INTEND to grow the landing, don't just bump these — ask whether the new content belongs on a
// sub-page instead (the House-style "optimize for less scrolling" rule). Bump only with a fresh px
// measurement showing the landing still renders ≤ 5,579px at 390px wide.
const LANDING_MAX_CHARS = 10000; // lean today ≈ 7,635
const LANDING_MAX_NODES = 430;   // lean today ≈ 300

beforeEach(() => { CONFIG.authEnabled = false; CONFIG.previewAllWeeks = false; BATCHES.forEach((b) => { b.stripeLink = ""; }); });

describe("Landing stays lean (T13 height guard)", () => {
  it("keeps the relocated long-form blocks OFF the landing page", () => {
    const { container } = render(<App />);
    const text = container.textContent || "";
    // founder essay (now on /about)
    expect(text).not.toContain("Start building young, and time does the rest.");
    expect(text).not.toContain("It's not a new idea that the young build the future");
    // full FAQ answers (now on /faq) — the landing only has a teaser
    expect(text).not.toContain("capped at 10 students");
    expect(text).not.toContain("the First-year builder prize");
    // "Where the work happens" detail + per-week build copy (now on /curriculum)
    expect(text).not.toContain("Where the");
    expect(text).not.toContain("copy a ready-made prompt");
  });

  it("keeps the teaser links + the canonical mission paragraph ON the landing", () => {
    const { container } = render(<App />);
    const text = container.textContent || "";
    expect(text).toContain("Read our story");
    expect(text).toContain("See the full 12 weeks");
    expect(text).toContain("Read the FAQ");
    // canonical mission paragraph must remain on the funnel entry (POSITIONING.md)
    expect(text).toContain("Raising builders, not consumers.");
  });

  it("stays under the lean content-volume ceiling (height-regression proxy)", () => {
    const { container } = render(<App />);
    const chars = (container.textContent || "").length;
    const nodes = container.querySelectorAll("*").length;
    expect(chars, `landing rendered ${chars} chars (ceiling ${LANDING_MAX_CHARS}) — did long-form content move back onto the landing?`).toBeLessThanOrEqual(LANDING_MAX_CHARS);
    expect(nodes, `landing rendered ${nodes} nodes (ceiling ${LANDING_MAX_NODES})`).toBeLessThanOrEqual(LANDING_MAX_NODES);
  });
});
