import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Auth from "./Auth";

const signIn = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, signIn, signUp: vi.fn() }),
}));

describe("autenticação acessível", () => {
  it("associa erros aos campos e foca o primeiro erro", () => {
    render(<MemoryRouter><Auth /></MemoryRouter>);
    const email = screen.getByLabelText("Email", { selector: "#login-email" });
    const password = screen.getByLabelText("Senha", { selector: "#login-password" });
    expect(email).toHaveAttribute("autocomplete", "email");
    expect(password).toHaveAttribute("autocomplete", "current-password");

    fireEvent.submit(screen.getByRole("button", { name: "Entrar" }).closest("form")!);
    expect(screen.getByText("Informe seu e-mail.")).toHaveAttribute("id", "login-email-error");
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveFocus();
    expect(signIn).not.toHaveBeenCalled();
  });
});
