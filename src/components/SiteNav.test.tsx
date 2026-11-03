import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { LocaleProvider } from "@/lib/i18n/LocaleContext";
import { SiteNav } from "./SiteNav";

let pathname = "/trade";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => pathname,
}));

function stubApi(me: Record<string, unknown>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => ({
      json: async () => (url === "/api/config" ? { marketEnabled: true } : me),
    })),
  );
}

const ACCOUNT = { isAdmin: false, isGuest: false, pendingTrades: 1, pendingArtSubmissions: 0 };

function renderNav() {
  return render(
    <LocaleProvider initialLocale="fr">
      <SiteNav />
    </LocaleProvider>,
  );
}

beforeEach(() => {
  pathname = "/trade";
  stubApi(ACCOUNT);
});

describe("SiteNav", () => {
  it("9.3: menu links are list items, also inside the Infos popover", async () => {
    const user = userEvent.setup();
    renderNav();
    const nav = screen.getByRole("navigation", { name: "Navigation principale" });
    const desktopList = within(nav).getAllByRole("list")[0];
    const items = within(desktopList).getAllByRole("listitem");
    expect(within(items[0]).getByRole("link", { name: "Ma collection" })).toBeInTheDocument();
    await user.click(within(nav).getByRole("button", { name: "Infos" }));
    const drops = within(nav).getByRole("link", { name: "Comment ça drop ?" });
    expect(drops.closest("li")?.closest("ul")).not.toBeNull();
  });

  it("3.1: the current page link has aria-current=page and a non-colour cue", async () => {
    renderNav();
    const nav = screen.getByRole("navigation", { name: "Navigation principale" });
    const trade = within(nav).getByRole("link", { name: /^Échanges/ });
    expect(trade).toHaveAttribute("aria-current", "page");
    expect(trade.className).toMatch(/\bunderline\b/);
    const collection = within(nav).getByRole("link", { name: "Ma collection" });
    expect(collection).not.toHaveAttribute("aria-current");
    expect(collection.className).not.toMatch(/\bunderline\b/);
  });

  it("3.1: the Infos group button is underlined when one of its pages is current", () => {
    pathname = "/changelog";
    renderNav();
    const button = screen.getByRole("button", { name: "Infos" });
    expect(button.className).toMatch(/\bunderline\b/);
  });

  it("12.8: Escape from a popover link closes it and puts focus back on the toggle", async () => {
    const user = userEvent.setup();
    renderNav();
    const toggle = screen.getByRole("button", { name: "Infos" });
    await user.click(toggle);
    const link = screen.getByRole("link", { name: "Comment ça drop ?" });
    link.focus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("link", { name: "Comment ça drop ?" })).not.toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveFocus();
  });

  it("12.8: the popover closes when keyboard focus leaves it", async () => {
    const user = userEvent.setup();
    renderNav();
    const toggle = screen.getByRole("button", { name: "Infos" });
    await user.click(toggle);
    // Tab through the three links, then out of the group.
    await user.tab();
    await user.tab();
    await user.tab();
    expect(screen.getByRole("link", { name: "Code source (GitHub)" })).toHaveFocus();
    await user.tab();
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "Comment ça drop ?" })).not.toBeInTheDocument();
  });

  it("9.2: the mobile menu panel is inside the main navigation landmark", async () => {
    const user = userEvent.setup();
    renderNav();
    await user.click(await screen.findByRole("button", { name: /^Menu/ }));
    const nav = screen.getByRole("navigation", { name: "Navigation principale" });
    const panel = document.getElementById("site-nav-mobile");
    expect(panel).not.toBeNull();
    expect(nav).toContainElement(panel);
    expect(within(panel!).getAllByRole("link", { name: "Ma collection" })).toHaveLength(1);
    expect(within(panel!).getByRole("button", { name: "Se déconnecter" })).toBeInTheDocument();
  });

  it("10.9: the Menu button states the pending items in text, with a visible count", async () => {
    renderNav();
    const button = await screen.findByRole("button", { name: "Menu, 1 échange(s) en cours" });
    expect(within(button).getByText("1")).toBeInTheDocument();
  });

  it("10.9: no pending wording when nothing is pending", async () => {
    stubApi({ ...ACCOUNT, pendingTrades: 0 });
    renderNav();
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: "Menu" })).toBeInTheDocument();
  });

  it("10.9: admins hear both pending trades and art to review", async () => {
    stubApi({ ...ACCOUNT, isAdmin: true, pendingArtSubmissions: 2 });
    renderNav();
    const button = await screen.findByRole("button", {
      name: "Menu, 1 échange(s) en cours, 2 illustration(s) à modérer",
    });
    expect(within(button).getByText("3")).toBeInTheDocument();
  });

  it("has no axe violations, menu and popover open", async () => {
    const user = userEvent.setup();
    const { container } = renderNav();
    await user.click(await screen.findByRole("button", { name: /^Menu/ }));
    await user.click(screen.getByRole("button", { name: "Infos" }));
    expect(await axe(container)).toHaveNoViolations();
  });
});
