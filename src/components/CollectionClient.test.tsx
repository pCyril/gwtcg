import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { CollectionClient } from "./CollectionClient";
import { AXE_PAGE_OPTIONS, NoopIntersectionObserver, makeCard, routeFetch } from "@/test/l4-fixtures";

let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/collection",
  useSearchParams: () => new URLSearchParams(search),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
// The detail modal is out of scope here: a marker is enough to know it was opened.
vi.mock("@/components/CardDetailModal", () => ({
  CardDetailModal: ({ card }: { card: { title: string } }) => <div data-testid="modal">{card.title}</div>,
}));

let cards = [makeCard(1), makeCard(2)];

beforeEach(() => {
  search = "";
  cards = [makeCard(1), makeCard(2)];
  vi.stubGlobal("IntersectionObserver", NoopIntersectionObserver);
  vi.stubGlobal(
    "fetch",
    vi.fn(
      routeFetch({
        "/api/config": {},
        "/api/collection": () => ({
          cards,
          progress: { uniqueOwned: 2, corpusSize: 10, percent: 20 },
          pseudo: "A",
          hasMore: false,
        }),
      }),
    ),
  );
});

describe("CollectionClient", () => {
  it("renders the grid as a list whose items hold a real button beside the card's own link (8.2, 9.3)", async () => {
    const { container } = render(<CollectionClient />);
    const button = await screen.findByRole("button", { name: "Voir Card 1 en 3D" });
    const grid = screen.getAllByRole("list").find((l) => l.className.includes("grid"))!;
    const items = within(grid).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    // The wiki link is not inside the button.
    const wiki = within(items[0]).getByRole("link", { name: "wiki (GFDL)" });
    expect(button.contains(wiki)).toBe(false);
    expect(container.querySelector("[role=button]")).toBeNull();
    expect(await axe(container, AXE_PAGE_OPTIONS)).toHaveNoViolations();
  });

  it("Enter on the wiki link does not open the detail modal; the tile button does (7.3)", async () => {
    const user = userEvent.setup();
    render(<CollectionClient />);
    const button = await screen.findByRole("button", { name: "Voir Card 1 en 3D" });
    const wiki = within(button.closest("li")!).getByRole("link", { name: "wiki (GFDL)" });
    wiki.focus();
    await user.keyboard("{Enter}");
    expect(screen.queryByTestId("modal")).toBeNull();
    button.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByTestId("modal")).toHaveTextContent("Card 1");
  });

  it("labels the three filter lists (11.1)", async () => {
    render(<CollectionClient />);
    await screen.findByRole("button", { name: "Voir Card 1 en 3D" });
    expect(screen.getByRole("combobox", { name: "Famille" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Rareté" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Tri" })).toBeInTheDocument();
  });

  it("exposes the profession filter state with aria-pressed (7.1, 3.1)", async () => {
    search = "family=SKILL&professions=Monk";
    render(<CollectionClient />);
    await screen.findByRole("button", { name: "Voir Card 1 en 3D" });
    const group = screen.getByRole("group", { name: "Filtrer par profession :" });
    expect(within(group).getByRole("button", { name: "Monk" })).toHaveAttribute("aria-pressed", "true");
    expect(within(group).getByRole("button", { name: "Warrior" })).toHaveAttribute("aria-pressed", "false");
    await userEvent.setup().click(within(group).getByRole("button", { name: "Warrior" }));
    expect(within(group).getByRole("button", { name: "Warrior" })).toHaveAttribute("aria-pressed", "true");
  });

  it("exposes the selection state in discard mode and announces the counter (7.1, 3.1, 7.5)", async () => {
    const user = userEvent.setup();
    render(<CollectionClient />);
    await screen.findByRole("button", { name: "Voir Card 1 en 3D" });
    await user.click(screen.getByRole("button", { name: "Défausser des cartes" }));
    const tile = screen.getByRole("button", { name: "Sélectionner Card 1" });
    expect(tile).toHaveAttribute("aria-pressed", "false");
    const counter = screen.getByText("0 carte(s) sélectionnée(s)");
    expect(counter).toHaveAttribute("role", "status");
    tile.focus();
    await user.keyboard(" ");
    expect(tile).toHaveAttribute("aria-pressed", "true");
    expect(counter).toHaveTextContent("1 carte(s) sélectionnée(s)");
    // The error region exists (empty) before any error is written into it.
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
  });

  it("writes the empty-result message into a status region that was already present (7.5)", async () => {
    cards = [];
    render(<CollectionClient />);
    const regions = screen.getAllByRole("status");
    const region = regions.find((r) => r.textContent?.includes("Chargement"))!;
    expect(region).toBeDefined();
    await waitFor(() => expect(region).toHaveTextContent(/Aucune carte ne correspond/));
  });
});
