import { describe, it, expect } from "vitest";
import { certName, certVerifyUrl, linkedInAddUrl, certDate, CERT_ORG } from "../src/cert.js";

describe("certificate helpers", () => {
  it("certName uses the org + track", () => {
    expect(certName("Builders")).toBe("Build Young — Builders Program");
    expect(certName()).toBe("Build Young — Builders Program"); // defaults to Builders
    expect(CERT_ORG).toBe("Build Young");
  });

  it("certVerifyUrl builds a clean /verify/<id> URL (no double slashes)", () => {
    expect(certVerifyUrl("https://www.build-young.com/", "abc123")).toBe("https://www.build-young.com/verify/abc123");
    expect(certVerifyUrl("https://www.build-young.com", "a b")).toBe("https://www.build-young.com/verify/a%20b");
  });

  it("linkedInAddUrl points at LinkedIn's add-to-profile with the right params", () => {
    const url = linkedInAddUrl({ track: "Builders", certId: "xyz", certUrl: "https://www.build-young.com/verify/xyz", issuedAt: Date.UTC(2026, 8, 7) });
    expect(url.startsWith("https://www.linkedin.com/profile/add?")).toBe(true);
    const q = new URL(url).searchParams;
    expect(q.get("startTask")).toBe("CERTIFICATION_NAME");
    expect(q.get("name")).toBe("Build Young — Builders Program");
    expect(q.get("organizationName")).toBe("Build Young");
    expect(q.get("certId")).toBe("xyz");
    expect(q.get("certUrl")).toBe("https://www.build-young.com/verify/xyz");
    expect(q.get("issueYear")).toBe("2026");
    expect(q.get("issueMonth")).toBe("9"); // month is 1-based
  });

  it("certDate formats a timestamp", () => {
    expect(certDate(Date.UTC(2026, 8, 7, 18))).toMatch(/2026/);
  });
});
