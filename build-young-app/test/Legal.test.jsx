import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App, { CONFIG, BATCHES } from "../src/App.jsx";

// Pin demo mode (consistent with the other render-based suites).
beforeEach(() => { CONFIG.authEnabled = false; CONFIG.previewAllWeeks = false; BATCHES.forEach((b) => { b.stripeLink = ""; }); });

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
