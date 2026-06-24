import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BookCall } from "../src/BookCall.jsx";
import * as lib from "../src/lib.js";

const noop = () => {};

// The funnel's "Calls booked" stat + the call→enroll attribution both depend on the booking CTA
// firing `call_booked` and `markCallBooked()`. With a real Calendly link wired up, the CTA is an
// external <a> — if it fires nothing, the stat is stuck at 0 and every enrollment is mis-tagged
// "direct". These pin that the Calendly path tracks on click-through (the regression that bit us).
describe("BookCall — Calendly attribution", () => {
  beforeEach(() => { lib.CONFIG.calendlyUrl = ""; });

  it("the Calendly link flips the call-booked attribution flag on click", () => {
    lib.CONFIG.calendlyUrl = "https://calendly.com/sunil/15min";
    render(<BookCall onBack={noop} onHome={noop} onEnroll={noop} />);
    const link = screen.getByRole("link", { name: /Pick a time on our calendar/i });
    expect(link).toHaveAttribute("href", "https://calendly.com/sunil/15min");
    expect(lib.callBooked).toBe(false);
    fireEvent.click(link);
    expect(lib.callBooked).toBe(true); // markCallBooked() ran → enrollment will be tagged call-assisted
  });

  it("without a Calendly link, the in-app scheduler booking still flips the flag", () => {
    render(<BookCall onBack={noop} onHome={noop} onEnroll={noop} />);
    // No external link in demo mode — the in-app slot picker is shown instead.
    expect(screen.queryByRole("link", { name: /Pick a time on our calendar/i })).toBeNull();
    expect(screen.getByRole("button", { name: /Book my call/i })).toBeInTheDocument();
  });
});
