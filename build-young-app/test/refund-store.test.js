import { describe, it, expect } from "vitest";
import { addRefundRequest, listRefundRequests } from "../api/_lib/refundStore.js";

// KV unconfigured + no RESEND_API_KEY under test, so a valid request fails loudly rather than being
// silently dropped — the same guard as the interest/schedule captures.
describe("refund request (cancellation → founder issues refund in Stripe)", () => {
  it("rejects a missing/invalid email", async () => {
    const r = await addRefundRequest({ email: "nope", batchId: "fall-mw", refundCents: 99900, tier: "full" });
    expect(r.ok).toBe(false);
  });
  it("rejects a missing batchId", async () => {
    const r = await addRefundRequest({ email: "a@b.com", batchId: "", refundCents: 99900, tier: "full" });
    expect(r.ok).toBe(false);
  });
  it("with valid input but no store/email configured, fails loudly (doesn't silently drop)", async () => {
    const r = await addRefundRequest({ email: "a@b.com", name: "Ada", batchId: "fall-mw", refundCents: 49950, tier: "prorated", reason: "moved", week: 1, at: 123 });
    expect(r.ok).toBe(false);
    expect(r.reason).toBeTruthy();
  });
  it("listRefundRequests returns [] when the store is unconfigured", async () => {
    expect(await listRefundRequests()).toEqual([]);
  });
});
