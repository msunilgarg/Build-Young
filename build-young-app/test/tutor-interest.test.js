import { describe, it, expect } from "vitest";
import { addTutorInterest, listTutorInterest } from "../api/_lib/interestStore.js";

// KV is unconfigured under test (no store) and RESEND_API_KEY is unset (no email), so the
// mail-client-independent capture validates input first, then reports it couldn't persist —
// exactly the path that guards against losing a lead silently.

describe("tutor interest (Careers → Teach with us)", () => {
  it("rejects a missing/invalid email", async () => {
    const r = await addTutorInterest({ email: "not-an-email", linkedin: "https://www.linkedin.com/in/x" });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/email/i);
  });

  it("requires a LinkedIn profile URL (mandatory)", async () => {
    const r1 = await addTutorInterest({ email: "a@b.com", linkedin: "" });
    expect(r1.ok).toBe(false);
    expect(r1.error).toMatch(/linkedin/i);
    // A non-LinkedIn URL is also rejected.
    const r2 = await addTutorInterest({ email: "a@b.com", linkedin: "https://example.com/me" });
    expect(r2.ok).toBe(false);
    expect(r2.error).toMatch(/linkedin/i);
  });

  it("with valid input but no store/email configured, fails loudly (doesn't silently drop)", async () => {
    const r = await addTutorInterest({ email: "a@b.com", linkedin: "https://www.linkedin.com/in/a" });
    expect(r.ok).toBe(false);
    expect(r.error).toBeTruthy();
  });

  it("listTutorInterest returns [] when the store is unconfigured", async () => {
    expect(await listTutorInterest()).toEqual([]);
  });
});
