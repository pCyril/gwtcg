import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { GameCharacterNameField } from "./GameCharacterNameField";

describe("GameCharacterNameField (RGAA 11.1, 11.9, 11.10, 12.8, 7.5)", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("edit mode: label associated, format help linked, explicit names, focus in and back", async () => {
    const user = userEvent.setup();
    const { container } = render(<GameCharacterNameField value={null} onSaved={() => {}} />);
    await user.click(screen.getByRole("button", { name: "renseigner le perso in-game" }));
    const input = screen.getByRole("textbox", { name: "Perso in-game :" });
    expect(input).toHaveFocus();
    expect(input).toHaveAccessibleDescription("3 à 32 caractères : lettres, espaces, apostrophes ou tirets.");
    expect(await axe(container)).toHaveNoViolations();
    await user.click(screen.getByRole("button", { name: "Annuler la modification du perso in-game" }));
    expect(screen.getByRole("button", { name: "renseigner le perso in-game" })).toHaveFocus();
  });

  it("Enter submits the same body; error announced and linked; focus kept", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 400,
      json: async () => ({ error: "INVALID_CHARACTER_NAME" }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<GameCharacterNameField value="Jo" onSaved={() => {}} />);
    await user.click(screen.getByRole("button", { name: "modifier le perso in-game" }));
    const alert = screen.getByRole("alert");
    await user.keyboard("{Enter}");
    await waitFor(() => expect(alert).toHaveTextContent(/Nom invalide/));
    const input = screen.getByRole("textbox", { name: "Perso in-game :" });
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(fetchMock).toHaveBeenCalledWith("/api/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameCharacterName: "Jo" }),
    });
  });
});
