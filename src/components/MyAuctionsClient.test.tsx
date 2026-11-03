import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { axe } from "vitest-axe";
import { LocaleProvider } from "@/lib/i18n/LocaleContext";
import { MyAuctionsClient } from "./MyAuctionsClient";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }), usePathname: () => "/" }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
let marketEnabled: boolean | null = true;
vi.mock("@/lib/useMarketEnabled", () => ({ useMarketEnabled: () => marketEnabled }));

const row = (id: string, cardTitle: string, status = "ACTIVE") => ({
  id,
  status,
  startingPrice: 10,
  endsAt: "2030-01-01T00:00:00.000Z",
  cardTitle,
});

beforeEach(() => {
  marketEnabled = true;
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ selling: [row("a1", "Serpent Axe"), row("a2", "Fiery Bow")], bidOn: [row("a3", "Ruby Maul", "COMPLETED")] }),
        ),
      ),
    ),
  );
});
afterEach(() => vi.unstubAllGlobals());

function renderMine() {
  return render(
    <LocaleProvider initialLocale="fr">
      <MyAuctionsClient />
    </LocaleProvider>,
  );
}

describe("MyAuctionsClient - accessibility", () => {
  it("announces the loading state in a status region (7.5)", () => {
    marketEnabled = null;
    renderMine();
    expect(screen.getByRole("status")).toHaveTextContent("Chargement...");
  });

  it("names the card in each link and lays the rows out as lists (6.1, 9.3)", async () => {
    const { container } = renderMine();
    const lists = await screen.findAllByRole("list");
    expect(lists).toHaveLength(2);
    expect(within(lists[0]).getAllByRole("listitem")).toHaveLength(2);

    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual([
      "Serpent Axe, Mise à prix : 10 ecto, En cours",
      "Fiery Bow, Mise à prix : 10 ecto, En cours",
      "Ruby Maul, Mise à prix : 10 ecto, Terminée",
    ]);
    expect(screen.getByRole("link", { name: /^Serpent Axe/ })).toHaveAttribute("href", "/market/a1");
    expect(await axe(container, { rules: { "color-contrast": { enabled: false } } })).toHaveNoViolations();
  });
});
