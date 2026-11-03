import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import { axe } from "vitest-axe";
import { MarketClient } from "./MarketClient";
import { AXE_PAGE_OPTIONS, makeCard, routeFetch } from "@/test/l4-fixtures";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/market",
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children?: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const auction = {
  id: "auc1",
  sellerPseudo: "Seller",
  sellerCompletedSales: 0,
  sellerFallenThroughHandoffs: 0,
  startingPrice: 10,
  buyoutPrice: null,
  topBid: null,
  endsAt: new Date(Date.now() + 3_600_000 * 5).toISOString(),
  card: makeCard(1, { title: "Serpent Axe" }),
};

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(routeFetch({ "/api/config": { marketEnabled: true }, "/api/auctions": { auctions: [auction] } })));
});

describe("MarketClient", () => {
  it("shows the loading state in a status region (7.5)", () => {
    render(<MarketClient />);
    expect(screen.getByRole("status")).toHaveTextContent("Chargement...");
  });

  it("lists auctions without nesting the card's wiki link in the auction link (8.2, 9.3)", async () => {
    const { container } = render(<MarketClient />);
    const link = await screen.findByRole("link", { name: "Enchère : Serpent Axe" });
    expect(link).toHaveAttribute("href", "/market/auc1");
    expect(container.querySelector("a a")).toBeNull();
    const list = screen.getByRole("list");
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(1);
    expect(within(items[0]).getByRole("link", { name: "wiki (GFDL)" })).toBeInTheDocument();
    expect(await axe(container, AXE_PAGE_OPTIONS)).toHaveNoViolations();
  });

  it("writes the empty message into a status region present before the data arrived (7.5)", async () => {
    vi.stubGlobal("fetch", vi.fn(routeFetch({ "/api/config": { marketEnabled: true }, "/api/auctions": { auctions: [] } })));
    render(<MarketClient />);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Aucune enchère active"));
  });
});
