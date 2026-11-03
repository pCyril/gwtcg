import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { PseudoField } from "./PseudoField";

describe("PseudoField (RGAA 11.1, 11.9, 11.10, 11.13, 12.8, 7.5)", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("edit mode: labelled field with help and autocomplete, explicit button names, focus in and back", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <p>
        Bienvenue, <PseudoField value="Alice" onSaved={() => {}} />.
      </p>,
    );
    await user.click(screen.getByRole("button", { name: "modifier le pseudo" }));
    const input = screen.getByRole("textbox", { name: "Pseudo" });
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute("autocomplete", "nickname");
    expect(input).toHaveAccessibleDescription("3 à 24 caractères : lettres, chiffres, _ ou -.");
    expect(screen.getByRole("button", { name: "Enregistrer le pseudo" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();

    await user.click(screen.getByRole("button", { name: "Annuler la modification du pseudo" }));
    expect(screen.getByRole("button", { name: "modifier le pseudo" })).toHaveFocus();
  });

  it("server error is announced, linked, and focus stays on Save", async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, status: 409, json: async () => ({ error: "PSEUDO_TAKEN" }) }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<PseudoField value="Alice" onSaved={() => {}} />);
    await user.click(screen.getByRole("button", { name: "modifier le pseudo" }));
    const alert = screen.getByRole("alert");
    const save = screen.getByRole("button", { name: "Enregistrer le pseudo" });
    save.focus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(alert).toHaveTextContent("Ce pseudo est déjà pris."));
    expect(save).toHaveFocus();
    const input = screen.getByRole("textbox", { name: "Pseudo" });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(/Ce pseudo est déjà pris/);
    expect(fetchMock).toHaveBeenCalledWith("/api/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pseudo: "Alice" }),
    });
  });

  it("success returns focus to the edit button", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) })));
    const user = userEvent.setup();
    const onSaved = vi.fn();
    render(<PseudoField value="Alice" onSaved={onSaved} />);
    await user.click(screen.getByRole("button", { name: "modifier le pseudo" }));
    await user.keyboard("{Enter}");
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: "modifier le pseudo" })).toHaveFocus();
  });
});
