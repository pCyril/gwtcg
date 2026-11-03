import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { ExchangeDialog } from "./ExchangeDialog";
import { AXE_OPTIONS, makeCard } from "@/test/l4-fixtures";

const given = [
  { cardId: "a", title: "Card A", count: 6, instanceIds: ["a1", "a2", "a3", "a4", "a5", "a6"] },
  { cardId: "b", title: "Card B", count: 4, instanceIds: ["b1", "b2", "b3", "b4"] },
];

function overview(remainingToday = 5) {
  return {
    cost: 10,
    dailyLimit: 5,
    remainingToday,
    rarities: [
      { rarity: "COMMON", spares: 12, undiscovered: 40, given },
      { rarity: "RARE", spares: 3, undiscovered: 20, given: null },
      { rarity: "MYTHIC", spares: 11, undiscovered: 0, given },
    ],
  };
}

let state = overview();
let postBody: unknown = null;
let postResponse: { status: number; body: unknown } = { status: 200, body: {} };

beforeEach(() => {
  state = overview();
  postBody = null;
  postResponse = { status: 200, body: { card: makeCard(9, { title: "Shiny", rarity: "COMMON", isNew: true }), remainingToday: 4 } };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        postBody = JSON.parse(String(init.body));
        if (postResponse.status === 200) state = overview(4);
        return new Response(JSON.stringify(postResponse.body), { status: postResponse.status });
      }
      return new Response(JSON.stringify(state), { status: 200 });
    }),
  );
});

describe("ExchangeDialog", () => {
  it("is a named modal dialog listing each rarity, with the remaining exchanges", async () => {
    const { container } = render(<ExchangeDialog onClose={vi.fn()} onExchanged={vi.fn()} />);
    const dialog = screen.getByRole("dialog", { name: "Échanger des doublons" });
    expect(await within(dialog).findByText(/Échanges restants aujourd'hui : 5 sur 5/)).toBeInTheDocument();
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations();
  });

  it("explains why a rarity can't be exchanged, and keeps the button focusable", async () => {
    const user = userEvent.setup();
    render(<ExchangeDialog onClose={vi.fn()} onExchanged={vi.fn()} />);
    const rare = await screen.findByRole("button", { name: "Échanger 10 doublons (Rare)" });
    expect(rare).toHaveAttribute("aria-disabled", "true");
    expect(rare).toHaveAccessibleDescription("Il te faut au moins 10 doublons de cette rareté.");
    const mythic = screen.getByRole("button", { name: "Échanger 10 doublons (Mythique)" });
    expect(mythic).toHaveAccessibleDescription("Tu as déjà toutes les cartes de cette rareté.");
    await user.click(rare);
    expect(screen.queryByRole("button", { name: "Confirmer l'échange" })).toBeNull();
  });

  it("reviews the duplicates given, then shows and announces the card received", async () => {
    const user = userEvent.setup();
    const onExchanged = vi.fn();
    render(<ExchangeDialog onClose={vi.fn()} onExchanged={onExchanged} />);
    await user.click(await screen.findByRole("button", { name: "Échanger 10 doublons (Commune)" }));
    const heading = screen.getByRole("heading", { name: /Tu vas donner ces 10 doublons \(Commune\)/ });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(screen.getByText("Card A ×6")).toBeInTheDocument();
    expect(screen.getByText("Card B ×4")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirmer l'échange" }));
    const result = await screen.findByRole("heading", { name: "Nouvelle carte : Shiny !" });
    await waitFor(() => expect(result).toHaveFocus());
    expect(postBody).toEqual({ rarity: "COMMON", cardInstanceIds: [...given[0].instanceIds, ...given[1].instanceIds] });
    expect(onExchanged).toHaveBeenCalledOnce();
    expect(screen.getAllByRole("status").some((s) => s.textContent === "Nouvelle carte : Shiny !")).toBe(true);
    expect(await screen.findByText(/Échanges restants aujourd'hui : 4 sur 5/)).toBeInTheDocument();
  });

  it("shows the server error in an alert when the daily limit is hit", async () => {
    const user = userEvent.setup();
    postResponse = { status: 429, body: { error: "DAILY_EXCHANGE_LIMIT" } };
    render(<ExchangeDialog onClose={vi.fn()} onExchanged={vi.fn()} />);
    await user.click(await screen.findByRole("button", { name: "Échanger 10 doublons (Commune)" }));
    await user.click(screen.getByRole("button", { name: "Confirmer l'échange" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("limite de 5 échanges par jour");
  });

  it("disables every exchange once today's limit is used", async () => {
    state = overview(0);
    render(<ExchangeDialog onClose={vi.fn()} onExchanged={vi.fn()} />);
    expect(await screen.findByText("Tu as fait tes 5 échanges du jour. Reviens demain !")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Échanger 10 doublons (Commune)" })).toHaveAttribute("aria-disabled", "true");
  });

  it("closes with the Close button and with Escape (cancel event)", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ExchangeDialog onClose={onClose} onExchanged={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Fermer" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    // Escape raises the dialog's "cancel" event (jsdom doesn't map the key itself).
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
