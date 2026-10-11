/**
 * Recompute every card's rarity from the wiki data already in the database
 * (no network access needed) - run it after changing rarity rules:
 *
 *   npm run rarity:recompute
 */
import { prisma } from "@/lib/prisma";
import { recomputeRarity } from "@/lib/game/recomputeRarity";

recomputeRarity()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
