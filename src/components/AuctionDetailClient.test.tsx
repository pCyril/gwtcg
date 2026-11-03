import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { LocaleProvider } from "@/lib/i18n/LocaleContext";
import { AuctionDetailClient } from "./AuctionDetailClient";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }), usePathname: () => "/" }));
vi.mock("@/components/CardTile", () => ({
  CardTile: ({ card }: { card: { title: string } }) => <div data-testid="card">{card.title}</div>,
}));

type Detail = Record<string, unknown>;

function makeAuction(over: Detail = {}): Detail {
  return {
    id: "a1",
    status: "ACTIVE",
    isSeller: false,
    isWinningBidder: false,
    sellerPseudo: "Seller",
    sellerCompletedSales: 0,
    sellerFallenThroughHandoffs: 0,
    sellerGameCharacterName: null,
    winnerGameCharacterName: null,
    startingPrice: 10,
    buyoutPrice: 50,
    endsAt: "2030-01-01T00:00:00.000Z",
    card: { rarity: "COMMON", family: "skill", title: "Serpent Axe", extract: "", url: "" },
    bids: [{ pseudo: "Bidder", amount: 12, createdAt: "2026-11-01T00:00:00.000Z" }],
    ...over,
  };
}

function json(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
}

let detail: Detail;
let bidResponse: () => Promise<Response>;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  detail = makeAuction();
  bidResponse = () => json({ boughtOut: false });
  fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (init?.method === "POST") {
      if (url.endsWith("/bid")) return bidResponse();
      return json({ ok: true });
    }
    return json(detail);
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function renderDetail() {
  return render(
    <LocaleProvider initialLocale="fr">
      <AuctionDetailClient auctionId="a1" />
    </LocaleProvider>,
  );
}

const posts = () => fetchMock.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === "POST");

describe("AuctionDetailClient - accessibility", () => {
  it("announces the loading state in a status region (7.5)", () => {
    fetchMock.mockImplementation(() => new Promise(() => {}));
    renderDetail();
    expect(screen.getByRole("status")).toHaveTextContent("Chargement...");
  });

  it("labels the bid field with a visible label and the minimum as description (11.1)", async () => {
    const { container } = renderDetail();
    const input = await screen.findByRole("spinbutton", { name: "Ta mise (ecto)" });
    expect(input).toHaveAccessibleDescription("Minimum : 13 ecto, nombre entier.");
    expect(input).not.toHaveAttribute("placeholder");
    // color-contrast needs a canvas (absent in jsdom); colours are checked in the browser.
    expect(await axe(container, { rules: { "color-contrast": { enabled: false } } })).toHaveNoViolations();
  });

  it("exposes the bid history as a level-2 heading followed by a list (9.1, 9.3)", async () => {
    detail = makeAuction({
      bids: [
        { pseudo: "B2", amount: 14, createdAt: "2026-11-02T00:00:00.000Z" },
        { pseudo: "B1", amount: 12, createdAt: "2026-11-01T00:00:00.000Z" },
      ],
    });
    renderDetail();
    expect(await screen.findByRole("heading", { level: 2, name: "Historique" })).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Historique" });
    expect(list.querySelectorAll("li")).toHaveLength(2);
    expect(list).toHaveTextContent("B2 — 14 ecto");
  });

  it("asks for confirmation before bidding and sends nothing when declined (11.12)", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderDetail();
    await user.type(await screen.findByRole("spinbutton", { name: "Ta mise (ecto)" }), "13");
    await user.click(screen.getByRole("button", { name: "Enchérir" }));
    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining("13 ecto"));
    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining("Serpent Axe"));
    expect(posts()).toHaveLength(0);

    confirmSpy.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Enchérir" }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    const [url, init] = posts()[0];
    expect(url).toBe("/api/auctions/a1/bid");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ amount: 13 });
  });

  it("asks for confirmation before buying out (11.12)", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderDetail();
    await user.click(await screen.findByRole("button", { name: "Achat immédiat (50 ecto)" }));
    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining("50 ecto"));
    expect(posts()).toHaveLength(0);
  });

  it("asks for confirmation before the seller cancels (11.12)", async () => {
    const user = userEvent.setup();
    detail = makeAuction({ isSeller: true, bids: [] });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderDetail();
    await user.click(await screen.findByRole("button", { name: "Annuler l'enchère" }));
    expect(confirmSpy).toHaveBeenCalled();
    expect(posts()).toHaveLength(0);
  });

  it("asks for confirmation before the handoff and the 'buyer never paid' cancellation (11.12)", async () => {
    const user = userEvent.setup();
    detail = makeAuction({ isSeller: true, status: "AWAITING_HANDOFF" });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderDetail();
    await user.click(await screen.findByRole("button", { name: "J'ai reçu mes ectos, transférer la carte" }));
    await user.click(screen.getByRole("button", { name: "L'acheteur n'a pas payé" }));
    expect(confirmSpy).toHaveBeenCalledTimes(2);
    expect(confirmSpy.mock.calls[0][0]).toContain("12 ecto");
    expect(posts()).toHaveLength(0);
  });

  it("keeps focus on the button and announces the error with a suggestion in a pre-existing alert (7.3, 7.5, 11.11)", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    let resolveBid: (r: Response) => void = () => {};
    bidResponse = () => new Promise<Response>((r) => (resolveBid = r));
    renderDetail();
    const input = await screen.findByRole("spinbutton", { name: "Ta mise (ecto)" });
    const alert = screen.getByRole("alert");
    expect(alert).toBeEmptyDOMElement();

    await user.type(input, "13");
    const button = screen.getByRole("button", { name: "Enchérir" });
    await user.click(button);
    // While the request is pending, the button stays focusable (aria-disabled, not disabled).
    await waitFor(() => expect(button).toHaveAttribute("aria-disabled", "true"));
    expect(button).not.toBeDisabled();
    expect(button).toHaveFocus();

    // Someone else bid 13 meanwhile: the refreshed minimum is 14.
    detail = makeAuction({ bids: [{ pseudo: "Other", amount: 13, createdAt: "2026-11-02T00:00:00.000Z" }] });
    resolveBid(new Response(JSON.stringify({ error: "BID_TOO_LOW" }), { status: 400 }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Ta mise doit être supérieure"));
    expect(screen.getByRole("alert")).toBe(alert);
    await waitFor(() => expect(alert).toHaveTextContent("au moins 14 ecto"));
    expect(button).toHaveFocus();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(expect.stringContaining("au moins 14 ecto"));
  });

  it("moves focus to the page heading when the buyout removes the focused button (7.3)", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    bidResponse = () => {
      detail = makeAuction({ status: "AWAITING_HANDOFF", isWinningBidder: true });
      return json({ boughtOut: true });
    };
    renderDetail();
    await user.click(await screen.findByRole("button", { name: "Achat immédiat (50 ecto)" }));
    await waitFor(() => expect(screen.getByRole("heading", { level: 1, name: "Enchère" })).toHaveFocus());
    await waitFor(() => expect(screen.getAllByRole("status").at(-1)).toHaveTextContent("En attente de remise en jeu"));
  });
});
