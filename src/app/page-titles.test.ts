import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Metadata } from "next";

// RGAA 8.6: every page except home has its own localized title; the root layout appends " - GWTCG".
let cookieLocale: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name === "gm_locale" && cookieLocale ? { value: cookieLocale } : undefined) }),
  headers: async () => new Headers({ host: "example.test" }),
}));
vi.mock("next/font/google", () => ({ Geist: () => ({ variable: "" }), Geist_Mono: () => ({ variable: "" }) }));
vi.mock("@/lib/game/dropRates", () => ({ getDropRates: vi.fn() }));
vi.mock("@/lib/game/cardShare", () => ({
  getSharedCard: async (id: string) =>
    id === "known" ? { title: "Platinum Scepter", extract: "A scepter.", imageUrls: [] } : null,
}));

const params = <T,>(p: T) => ({ params: Promise.resolve(p), searchParams: Promise.resolve({}) });

type Gen = (props: never) => Promise<Metadata>;
const PAGES: [string, () => Promise<{ generateMetadata: Gen }>, unknown, string, string][] = [
  ["/collection", () => import("./collection/page"), undefined, "Mon classeur", "My binder"],
  ["/collection/[pseudo]", () => import("./collection/[pseudo]/page"), { pseudo: "Bob" }, "Collection de Bob", "Bob's collection"],
  ["/market", () => import("./market/page"), undefined, "Le Kamadan", "The Kamadan"],
  ["/market/[id]", () => import("./market/[id]/page"), { id: "1" }, "Enchère", "Auction"],
  ["/market/mine", () => import("./market/mine/page"), undefined, "Mes enchères", "My auctions"],
  ["/market/sell/[instanceId]", () => import("./market/sell/[instanceId]/page"), { instanceId: "1" }, "Mettre aux enchères", "Put up for auction"],
  ["/trade", () => import("./trade/page"), undefined, "Échanges", "Trades"],
  ["/trade/[id]", () => import("./trade/[id]/page"), { id: "1" }, "Détail de l'échange", "Trade details"],
  ["/drops", () => import("./drops/page"), undefined, "Comment fonctionnent les drops ?", "How do drops work?"],
  ["/changelog", () => import("./changelog/page"), undefined, "Journal des mises à jour", "Changelog"],
  ["/admin/art", () => import("./admin/art/page"), undefined, "Modération des illustrations", "Illustration moderation"],
  ["/admin/stats", () => import("./admin/stats/page"), undefined, "Statistiques", "Stats"],
  ["/plan-du-site", () => import("./plan-du-site/page"), undefined, "Plan du site", "Sitemap"],
  ["/card/[cardId]", () => import("./card/[cardId]/page"), { cardId: "known" }, "Platinum Scepter", "Platinum Scepter"],
];

beforeEach(() => {
  cookieLocale = undefined;
});

describe("page titles (8.6)", () => {
  it("root layout: site name by default, ' - GWTCG' template for the pages", async () => {
    const { metadata } = await import("./layout");
    expect(metadata.title).toEqual({ default: "GWTCG", template: "%s - GWTCG" });
  });

  it.each(PAGES)("%s has its own title, in French by default and in English with the cookie", async (_route, load, p, fr, en) => {
    const { generateMetadata } = await load();
    const props = (p ? params(p) : undefined) as never;
    expect((await generateMetadata(props)).title).toBe(fr);
    cookieLocale = "en";
    expect((await generateMetadata(props)).title).toBe(en);
  });

  it("titles are unique across pages", () => {
    const fr = PAGES.map((row) => row[3]);
    expect(new Set(fr).size).toBe(fr.length);
  });

  it("unknown card: not-found title", async () => {
    const { generateMetadata } = await import("./card/[cardId]/page");
    expect((await generateMetadata(params({ cardId: "nope" }) as never)).title).toBe("Page introuvable");
  });
});
