import { prisma } from "@/lib/prisma";
import { RARITY_TARGET_SHARES, type Rarity } from "@/lib/game/rarity";
import { BOOSTER_WINDOW_MS, DAILY_BOOSTER_LIMIT, STANDARD_BOOSTER_SIZE } from "@/lib/game/booster";

export interface RarityDropRate {
  rarity: Rarity;
  /** Percent chance that one card slot of a booster lands on this rarity. */
  share: number;
  /** Number of distinct cards of this rarity. */
  cards: number;
  /** Percent chance that one card slot is this specific card (share spread evenly over the tier). */
  perCard: number;
}

export interface FamilyDropRate {
  family: string;
  cards: number;
  /** Percent of drawn cards that belong to this family. */
  dropShare: number;
}

export interface DropRates {
  boosterSize: number;
  boostersPerBatch: number;
  refillMinutes: number;
  totalCards: number;
  rarities: RarityDropRate[];
  families: FamilyDropRate[];
}

const FAMILY_ORDER = ["SKILL", "BOSS", "HERO_NPC", "LOCATION", "ITEM", "WEAPON", "LORE"];

/**
 * What a standard booster actually does: a rarity tier is drawn first (per
 * RARITY_TARGET_SHARES), then a card uniformly among that tier's cards, all
 * families together. So a family's drop share is the sum, over rarities, of
 * the tier's share times the family's fraction of that tier. Computed from the
 * live corpus so the page stays true when cards or `RARITY_SHARE_*` change.
 * (Ignores the "at least one uncommon" guarantee, which only matters ~2% of the time.)
 */
export async function getDropRates(): Promise<DropRates> {
  const groups = await prisma.card.groupBy({ by: ["family", "rarity"], _count: { _all: true } });

  const tierCount = new Map<string, number>();
  for (const g of groups) tierCount.set(g.rarity, (tierCount.get(g.rarity) ?? 0) + g._count._all);

  // Ordered most common -> rarest, like the in-game rarity legend.
  const rarities: RarityDropRate[] = [...RARITY_TARGET_SHARES].reverse().map(({ rarity, share }) => {
    const cards = tierCount.get(rarity) ?? 0;
    return { rarity, share: share * 100, cards, perCard: cards ? (share * 100) / cards : 0 };
  });

  const familyCards = new Map<string, number>();
  const familyShare = new Map<string, number>();
  for (const g of groups) {
    familyCards.set(g.family, (familyCards.get(g.family) ?? 0) + g._count._all);
    const tier = tierCount.get(g.rarity) ?? 0;
    const share = RARITY_TARGET_SHARES.find((s) => s.rarity === g.rarity)?.share ?? 0;
    if (tier > 0) familyShare.set(g.family, (familyShare.get(g.family) ?? 0) + (share * g._count._all * 100) / tier);
  }

  const families: FamilyDropRate[] = FAMILY_ORDER.filter((f) => familyCards.has(f)).map((family) => ({
    family,
    cards: familyCards.get(family) ?? 0,
    dropShare: familyShare.get(family) ?? 0,
  }));

  return {
    boosterSize: STANDARD_BOOSTER_SIZE,
    boostersPerBatch: DAILY_BOOSTER_LIMIT,
    refillMinutes: BOOSTER_WINDOW_MS / 60_000,
    totalCards: [...familyCards.values()].reduce((a, b) => a + b, 0),
    rarities,
    families,
  };
}
