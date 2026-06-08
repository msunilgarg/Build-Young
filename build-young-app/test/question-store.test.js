import { describe, it, expect } from "vitest";
import { addQuestion, listQuestions } from "../api/_lib/questionStore.js";

// KV unconfigured + no RESEND_API_KEY under test, so a valid submission fails loudly rather than
// being silently dropped — same guard as the interest/schedule captures.
describe("FAQ question submission", () => {
  it("rejects a missing/invalid email", async () => {
    const r = await addQuestion({ email: "nope", question: "Is there a sibling discount?" });
    expect(r.ok).toBe(false);
  });
  it("requires an actual question", async () => {
    const r = await addQuestion({ email: "a@b.com", question: "" });
    expect(r.ok).toBe(false);
  });
  it("with valid input but no store/email configured, fails loudly", async () => {
    const r = await addQuestion({ email: "a@b.com", question: "Do you offer payment plans?" });
    expect(r.ok).toBe(false);
    expect(r.error).toBeTruthy();
  });
  it("listQuestions returns [] when unconfigured", async () => {
    expect(await listQuestions()).toEqual([]);
  });
});
