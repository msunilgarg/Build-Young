import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the roster + sender so no real network / store is touched.
const sendSpy = vi.fn(async () => ({ ok: true, id: "email_x" }));
const rosterSpy = vi.fn(async () => []);

vi.mock("../api/_lib/sendEmail.js", () => ({ sendEmail: (...a) => sendSpy(...a) }));
vi.mock("../api/_lib/roster.js", () => ({ getRoster: (...a) => rosterSpy(...a) }));

// Imported AFTER the mocks are registered.
import handler from "../api/cron/market-news.js";

const SECRET = "test-cron-secret";

function makeReq({ auth, query = {} } = {}) {
  return { headers: auth ? { authorization: auth } : {}, query };
}
function makeRes() {
  return {
    statusCode: 0,
    payload: null,
    status(code) { this.statusCode = code; return this; },
    json(obj) { this.payload = obj; return this; },
  };
}

describe("/api/cron/market-news handler", () => {
  beforeEach(() => {
    sendSpy.mockClear();
    rosterSpy.mockClear();
    rosterSpy.mockResolvedValue([]);
    process.env.CRON_SECRET = SECRET;
    process.env.RESEND_API_KEY = "re_test_key";
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.RESEND_API_KEY;
  });

  it("rejects requests without the cron secret (401)", async () => {
    const res = makeRes();
    await handler(makeReq({ query: { date: "2026-09-20" } }), res); // no auth header
    expect(res.statusCode).toBe(401);
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it("rejects a wrong secret (401)", async () => {
    const res = makeRes();
    await handler(makeReq({ auth: "Bearer wrong", query: { date: "2026-09-20" } }), res);
    expect(res.statusCode).toBe(401);
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it("401s even when CRON_SECRET is unset (never open by default)", async () => {
    delete process.env.CRON_SECRET;
    const res = makeRes();
    await handler(makeReq({ auth: "Bearer anything", query: { date: "2026-09-20" } }), res);
    expect(res.statusCode).toBe(401);
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it("no-ops gracefully when RESEND_API_KEY is missing (200, sent:0)", async () => {
    delete process.env.RESEND_API_KEY;
    const res = makeRes();
    await handler(makeReq({ auth: `Bearer ${SECRET}`, query: { date: "2026-09-20" } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.payload.sent).toBe(0);
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it("sends one email per enrolled student for each due cohort on a given day", async () => {
    // On 2026-10-24: fall-tt W8 (Oct 27) is 3 days out, fall-mw W8 (Oct 26) is 2 days out.
    rosterSpy.mockImplementation(async (batchId) => {
      if (batchId === "fall-tt") return [
        { email: "a@x.com", name: "Avery Lee", batchId },
        { email: "b@x.com", name: "Bo Kim", batchId },
      ];
      if (batchId === "fall-mw") return [{ email: "c@x.com", name: "Cleo Ng", batchId }];
      return []; // everyone else empty
    });

    const res = makeRes();
    await handler(makeReq({ auth: `Bearer ${SECRET}`, query: { date: "2026-10-24" } }), res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.ok).toBe(true);
    // Drips: fall-tt W8 (−3) ×2 + fall-mw W8 (−2) ×1 = 3. PLUS the 2-days-before class reminder:
    // fall-mw W8's class (Oct 26) is exactly 2 days out → fall-mw's 1 student also gets a reminder.
    expect(res.payload.reminders).toBe(1);
    expect(sendSpy).toHaveBeenCalledTimes(4);
    expect(res.payload.sent).toBe(4);

    // The fall-tt students get the dayOffset-3 BREAKING email (Week 8 = "The Fed hikes rates").
    const ttSends = sendSpy.mock.calls.filter((c) => ["a@x.com", "b@x.com"].includes(c[0].to));
    expect(ttSends).toHaveLength(2);
    for (const [arg] of ttSends) {
      expect(arg.subject).toContain("Breaking");
      expect(arg.subject).toContain("The Fed hikes rates");
      expect(arg.body).toContain("Resources:"); // resource links appended
    }
    // The fall-mw student gets BOTH that week's drip email AND the 2-days class reminder.
    const mwSends = sendSpy.mock.calls.filter((c) => c[0].to === "c@x.com");
    expect(mwSends).toHaveLength(2);
    const reminder = mwSends.find((c) => /in 2 days/.test(c[0].subject));
    expect(reminder).toBeTruthy();
    expect(reminder[0].subject).toContain("Week 8");
    expect(reminder[0].body).toContain("To prepare:"); // Week 8 has homework
  });

  it("sends nothing on a day with no due classes", async () => {
    rosterSpy.mockResolvedValue([{ email: "a@x.com", name: "A", batchId: "fall-mw" }]);
    const res = makeRes();
    await handler(makeReq({ auth: `Bearer ${SECRET}`, query: { date: "2026-08-01" } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.payload.due).toBe(0);
    expect(sendSpy).not.toHaveBeenCalled();
  });
});
