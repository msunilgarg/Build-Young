import { describe, it, expect, vi, beforeEach } from "vitest";

// T35 (SPECS/007): failed Stripe payments are recorded + the founder is emailed (visibility only — no
// money movement, no enrollment change). This pins the store's three guarantees: it records + emails,
// it's IDEMPOTENT per `ref` (so the dual payment_intent.payment_failed + charge.failed events alert
// once), and the founder email goes to notifyEmail → contactEmail → the team default.

// Shared, hoisted mock state (vi.mock factories are hoisted above imports — keep their state in vi.hoisted).
const h = vi.hoisted(() => ({
  kv: { configured: true, strings: new Map(), lists: new Map() },
  ops: { notifyEmail: "" },
  settings: { contactEmail: "" },
  emails: [],
}));

vi.mock("../api/_lib/kv.js", () => ({
  kvConfigured: () => h.kv.configured,
  kvCommand: async (args) => {
    const [cmd, ...rest] = args;
    if (cmd === "SET") {
      const [key, val, ...opts] = rest;
      if (opts.includes("NX") && h.kv.strings.has(key)) return null; // NX: already set → null
      h.kv.strings.set(key, val);
      return "OK";
    }
    if (cmd === "RPUSH") { const [key, val] = rest; const l = h.kv.lists.get(key) || []; l.push(val); h.kv.lists.set(key, l); return l.length; }
    if (cmd === "LTRIM") return "OK";
    if (cmd === "LRANGE") { const [key] = rest; return h.kv.lists.get(key) || []; }
    return null;
  },
}));
vi.mock("../api/_lib/sendEmail.js", () => ({
  sendEmail: async (msg) => { h.emails.push(msg); return { ok: true, status: 200 }; },
}));
vi.mock("../api/_lib/settingsStore.js", () => ({
  loadOps: async () => ({ ...h.ops }),
  loadSettings: async () => ({ ...h.settings }),
}));

import { addPaymentFailure, listPaymentFailures } from "../api/_lib/paymentIssueStore.js";

beforeEach(() => {
  h.kv.configured = true;
  h.kv.strings.clear();
  h.kv.lists.clear();
  h.ops.notifyEmail = "";
  h.settings.contactEmail = "";
  h.emails.length = 0;
});

describe("payment-failure store (record + notify the founder)", () => {
  it("records the failure to the list and emails the founder", async () => {
    const r = await addPaymentFailure({ email: "Parent@Example.com ", name: "Pat Payer", batchId: "fall-mw", amountCents: 99900, reason: "Your card was declined.", code: "card_declined", ref: "pi_1" });
    expect(r.ok).toBe(true);
    expect(r.alreadyRecorded).toBe(false);
    expect(r.emailed).toBe(true);

    const list = await listPaymentFailures();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ email: "parent@example.com", name: "Pat Payer", batchId: "fall-mw", amountCents: 99900, ref: "pi_1" });
    expect(h.emails).toHaveLength(1);
    expect(h.emails[0].subject).toContain("Payment failed");
  });

  it("is idempotent per ref — a duplicate attempt (PI then charge event) no-ops, alerting once", async () => {
    const a = await addPaymentFailure({ email: "p@e.com", batchId: "fall-mw", amountCents: 99900, ref: "pi_dup" });
    const b = await addPaymentFailure({ email: "p@e.com", batchId: "fall-mw", amountCents: 99900, ref: "pi_dup" });
    expect(a.ok).toBe(true);
    expect(a.alreadyRecorded).toBe(false);
    expect(b.ok).toBe(true);
    expect(b.alreadyRecorded).toBe(true); // second event deduped
    expect(b.emailed).toBe(false);
    expect(await listPaymentFailures()).toHaveLength(1); // only one record
    expect(h.emails).toHaveLength(1); // only one alert
  });

  it("falls back to email+timestamp as the idempotency key when Stripe gives no ref", async () => {
    const r = await addPaymentFailure({ email: "noref@e.com", amountCents: 5000, at: 12345 });
    expect(r.ok).toBe(true);
    expect((await listPaymentFailures())[0].ref).toBe("noref@e.com:12345");
  });

  it("resolves the alert recipient notifyEmail → contactEmail → team default", async () => {
    h.ops.notifyEmail = "ops@build-young.com";
    h.settings.contactEmail = "hello@build-young.com";
    await addPaymentFailure({ email: "p@e.com", batchId: "fall-mw", amountCents: 1, ref: "pi_a" });
    expect(h.emails[0].to).toBe("ops@build-young.com"); // notifyEmail wins

    h.ops.notifyEmail = "";
    await addPaymentFailure({ email: "p@e.com", batchId: "fall-mw", amountCents: 1, ref: "pi_b" });
    expect(h.emails[1].to).toBe("hello@build-young.com"); // falls back to contactEmail

    h.settings.contactEmail = "";
    await addPaymentFailure({ email: "p@e.com", batchId: "fall-mw", amountCents: 1, ref: "pi_c" });
    expect(h.emails[2].to).toBe("team@build-young.com"); // final default
  });

  it("rejects when there is nothing to key on (no ref and no email)", async () => {
    const r = await addPaymentFailure({ amountCents: 1000 });
    expect(r.ok).toBe(false);
  });

  it("with no store configured, still alerts via email (best-effort, not silently dropped)", async () => {
    h.kv.configured = false;
    const r = await addPaymentFailure({ email: "p@e.com", batchId: "fall-mw", amountCents: 99900, ref: "pi_x" });
    expect(r.ok).toBe(true); // emailed even without KV
    expect(r.emailed).toBe(true);
    expect(await listPaymentFailures()).toEqual([]); // list read is empty without a store
  });
});
