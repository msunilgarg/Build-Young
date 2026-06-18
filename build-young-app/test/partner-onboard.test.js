import { describe, it, expect, vi, beforeEach } from "vitest";

// T28 (SPECS/005): the partner "Start onboarding" action sends the EXACT SAME welcome/set-password
// email a direct (Stripe) student gets — it calls the shared `sendSetPasswordEmail`, which takes only
// { email, name } and has no payment-source branch. This pins the parity guarantee: a partner student's
// onboarding email is identical to a direct student's, and NO partner/source/settlement wording leaks.
vi.mock("../api/_lib/auth.js", () => ({ createPasswordToken: vi.fn(async () => "tok_abc") }));
const sendEmailMock = vi.fn(async () => ({ ok: true, status: 200 }));
vi.mock("../api/_lib/sendEmail.js", () => ({ sendEmail: (...a) => sendEmailMock(...a) }));

import { sendSetPasswordEmail } from "../api/_lib/sendSetPassword.js";

describe("partner onboarding — welcome email parity with a direct enrollment", () => {
  beforeEach(() => sendEmailMock.mockClear());

  it("sends the standard welcome/set-password email; no partner/source/settlement wording reaches the student", async () => {
    const res = await sendSetPasswordEmail({ email: "kid@school.org", name: "Kid Builder" });
    expect(res.ok).toBe(true);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const { to, subject, body } = sendEmailMock.mock.calls[0][0];
    expect(to).toBe("kid@school.org");
    expect(subject).toBe("Welcome to Build Young — set your password"); // identical to the direct flow
    expect(body).toContain("Set your password:");
    expect(body).toContain("your student portal");
    expect(body).toContain("Hi Kid,"); // first-name greeting, same as direct
    for (const banned of ["partner", "Partner", "source", "Outschool", "marketplace", "commission", "cut %"]) {
      expect(body).not.toContain(banned);
    }
  });
});
