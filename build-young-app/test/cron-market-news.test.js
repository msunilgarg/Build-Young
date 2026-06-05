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

  it("sends the 2-days-before class reminder to each enrolled student of a due cohort", async () => {
    // On 2026-10-24, fall-mw W8's class (Oct 26) is exactly 2 days out → a reminder is due.
    rosterSpy.mockImplementation(async (batchId) => {
      if (batchId === "fall-mw") return [{ email: "c@x.com", name: "Cleo Ng", batchId }];
      return []; // everyone else empty
    });

    const res = makeRes();
    await handler(makeReq({ auth: `Bearer ${SECRET}`, query: { date: "2026-10-24" } }), res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.ok).toBe(true);
    // fall-mw W8's class (Oct 26) is exactly 2 days out → fall-mw's 1 student gets the reminder.
    expect(res.payload.reminders).toBe(1);
    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(res.payload.sent).toBe(1);

    const [arg] = sendSpy.mock.calls[0];
    expect(arg.to).toBe("c@x.com");
    expect(arg.subject).toMatch(/in 2 days/);
    expect(arg.subject).toContain("Week 8");
    expect(arg.body).toContain("Before class — please complete these so you're ready:"); // Week 8 has homework / pre-reqs
  });

  it("sends nothing on a day with no due classes", async () => {
    rosterSpy.mockResolvedValue([{ email: "a@x.com", name: "A", batchId: "fall-mw" }]);
    const res = makeRes();
    await handler(makeReq({ auth: `Bearer ${SECRET}`, query: { date: "2026-08-01" } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.payload.reminders).toBe(0);
    expect(sendSpy).not.toHaveBeenCalled();
  });
});
