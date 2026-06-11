import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { CertifyVerify, CertificateCard } from "../src/Certificate.jsx";

// A representative issued certificate (the shape /api/cohorts?cert= returns under `cert`).
const sampleCert = {
  name: "Jordan Rivera",
  track: "Builders",
  completedAt: "2026-05-01T00:00:00.000Z",
  certId: "BY-2026-ABC123",
};

afterEach(() => { vi.restoreAllMocks(); });

describe("CertifyVerify — public /verify/<id> page", () => {
  it("renders the verified certificate when the lookup returns one", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ cert: sampleCert }) }));
    vi.stubGlobal("fetch", fetchMock);

    render(<CertifyVerify certId={sampleCert.certId} onHome={() => {}} />);

    // The graduate's name + the "Verified" badge appear once the async lookup resolves.
    expect(await screen.findByText("Jordan Rivera")).toBeInTheDocument();
    expect(screen.getByText(/Verified by Build Young/i)).toBeInTheDocument();
    // It looked the cert up by id via the public endpoint.
    expect(fetchMock).toHaveBeenCalledWith(`/api/cohorts?cert=${encodeURIComponent(sampleCert.certId)}`);
  });

  it("shows the not-found state when the id matches no certificate", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({}) })));

    render(<CertifyVerify certId="BY-0000-NOPE" onHome={() => {}} />);

    expect(await screen.findByText(/Certificate not found/i)).toBeInTheDocument();
    expect(screen.queryByText(/Verified by Build Young/i)).not.toBeInTheDocument();
  });
});

describe("CertificateCard — in-dashboard card", () => {
  it("renders the graduate's name and the share actions", () => {
    render(<CertificateCard cert={sampleCert} />);

    expect(screen.getByText("Jordan Rivera")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Add to LinkedIn/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View public page/i })).toBeInTheDocument();
  });

  it("renders nothing without a cert", () => {
    const { container } = render(<CertificateCard cert={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
