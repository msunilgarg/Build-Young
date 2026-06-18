import { describe, it, expect } from "vitest";
import { sanitizePartners, publicPartners } from "../api/_lib/partnerStore.js";

// The partners registry backs the third-party-enrollment channel (SPECS/005 + 006). The cut % is the
// partner's commission (founder-only); only featured partners' DISPLAY fields ever go public.
describe("sanitizePartners", () => {
  it("clamps cutPct to a 0..1 fraction, trims, coerces, dedupes, drops id-less rows", () => {
    const out = sanitizePartners([
      { id: " out ", name: " Outschool ", cutPct: 0.3, displayName: "Outschool", publicUrl: " https://x ", blurb: "b", featureOnSite: "on", logo: "https://logo.png" },
      { id: "hi", cutPct: 1.5 },   // over 1 → 1
      { id: "lo", cutPct: -0.2 },  // under 0 → 0
      { id: "hi", name: "dupe" },  // duplicate id dropped
      { name: "no id" },           // no id → dropped
    ]);
    expect(out.map((p) => p.id)).toEqual(["out", "hi", "lo"]);
    expect(out[0]).toMatchObject({ id: "out", name: "Outschool", cutPct: 0.3, publicUrl: "https://x", featureOnSite: true, logo: "https://logo.png" });
    expect(out[1].cutPct).toBe(1);
    expect(out[2].cutPct).toBe(0);
    expect(out[2].featureOnSite).toBe(false);
  });
  it("accepts only an image data-URI or http(s) URL as a logo", () => {
    expect(sanitizePartners([{ id: "a", logo: "javascript:alert(1)" }])[0].logo).toBe("");
    expect(sanitizePartners([{ id: "b", logo: "data:image/png;base64,AAAA" }])[0].logo).toBe("data:image/png;base64,AAAA");
    expect(sanitizePartners([{ id: "c", logo: "https://cdn/x.png" }])[0].logo).toBe("https://cdn/x.png");
  });
  it("non-array input → empty list", () => {
    expect(sanitizePartners(null)).toEqual([]);
    expect(sanitizePartners(undefined)).toEqual([]);
  });
  it("sanitizes the settlement payments ledger (T30) — clamps amount, trims, drops empties", () => {
    const out = sanitizePartners([{ id: "p", payments: [
      { date: " 2026-09-01 ", amountCents: 50000.7, note: " wire " },
      { amountCents: -5 },        // no date + non-positive → dropped
      { date: "2026-10-01", amountCents: 0 }, // kept (has a date), amount clamped to 0
      "junk",
    ] }]);
    expect(out[0].payments).toEqual([
      { date: "2026-09-01", amountCents: 50001, note: "wire" },
      { date: "2026-10-01", amountCents: 0, note: "" },
    ]);
  });
});

describe("publicPartners — only FEATURED partners, only DISPLAY fields (never money/internal)", () => {
  it("exposes display fields for featured partners and NEVER cutPct or the internal name", () => {
    const full = sanitizePartners([
      { id: "out", name: "Outschool Inc", cutPct: 0.3, displayName: "Outschool", logo: "https://l", publicUrl: "https://u", blurb: "b", featureOnSite: true },
      { id: "hidden", name: "Secret", cutPct: 0.5, featureOnSite: false },
    ]);
    const pub = publicPartners(full);
    expect(pub).toHaveLength(1);
    expect(pub[0]).toEqual({ id: "out", displayName: "Outschool", logo: "https://l", publicUrl: "https://u", blurb: "b" });
    // the money + internal fields must never appear in the public payload
    const json = JSON.stringify(pub);
    expect(json).not.toContain("cutPct");
    expect(json).not.toContain("Outschool Inc"); // internal name
    expect(json).not.toContain("0.3");           // the cut value
    expect(json).not.toContain("hidden");        // an un-featured partner
  });
  it("non-array input → empty", () => {
    expect(publicPartners(null)).toEqual([]);
  });
});
