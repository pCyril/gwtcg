import type { CardData } from "@/components/CardTile";

/** Card fixtures for the lot-l4 accessibility regression tests. */
export function makeCard(n: number, extra: Partial<CardData> = {}): CardData {
  return {
    instanceId: `inst-${n}`,
    cardId: `card-${n}`,
    rarity: "RARE",
    family: "SKILL",
    profession: "Ranger",
    campaign: "Prophecies",
    title: `Card ${n}`,
    extract: "Bow Attack. Fast-moving arrow. Deals 10...30 damage.",
    url: `https://wiki.guildwars.com/wiki/Card_${n}`,
    ...extra,
  };
}

/** fetch stub answering by URL prefix; unknown URLs get `{}`. */
export function routeFetch(routes: Record<string, unknown | ((init?: RequestInit) => unknown)>) {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const key = Object.keys(routes)
      .sort((a, b) => b.length - a.length)
      .find((prefix) => url.startsWith(prefix));
    const value = key ? routes[key] : {};
    const body = typeof value === "function" ? (value as (init?: RequestInit) => unknown)(init) : value;
    return new Response(JSON.stringify(body ?? {}), { status: 200, headers: { "Content-Type": "application/json" } });
  };
}

export class NoopIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

/** axe without color-contrast: jsdom has no canvas/layout, contrast is checked in the browser. */
export const AXE_OPTIONS = { rules: { "color-contrast": { enabled: false } } };

/**
 * Page-level clients render CardTile's <h3> under the page <h1> without an <h2>: a heading-outline
 * matter outside lot l4 (not an audited finding here), so heading-order is left to the page audit.
 */
export const AXE_PAGE_OPTIONS = { rules: { ...AXE_OPTIONS.rules, "heading-order": { enabled: false } } };
