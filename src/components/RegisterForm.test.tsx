import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { RegisterForm } from "./RegisterForm";

function mockFetch(status: number, body: unknown) {
  const fn = vi.fn(async () => ({ ok: status < 400, status, json: async () => body }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("RegisterForm (RGAA 11.1, 11.10, 11.13, 7.3, 7.5)", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("labels every field visibly, flags required ones and sets autocomplete", async () => {
    const { container } = render(<RegisterForm onSuccess={() => {}} />);
    const pseudo = screen.getByLabelText("Pseudo (optionnel)");
    const email = screen.getByLabelText("Email (obligatoire)");
    const password = screen.getByLabelText("Mot de passe (obligatoire)");
    expect(pseudo).toHaveAttribute("autocomplete", "nickname");
    expect(email).toHaveAttribute("autocomplete", "email");
    expect(password).toHaveAttribute("autocomplete", "new-password");
    expect(email).toBeRequired();
    expect(password).toBeRequired();
    expect(pseudo).not.toBeRequired();
    expect(password).toHaveAccessibleDescription("8 caractères minimum.");
    expect(pseudo).toHaveAccessibleDescription("3 à 24 caractères : lettres, chiffres, _ ou -.");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("submits with Enter, sends the same body, keeps focus and announces a linked error", async () => {
    const fetchMock = mockFetch(400, { error: "INVALID_EMAIL" });
    const user = userEvent.setup();
    const { container } = render(<RegisterForm onSuccess={() => {}} />);
    const alert = screen.getByRole("alert");
    expect(alert).toBeEmptyDOMElement();

    await user.type(screen.getByLabelText("Email (obligatoire)"), "bad");
    await user.type(screen.getByLabelText("Mot de passe (obligatoire)"), "secret123");
    const submit = screen.getByRole("button", { name: "Créer mon compte" });
    submit.focus();
    await user.keyboard("{Enter}");

    await waitFor(() => expect(alert).toHaveTextContent("Adresse email invalide. Format attendu : nom@domaine.fr"));
    expect(screen.getByRole("alert")).toBe(alert); // same persistent region
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pseudo: "", email: "bad", password: "secret123" }),
    });
    expect(document.activeElement).toBe(submit);
    expect(submit).not.toBeDisabled();
    const email = screen.getByLabelText("Email (obligatoire)");
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAccessibleDescription(/Adresse email invalide/);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("moves focus to the first field when asked", () => {
    render(<RegisterForm onSuccess={() => {}} focusOnMount />);
    expect(screen.getByLabelText("Pseudo (optionnel)")).toHaveFocus();
  });

  it("does not submit when Cancel is pressed", async () => {
    const fetchMock = mockFetch(200, {});
    const onCancel = vi.fn();
    render(<RegisterForm onSuccess={() => {}} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(onCancel).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
