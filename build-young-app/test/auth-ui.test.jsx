import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Login, SetPassword } from "../src/App.jsx";

describe("Login screen", () => {
  it("submits the entered credentials and surfaces a server error", async () => {
    const onLogin = vi.fn(async () => ({ ok: false, error: "Incorrect email or password." }));
    render(<Login onLogin={onLogin} onReset={vi.fn()} onHome={vi.fn()} onEnroll={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "jordan@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secretpw1" } });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));
    await waitFor(() => expect(onLogin).toHaveBeenCalledWith("jordan@example.com", "secretpw1"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect email or password.");
  });

  it("gates 'Forgot password?' on a valid email, then confirms a reset was requested", async () => {
    const onReset = vi.fn(async () => ({ ok: true }));
    render(<Login onLogin={vi.fn()} onReset={onReset} onHome={vi.fn()} onEnroll={vi.fn()} />);
    fireEvent.click(screen.getByText("Forgot password?"));
    expect(onReset).not.toHaveBeenCalled(); // no email yet
    expect(screen.getByRole("alert")).toHaveTextContent(/enter your email/i);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "kai@example.com" } });
    fireEvent.click(screen.getByText("Forgot password?"));
    await waitFor(() => expect(onReset).toHaveBeenCalledWith("kai@example.com"));
    expect(screen.getByRole("status")).toHaveTextContent(/sent a link/i);
  });
});

describe("SetPassword screen", () => {
  it("enforces minimum length and matching confirmation before calling the server", async () => {
    const onSetPassword = vi.fn(async () => ({ ok: true, user: {} }));
    render(<SetPassword token="tok123" onSetPassword={onSetPassword} onHome={vi.fn()} />);
    const submit = screen.getByRole("button", { name: /set password/i });

    // too short
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "short" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "short" } });
    fireEvent.click(submit);
    expect(onSetPassword).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/at least 8/i);

    // mismatch
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "longenough1" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "different22" } });
    fireEvent.click(submit);
    expect(onSetPassword).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/don't match/i);

    // valid → passes the token + password through
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "longenough1" } });
    fireEvent.click(submit);
    await waitFor(() => expect(onSetPassword).toHaveBeenCalledWith("tok123", "longenough1"));
  });
});
