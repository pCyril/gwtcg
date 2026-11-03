import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { AuthWidget } from "./AuthWidget";

describe("AuthWidget (RGAA 11.1, 11.9, 11.10, 11.13, 9.1, 7.3, 7.5)", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("login panel: heading, labelled fields with autocomplete, named close button, focus management", async () => {
    const user = userEvent.setup();
    const { container } = render(<AuthWidget isGuest email={null} onAuthChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(screen.getByRole("heading", { level: 2, name: "Connexion" })).toBeInTheDocument();
    const email = screen.getByLabelText("Email (obligatoire)");
    expect(email).toHaveFocus();
    expect(email).toHaveAttribute("autocomplete", "email");
    expect(screen.getByLabelText("Mot de passe (obligatoire)")).toHaveAttribute("autocomplete", "current-password");
    expect(await axe(container)).toHaveNoViolations();

    await user.click(screen.getByRole("button", { name: "Fermer" }));
    expect(screen.getByRole("button", { name: "Se connecter" })).toHaveFocus();
  });

  it("empty login: names the missing field, links it, no request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<AuthWidget isGuest email={null} onAuthChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Se connecter" }));
    const alert = screen.getByRole("alert");
    await user.keyboard("{Enter}");
    expect(alert).toHaveTextContent("Saisis ton adresse email.");
    const email = screen.getByLabelText("Email (obligatoire)");
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAccessibleDescription("Saisis ton adresse email.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("server error is announced and focus stays on the submit button", async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, status: 401, json: async () => ({ error: "INVALID_CREDENTIALS" }) }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<AuthWidget isGuest email={null} onAuthChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Se connecter" }));
    await user.type(screen.getByLabelText("Email (obligatoire)"), "a@b.fr");
    await user.type(screen.getByLabelText("Mot de passe (obligatoire)"), "pw");
    const submit = screen.getAllByRole("button", { name: "Se connecter" }).at(-1)!;
    submit.focus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Email ou mot de passe incorrect."));
    expect(submit).toHaveFocus();
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "a@b.fr", password: "pw" }),
    });
  });

  it("register panel: heading, focus on first field, close returns focus", async () => {
    const user = userEvent.setup();
    const { container } = render(<AuthWidget isGuest email={null} onAuthChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Créer un compte" }));
    expect(screen.getByRole("heading", { level: 2, name: /Créer un compte/ })).toBeInTheDocument();
    expect(screen.getByLabelText("Pseudo (optionnel)")).toHaveFocus();
    expect(await axe(container)).toHaveNoViolations();
    await user.click(screen.getByRole("button", { name: "Fermer" }));
    expect(screen.getByRole("button", { name: "Créer un compte" })).toHaveFocus();
  });
});
