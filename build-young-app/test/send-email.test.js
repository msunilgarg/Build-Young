import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import handler from "../api/send-email.js";
import { bodyToHtml } from "../api/_lib/sendEmail.js";

// Minimal Vercel-style req/res mocks.
function makeReq({ method = "POST", body = {}, ip = "1.2.3.4" } = {}) {
  return { method, body, headers: { "x-forwarded-for": ip }, socket: { remoteAddress: ip } };
}
function makeRes() {
  return {
    statusCode: 0,
    payload: null,
    status(code) { this.statusCode = code; return this; },
    json(obj) { this.payload = obj; return this; },
  };
}
// Each test uses a fresh IP so the per-instance rate limiter doesn't bleed across cases.
let ipCounter = 0;
const freshIp = () => `10.0.0.${++ipCounter}`;

describe("/api/send-email handler", () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = "re_test_key";
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ id: "email_123" }) })));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.RESEND_API_KEY;
  });

  it("rejects non-POST methods", async () => {
    const res = makeRes();
    await handler(makeReq({ method: "GET", ip: freshIp() }), res);
    expect(res.statusCode).toBe(405);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns 500 when the API key is missing", async () => {
    delete process.env.RESEND_API_KEY;
    const res = makeRes();
    await handler(makeReq({ ip: freshIp(), body: { to: "a@b.com", subject: "s", body: "b" } }), res);
    expect(res.statusCode).toBe(500);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects an invalid recipient address", async () => {
    const res = makeRes();
    await handler(makeReq({ ip: freshIp(), body: { to: "not-an-email", subject: "s", body: "b" } }), res);
    expect(res.statusCode).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects a recipient list / array (blocks multi-send & header injection)", async () => {
    const res1 = makeRes();
    await handler(makeReq({ ip: freshIp(), body: { to: "a@b.com, c@d.com", subject: "s", body: "b" } }), res1);
    expect(res1.statusCode).toBe(400);

    const res2 = makeRes();
    await handler(makeReq({ ip: freshIp(), body: { to: ["a@b.com"], subject: "s", body: "b" } }), res2);
    expect(res2.statusCode).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects an over-long body", async () => {
    const res = makeRes();
    await handler(makeReq({ ip: freshIp(), body: { to: "a@b.com", subject: "s", body: "x".repeat(5001) } }), res);
    expect(res.statusCode).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends a valid email to exactly one recipient", async () => {
    const res = makeRes();
    await handler(makeReq({ ip: freshIp(), body: { to: "jordan@example.com", subject: "Welcome", body: "Hi there" } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({ ok: true, id: "email_123" });
    expect(fetch).toHaveBeenCalledTimes(1);
    const sent = JSON.parse(fetch.mock.calls[0][1].body);
    expect(sent.to).toEqual(["jordan@example.com"]);
    // Replies route to a monitored inbox, not the verified-domain from-address.
    expect(sent.reply_to).toBe("sunilgarg@outlook.com");
  });

  it("HTML-escapes the body to prevent injection into the HTML part", async () => {
    const res = makeRes();
    await handler(makeReq({ ip: freshIp(), body: { to: "a@b.com", subject: "s", body: "<script>alert(1)</script> & friends" } }), res);
    expect(res.statusCode).toBe(200);
    const sent = JSON.parse(fetch.mock.calls[0][1].body);
    expect(sent.html).toContain("&lt;script&gt;");
    expect(sent.html).not.toContain("<script>");
    expect(sent.text).toContain("<script>"); // plain-text part keeps the raw body
  });

  it("rate-limits a burst from one IP (above the per-advance drip headroom)", async () => {
    const ip = freshIp();
    let last;
    for (let i = 0; i < 12; i++) {
      last = makeRes();
      await handler(makeReq({ ip, body: { to: "a@b.com", subject: "s", body: "b" } }), last);
    }
    expect(last.statusCode).toBe(429); // requests past the window cap (10) are blocked
  });
});

describe("bodyToHtml (branded HTML email)", () => {
  it("renders blank-line blocks as <p> and a bullet block as <ul>/<li>", () => {
    const html = bodyToHtml("Hi Jordan,\n\n  •  When: Mondays\n  •  Where: Zoom");
    expect(html).toContain("<p");
    expect(html).toContain("Hi Jordan,");
    expect(html).toContain("<ul");
    expect(html.match(/<li/g)).toHaveLength(2);
  });
  it("bolds a 'Label: value' bullet's label", () => {
    expect(bodyToHtml("  •  When: Mondays")).toContain("<strong>When:</strong> Mondays");
  });
  it("linkifies a bare URL (and does not mistake the scheme for a label)", () => {
    const html = bodyToHtml("  •  Zoom: https://zoom.us/j/8801000001");
    expect(html).toContain('<a href="https://zoom.us/j/8801000001"');
    expect(html).toContain("<strong>Zoom:</strong>");
  });
  it("carries the brand wordmark + tagline, and the on-brand build-with-AI footer (NOT the stale finance copy)", () => {
    const html = bodyToHtml("Hello");
    expect(html).toContain("Build <span");
    expect(html).toContain("Raising builders, not consumers.");
    expect(html).toContain("build a real product with AI");   // current positioning
    // regression guard: the old finance-era footer must never come back
    expect(html).not.toMatch(/simulated|financial advice|money &amp; building skills/i);
  });
  it("escapes HTML in the body (no injection)", () => {
    const html = bodyToHtml("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });
});
