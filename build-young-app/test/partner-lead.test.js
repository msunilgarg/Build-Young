import { describe, it, expect } from "vitest";
import { addPartnerLead } from "../api/_lib/interestStore.js";

// "Partner with us" lead capture (006-B). Validation runs before any store/email, so these are
// deterministic without KV/RESEND configured.
describe("addPartnerLead — validation", () => {
  it("rejects an invalid email", async () => {
    expect(await addPartnerLead({ org: "Outschool", email: "nope" })).toMatchObject({ ok: false });
  });
  it("requires an organization", async () => {
    const r = await addPartnerLead({ org: "   ", email: "a@b.com" });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/organization/i);
  });
});
