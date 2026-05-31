import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import App from "../src/App.jsx";

// Only fail on the impact levels CLAUDE.md commits to (serious/critical).
async function expectNoSeriousA11y(container) {
  const results = await axe(container);
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => v.id)).toEqual([]);
}

describe("Landing", () => {
  it("renders the canonical tagline and primary CTAs", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: /Raising builders, not consumers\./i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enroll →" })).toBeInTheDocument();
  });

  it("has no serious/critical accessibility violations", async () => {
    const { container } = render(<App />);
    await expectNoSeriousA11y(container);
  });
});

describe("Enroll flow", () => {
  it("navigates from the landing nav to the enroll page", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Enroll →" }));
    expect(await screen.findByRole("heading", { name: /Reserve your seat/i })).toBeInTheDocument();
  });

  it("gates 'Continue to payment' on a valid email", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Enroll →" }));
    await screen.findByRole("heading", { name: /Reserve your seat/i });

    const cont = screen.getByRole("button", { name: /Continue to payment/i });
    expect(cont).toBeDisabled();

    await user.type(screen.getByLabelText("Student name"), "Jordan Rivera");
    await user.type(screen.getByLabelText(/Email/i), "not-an-email");
    expect(cont).toBeDisabled(); // invalid email still blocks

    await user.clear(screen.getByLabelText(/Email/i));
    await user.type(screen.getByLabelText(/Email/i), "jordan@example.com");
    expect(cont).toBeEnabled();
  });

  it("has no serious/critical accessibility violations on step 1", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(screen.getByRole("button", { name: "Enroll →" }));
    await screen.findByRole("heading", { name: /Reserve your seat/i });
    await expectNoSeriousA11y(container);
  });
});

describe("Legal modal", () => {
  it("opens Privacy in-app from the footer and closes on Escape", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText("Privacy"));
    const heading = await screen.findByRole("heading", { name: "Privacy Policy" });
    expect(heading).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("heading", { name: "Privacy Policy" })).not.toBeInTheDocument();
  });

  it("does not link to standalone .html files in the footer (in-app modal instead)", () => {
    const { container } = render(<App />);
    const footer = container.querySelector("footer");
    const htmlLinks = within(footer).queryAllByRole("link").filter((a) => /\.html(\?|#|$)/.test(a.getAttribute("href") || ""));
    expect(htmlLinks).toEqual([]);
  });
});
