import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { TradeDetailClient } from "./TradeDetailClient";
import { AXE_PAGE_OPTIONS, makeCard } from "@/test/l4-fixtures";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/trade/t1",
}));

type Status = "PENDING" | "ACCEPTED";
let tradeStatus: Status;
let confirmResponse: () => Promise<{ status: number; body: unknown }>;
let myCards: ReturnType<typeof makeCard>[];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

beforeEach(() => {
  tradeStatus = "PENDING";
  myCards = [makeCard(1), makeCard(3)];
  confirmResponse = async () => ({ status: 200, body: {} });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/trade/t1")
        return json({
          id: "t1",
          status: tradeStatus,
          isInitiator: true,
          initiator: { pseudo: "A", confirmed: false, cards: [makeCard(1), makeCard(2)] },
          recipient: { pseudo: "B", confirmed: false, cards: [] },
        });
      if (url === "/api/trade/t1/confirm") {
        const r = await confirmResponse();
        return json(r.body, r.status);
      }
      if (url.startsWith("/api/trade/t1/")) return json({});
      if (url.startsWith("/api/collection/shared/")) return json({ cards: [makeCard(7)], hasMore: false });
      if (url.startsWith("/api/collection?")) return json({ cards: myCards, hasMore: false });
      return json({});
    }),
  );
});

async function renderReady() {
  const utils = render(<TradeDetailClient tradeId="t1" />);
  await screen.findByRole("button", { name: "Ajouter Card 1 à mon offre" });
  await screen.findByRole("button", { name: "Demander Card 7" });
  return utils;
}

describe("TradeDetailClient", () => {
  it("gives the two search fields distinct visible labels (11.1)", async () => {
    await renderReady();
    expect(screen.getByRole("searchbox", { name: "Rechercher dans ma collection" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Rechercher parmi les cartes de B" })).toBeInTheDocument();
  });

  it("renders pickers as lists of toggle buttons beside the cards, with their state (8.2, 7.1, 9.3)", async () => {
    const { container } = await renderReady();
    expect(container.querySelector("[role=button]")).toBeNull();
    const offerCard1 = screen.getByRole("button", { name: "Ajouter Card 1 à mon offre" });
    expect(offerCard1).toHaveAttribute("aria-pressed", "true");
    const offerCard3 = screen.getByRole("button", { name: "Ajouter Card 3 à mon offre" });
    expect(offerCard3).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Demander Card 7" })).toHaveAttribute("aria-pressed", "false");
    // The card's wiki link is a sibling of the toggle, not a descendant.
    const wiki = within(offerCard3.closest("li")!).getByRole("link", { name: "wiki (GFDL)" });
    expect(offerCard3.contains(wiki)).toBe(false);
    // Grids are lists: my offer (2), my picker (2), their picker (1).
    const lists = screen.getAllByRole("list");
    expect(lists.map((l) => within(l).getAllByRole("listitem").length)).toEqual([2, 2, 1]);
    expect(await axe(container, AXE_PAGE_OPTIONS)).toHaveNoViolations();
  });

  it("Enter on a nested wiki link does not toggle the card; the toggle button does (7.3, 7.1)", async () => {
    const user = userEvent.setup();
    await renderReady();
    const toggle = screen.getByRole("button", { name: "Ajouter Card 3 à mon offre" });
    within(toggle.closest("li")!).getByRole("link", { name: "wiki (GFDL)" }).focus();
    await user.keyboard("{Enter}");
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    toggle.focus();
    await user.keyboard("{Enter}");
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("3/7 cartes sélectionnées", { exact: false }).closest("[role=status]")).not.toBeNull();
  });

  it("moves focus to the next remove button, then to the search field, after removing cards (7.3)", async () => {
    const user = userEvent.setup();
    await renderReady();
    await user.click(screen.getByRole("button", { name: "Retirer Card 1 de l'offre" }));
    expect(screen.getByRole("button", { name: "Retirer Card 2 de l'offre" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("searchbox", { name: "Rechercher dans ma collection" })).toHaveFocus();
  });

  it("keeps focus on Confirm while the request runs and announces the error (7.3, 7.5)", async () => {
    const user = userEvent.setup();
    let release!: () => void;
    confirmResponse = () =>
      new Promise((resolve) => {
        release = () => resolve({ status: 409, body: { error: "TRADE_NOT_PENDING" } });
      });
    await renderReady();
    const alert = screen.getByRole("alert");
    expect(alert).toBeEmptyDOMElement();
    const confirm = screen.getByRole("button", { name: "Confirmer l'échange" });
    confirm.focus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(confirm).toHaveAttribute("aria-disabled", "true"));
    expect(confirm).toHaveFocus();
    await act(async () => release());
    await waitFor(() => expect(alert).toHaveTextContent("Cet échange n'est plus modifiable."));
    expect(confirm).toHaveFocus();
    expect(confirm).not.toHaveAttribute("aria-disabled");
  });

  it("focuses the outcome message once the trade is settled (7.3)", async () => {
    const user = userEvent.setup();
    confirmResponse = async () => {
      tradeStatus = "ACCEPTED";
      return { status: 200, body: {} };
    };
    await renderReady();
    await user.click(screen.getByRole("button", { name: "Confirmer l'échange" }));
    await waitFor(() => expect(screen.getByText(/Échange conclu/)).toHaveFocus());
  });

  it("announces 'no results' through a status region present beforehand (7.5)", async () => {
    myCards = [];
    render(<TradeDetailClient tradeId="t1" />);
    await screen.findByRole("button", { name: "Demander Card 7" });
    await waitFor(() =>
      expect(screen.getAllByRole("status").some((r) => r.textContent === "Aucune carte ne correspond.")).toBe(true),
    );
  });

  it("shows the initial loading state in a status region (7.5)", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    render(<TradeDetailClient tradeId="t1" />);
    expect(screen.getByRole("status")).toHaveTextContent("Chargement...");
  });
});
