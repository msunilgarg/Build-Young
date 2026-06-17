import { describe, it, expect } from "vitest";
import { sanitizeCatalog } from "../api/_lib/cohortStore.js";
import { CARD_DEFAULTS } from "../src/cohorts.js";

// T24: the cohort card's copy (badge audience, format line, blurb) is per-cohort editable, with
// CARD_DEFAULTS as the fallback so a blank field renders the current card unchanged.
describe("editable cohort-card copy", () => {
  it("has sensible defaults", () => {
    expect(CARD_DEFAULTS.audience).toBe("high school");
    expect(CARD_DEFAULTS.format).toBe("Live online · Zoom");
    expect(CARD_DEFAULTS.blurb).toMatch(/build a product/i);
  });
  it("sanitizeCatalog keeps + trims audience/format/blurb", () => {
    const clean = sanitizeCatalog({ batches: [{ id: "c1", start: "Sep 7, 2026", price: 999, audience: "  adults  ", format: " On campus ", blurb: "  do the thing  " }] });
    expect(clean.batches[0]).toMatchObject({ audience: "adults", format: "On campus", blurb: "do the thing" });
  });
  it("a cohort that omits them stores empty strings → the card falls back to the defaults", () => {
    const clean = sanitizeCatalog({ batches: [{ id: "c2", start: "Sep 7, 2026", price: 999 }] });
    const b = clean.batches[0];
    expect(b.audience).toBe(""); expect(b.format).toBe(""); expect(b.blurb).toBe("");
    // the card uses `b.field || CARD_DEFAULTS.field`, so "" → default
    expect(b.audience || CARD_DEFAULTS.audience).toBe("high school");
  });
});
