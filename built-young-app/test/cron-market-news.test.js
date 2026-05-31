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
    // On 2026-09-20: fall-hs-wed (W3, -3), fall-ms-mon (W3, -1), fall-ms-tue (W3, -2) are due.
    rosterSpy.mockImplementation(async (batchId) => {
      if (batchId === "fall-hs-wed") return [
        { email: "a@x.com", name: "Avery Lee", batchId },
        { email: "b@x.com", name: "Bo Kim", batchId },
      ];
      if (batchId === "fall-ms-mon") return [{ email: "c@x.com", name: "Cleo Ng", batchId }];
      return []; // fall-ms-tue empty, everyone else empty
    });

    const res = makeRes();
    await handler(makeReq({ auth: `Bearer ${SECRET}`, query: { date: "2026-09-20" } }), res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.ok).toBe(true);
    // 3 cohorts due; rosters: 2 + 1 + 0 = 3 emails attempted/sent.
    expect(sendSpy).toHaveBeenCalledTimes(3);
    expect(res.payload.sent).toBe(3);

    // The fall-hs-wed students get the dayOffset-3 BREAKING email (Week 3 = "The Fed hikes rates").
    const wedSends = sendSpy.mock.calls.filter((c) => ["a@x.com", "b@x.com"].includes(c[0].to));
    expect(wedSends).toHaveLength(2);
    for (const [arg] of wedSends) {
      expect(arg.subject).toContain("Breaking");
      expect(arg.subject).toContain("The Fed hikes rates");
      expect(arg.body).toContain("Resources:"); // resource links appended
    }
    // The fall-ms-mon student gets the dayOffset-1 CHALLENGE email.
    const monSend = sendSpy.mock.calls.find((c) => c[0].to === "c@x.com");
    expect(monSend[0].subject.toLowerCase()).toContain("class tomorrow");
  });

  it("sends nothing on a day with no due classes", async () => {
    rosterSpy.mockResolvedValue([{ email: "a@x.com", name: "A", batchId: "fall-hs-wed" }]);
    const res = makeRes();
    await handler(makeReq({ auth: `Bearer ${SECRET}`, query: { date: "2026-08-01" } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.payload.due).toBe(0);
    expect(sendSpy).not.toHaveBeenCalled();
  });
});
