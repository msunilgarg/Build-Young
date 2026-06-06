import { describe, it, expect } from "vitest";
import { addScheduleRequest, listScheduleRequests } from "../api/_lib/interestStore.js";

// KV unconfigured + no RESEND_API_KEY under test, so a valid request fails loudly rather than
// being silently dropped — the same guard as the tutor-interest capture.
describe("schedule request (landing → request a different schedule)", () => {
  it("rejects a missing/invalid email", async () => {
    const r = await addScheduleRequest({ email: "nope", preference: "weekends", timezone: "ET" });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/email/i);
  });
  it("requires at least a preference or a timezone", async () => {
    const r = await addScheduleRequest({ email: "a@b.com", preference: "", timezone: "" });
    expect(r.ok).toBe(false);
    expect(r.error).toBeTruthy();
  });
  it("with valid input but no store/email configured, fails loudly (doesn't silently drop)", async () => {
    const r = await addScheduleRequest({ email: "a@b.com", preference: "weekend mornings", timezone: "ET" });
    expect(r.ok).toBe(false);
    expect(r.error).toBeTruthy();
  });
  it("listScheduleRequests returns [] when the store is unconfigured", async () => {
    expect(await listScheduleRequests()).toEqual([]);
  });
});
