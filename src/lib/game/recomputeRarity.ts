import { prisma } from "@/lib/prisma";
import {
  dataBonus,
  forcedRarityFor,
  forcedSkillRarity,
  RARITY_SHARES_WITHOUT_MYTHIC,
  scoreAndRankCards,
  scoreAndRankCardsByFamily,
  type ScoredCard,
} from "@/lib/game/rarity";

/**
 * Recompute every card's score and rarity from the stored wiki data
 * (backlinks, page length, traits) - used by the wiki sync, the dev seed, the
 * admin "Recompute rarities" button and `npm run rarity:recompute`, so rarity
 * rules live in exactly one place.
 *
 * Weapons are ranked among themselves by popularity only, from Common to
 * Legendary (no "unique item" bonus, no Mythic - an admin picks Mythic weapons
 * by hand). Admin-locked cards keep their hand-set rarity.
 */
export async function recomputeRarity(log: (message: string) => void = console.log): Promise<number> {
  log("Recomputing rarity...");
  const cards = await prisma.card.findMany({ include: { wikiPage: true } });

  const regular = cards
    .filter((c) => c.family !== "WEAPON")
    .map((card) => {
      const attrs = card.attributes as Record<string, unknown>;

      if (card.family === "SKILL") {
        return {
          id: card.id,
          family: card.family,
          backlinks: 0,
          wikitextLength: 0,
          bonus: 0,
          forcedRarity: forcedSkillRarity({
            isElite: Boolean(attrs.isElite),
            isPveOnly: Boolean(attrs.isPveOnly),
            campaign: card.campaign,
          }),
        };
      }

      const traits = {
        isElite: Boolean(attrs.isElite),
        isBoss: Boolean(attrs.isBoss),
        isUniqueGreenItem: Boolean(attrs.isUnique),
        isMajorLoreCharacter: Boolean(attrs.isMajorLoreCharacter),
      };
      return {
        id: card.id,
        family: card.family,
        backlinks: card.wikiPage.backlinks,
        wikitextLength: card.wikiPage.contentLength,
        bonus: dataBonus(traits),
        forcedRarity: forcedRarityFor(traits),
      };
    });

  const weapons = cards
    .filter((c) => c.family === "WEAPON")
    .map((card) => ({
      id: card.id,
      backlinks: card.wikiPage.backlinks,
      wikitextLength: card.wikiPage.contentLength,
      bonus: 0,
    }));

  const scored: ScoredCard[] = [
    ...scoreAndRankCardsByFamily(regular),
    ...scoreAndRankCards(weapons, RARITY_SHARES_WITHOUT_MYTHIC),
  ];

  for (const s of scored) {
    // Admin-locked cards keep their hand-set rarity (score still refreshes).
    await prisma.card.updateMany({ where: { id: s.id, rarityLocked: false }, data: { score: s.score, rarity: s.rarity } });
    await prisma.card.updateMany({ where: { id: s.id, rarityLocked: true }, data: { score: s.score } });
  }

  log(`Rarity updated for ${scored.length} cards.`);
  return scored.length;
}
