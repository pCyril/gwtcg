import { prisma } from "@/lib/prisma";
import { getImageCreditsByWikiPage } from "@/lib/game/artSubmission";
import type { CardFamily, Rarity } from "@prisma/client";

// Matches the fixed family/rarity option order shown in the collection filters,
// so sorting by either reads as grouped tiers rather than arbitrary/alphabetical.
const FAMILY_ORDER: CardFamily[] = ["SKILL", "BOSS", "HERO_NPC", "LOCATION", "ITEM", "WEAPON", "LORE"];
const RARITY_ORDER: Rarity[] = ["MYTHIC", "LEGENDARY", "EPIC", "RARE", "UNCOMMON", "COMMON"];

// Infinite scroll is cumulative, not offset-based: `page` means "how many
// pages' worth are visible so far", and each request re-returns everything
// from the top through that page - simpler and race-free (a scroll-triggered
// bump just replaces the list with a superset) at the cost of re-sending
// already-seen cards on every load-more, which is fine at this scale.
export const COLLECTION_PAGE_SIZE = 100;

export interface CollectionQueryOptions {
  family: CardFamily | null;
  rarity: Rarity | null;
  campaign: string | null;
  professions: string[];
  sort: string | null;
  page: number;
}

export function parseCollectionQuery(searchParams: URLSearchParams): CollectionQueryOptions {
  const page = Number(searchParams.get("page"));
  return {
    family: searchParams.get("family") as CardFamily | null,
    rarity: searchParams.get("rarity") as Rarity | null,
    campaign: searchParams.get("campaign"),
    professions: searchParams.get("professions")?.split(",").filter(Boolean) ?? [],
    sort: searchParams.get("sort"),
    page: Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1,
  };
}

/**
 * Shared by the owner's own /api/collection and the public, read-only
 * /api/collection/[pseudo] - same filters, sort and per-card grouping either
 * way, just scoped to whichever userId is asked for.
 */
export async function queryCollection(userId: string, options: CollectionQueryOptions) {
  const { family, rarity, campaign, professions, sort, page } = options;

  const cardWhere = {
    ...(family ? { family } : {}),
    ...(rarity ? { rarity } : {}),
    ...(campaign ? { campaign } : {}),
    ...(professions.length ? { profession: { in: professions } } : {}),
  };

  const [instances, corpusSize] = await Promise.all([
    prisma.cardInstance.findMany({
      where: {
        ownerId: userId,
        discardedAt: null,
        card: cardWhere,
      },
      include: { card: { include: { wikiPage: true } } },
      orderBy: { obtainedAt: "desc" },
    }),
    prisma.card.count({ where: cardWhere }),
  ]);

  const uniqueOwned = new Set(instances.map((i) => i.cardId)).size;
  const credits = await getImageCreditsByWikiPage(instances.map((i) => i.card.wikiPageId));

  const copyCounts = new Map<string, number>();
  for (const instance of instances) {
    copyCounts.set(instance.cardId, (copyCounts.get(instance.cardId) ?? 0) + 1);
  }

  // Stable sort (ties keep the obtainedAt-desc order above) - "copies" also
  // breaks ties on cardId so a card's several instances cluster together
  // instead of scattering wherever they were each individually obtained.
  if (sort === "family") {
    instances.sort((a, b) => FAMILY_ORDER.indexOf(a.card.family) - FAMILY_ORDER.indexOf(b.card.family));
  } else if (sort === "rarity") {
    instances.sort((a, b) => RARITY_ORDER.indexOf(a.card.rarity) - RARITY_ORDER.indexOf(b.card.rarity));
  } else if (sort === "copies") {
    instances.sort((a, b) => {
      const diff = (copyCounts.get(b.cardId) ?? 1) - (copyCounts.get(a.cardId) ?? 1);
      if (diff !== 0) return diff;
      return a.cardId === b.cardId ? 0 : a.cardId < b.cardId ? -1 : 1;
    });
  }

  // One tile per unique card - keeps whichever instance sorted first as the
  // representative (its instanceId is what card-detail actions like discard
  // or "sell one" act on); the "copies" badge still reflects the full count.
  const seenCardIds = new Set<string>();
  const uniqueInstances = instances.filter((instance) => {
    if (seenCardIds.has(instance.cardId)) return false;
    seenCardIds.add(instance.cardId);
    return true;
  });

  const visibleCount = Math.min(uniqueInstances.length, page * COLLECTION_PAGE_SIZE);
  const visibleInstances = uniqueInstances.slice(0, visibleCount);

  return {
    cards: visibleInstances.map((instance) => ({
      instanceId: instance.id,
      wikiPageId: instance.card.wikiPageId,
      obtainedAt: instance.obtainedAt,
      rarity: instance.card.rarity,
      family: instance.card.family,
      campaign: instance.card.campaign,
      profession: instance.card.profession,
      title: instance.card.wikiPage.title,
      extract: instance.card.wikiPage.extract,
      url: instance.card.wikiPage.url,
      imageUrls: instance.card.wikiPage.imageUrls,
      imageCredits: credits.get(instance.card.wikiPageId) ?? {},
      attributes: instance.card.attributes,
      copies: copyCounts.get(instance.cardId) ?? 1,
    })),
    progress: {
      uniqueOwned,
      corpusSize,
      percent: corpusSize === 0 ? 0 : Math.round((uniqueOwned / corpusSize) * 1000) / 10,
    },
    hasMore: visibleCount < uniqueInstances.length,
  };
}
