import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { SharedCollectionClient } from "./SharedCollectionClient";
import { AXE_PAGE_OPTIONS, NoopIntersectionObserver, makeCard, routeFetch } from "@/test/l4-fixtures";

let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/collection/B",
  useSearchParams: () => new URLSearchParams(search),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
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
        "/api/me": {},
        "/api/collection/shared/": () => ({
          cards,
          progress: { uniqueOwned: 2, corpusSize: 10, percent: 20 },
          hasMore: false,
        }),
      }),
    ),
  );
});

describe("SharedCollectionClient", () => {
  it("renders a list of tiles with a real button beside the card's own link (8.2, 9.3, 7.3)", async () => {
    const user = userEvent.setup();
    const { container } = render(<SharedCollectionClient pseudo="B" />);
    const button = await screen.findByRole("button", { name: "Voir Card 1 en 3D" });
    const grid = screen.getAllByRole("list").find((l) => l.className.includes("grid"))!;
    expect(within(grid).getAllByRole("listitem")).toHaveLength(2);
    expect(container.querySelector("[role=button]")).toBeNull();
    const wiki = within(button.closest("li")!).getByRole("link", { name: "wiki (GFDL)" });
    expect(button.contains(wiki)).toBe(false);
    wiki.focus();
    await user.keyboard("{Enter}");
    expect(screen.queryByTestId("modal")).toBeNull();
    button.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByTestId("modal")).toHaveTextContent("Card 1");
    expect(await axe(container, AXE_PAGE_OPTIONS)).toHaveNoViolations();
  });

  it("labels the filter lists and exposes the profession state (11.1, 7.1, 3.1)", async () => {
    search = "family=SKILL&professions=Monk";
    render(<SharedCollectionClient pseudo="B" />);
    await screen.findByRole("button", { name: "Voir Card 1 en 3D" });
    expect(screen.getByRole("combobox", { name: "Famille" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Rareté" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Tri" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Monk" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Dervish" })).toHaveAttribute("aria-pressed", "false");
  });

  it("announces the empty result through a status region present beforehand (7.5)", async () => {
    cards = [];
    render(<SharedCollectionClient pseudo="B" />);
    const region = screen.getAllByRole("status").find((r) => r.textContent?.includes("Chargement"))!;
    expect(region).toBeDefined();
    await waitFor(() => expect(region).toHaveTextContent(/Aucune carte ne correspond/));
  });
});
