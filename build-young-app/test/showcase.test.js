import { describe, it, expect } from "vitest";
import { addShowcase, listShowcase } from "../api/_lib/showcaseStore.js";

// KV is unconfigured under test, so the store validates input first, then reports it can't persist
// (rather than throwing or silently succeeding). The validation is the part worth locking down.

describe("student showcase store", () => {
  it("requires at least a link, feedback, or a video", async () => {
    const r = await addShowcase({ link: "", feedback: "", videoLink: "" });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/link, some feedback, or a video/i);
  });

  it("with valid input but no store configured, reports store-not-configured (doesn't throw)", async () => {
    const r = await addShowcase({ link: "https://x.vercel.app", feedback: "Loved it", consent: true });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/not configured/i);
  });

  it("listShowcase returns [] when the store is unconfigured", async () => {
    expect(await listShowcase()).toEqual([]);
  });
});
