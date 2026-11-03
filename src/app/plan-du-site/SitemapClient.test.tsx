import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { axe } from "vitest-axe";
import { LocaleProvider } from "@/lib/i18n/LocaleContext";
import { SitemapClient } from "./SitemapClient";
import { Footer } from "@/components/Footer";

function stubConfig(marketEnabled: boolean) {
  vi.stubGlobal("fetch", vi.fn(async () => ({ json: async () => ({ marketEnabled }) })));
}

const wrap = (ui: React.ReactNode) => render(<LocaleProvider initialLocale="fr">{ui}</LocaleProvider>);

describe("Plan du site (12.1)", () => {
  it("lists every public page in a list, Kamadan included when enabled", async () => {
    stubConfig(true);
    wrap(<SitemapClient />);
    expect(screen.getByRole("heading", { level: 1, name: "Plan du site" })).toBeInTheDocument();
    const main = screen.getByRole("main");
    await screen.findByRole("link", { name: "Kamadan" });
    const hrefs = within(main)
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["/", "/collection", "/trade", "/market", "/market/mine", "/drops", "/changelog", "/contact", "/mentions-legales", "/accessibilite"]);
    expect(screen.getByRole("link", { name: "Mes enchères" }).closest("li")?.parentElement?.closest("li")).not.toBeNull();
  });

  it("leaves the Kamadan out when it is disabled", async () => {
    stubConfig(false);
    wrap(<SitemapClient />);
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByRole("link", { name: "Kamadan" })).not.toBeInTheDocument();
  });

  it("is linked from the footer, present on every page", () => {
    wrap(<Footer />);
    expect(screen.getByRole("link", { name: "Plan du site" })).toHaveAttribute("href", "/plan-du-site");
  });

  it("has no axe violations", async () => {
    stubConfig(true);
    const { container } = wrap(<SitemapClient />);
    await screen.findByRole("link", { name: "Kamadan" });
    expect(await axe(container)).toHaveNoViolations();
  });
});
