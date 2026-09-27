/**
 * One-off migration for the weapon color-variant redesign.
 *
 * Before: one Card row per weapon wiki page (variantKey="DEFAULT"), rarity
 * either forced LEGENDARY (unique/green) or percentile-scored (skins).
 * After:  unique weapons stay one row (variantKey="DEFAULT", still upserted
 * in place by the new sync - nothing to do for those). Non-unique skins now
 * get 4 fresh rows (variantKey WHITE/BLUE/PURPLE/GOLD), created *alongside*
 * the old DEFAULT-keyed row rather than replacing it, since the two aren't
 * the same upsert key. This script repoints any CardInstance/etc. still
 * pointing at an old orphaned skin row to its closest new equivalent (by the
 * old row's last-known rarity, falling back to GOLD for anything that had
 * drifted to Legendary/Mythic under the old percentile scoring), then
 * deletes the orphan.
 *
 * Run once, after a fresh `sync-wiki.ts --only=weapons` with the new code.
 */
import { prisma } from "@/lib/prisma";

const RARITY_TO_VARIANT: Record<string, string> = {
  COMMON: "WHITE",
  UNCOMMON: "BLUE",
  RARE: "PURPLE",
  EPIC: "GOLD",
  // Old percentile scoring could push a non-unique skin to Legendary/Mythic -
  // there's no such color in-game, so fold it into the best real tier, Gold.
  LEGENDARY: "GOLD",
  MYTHIC: "GOLD",
};

async function main() {
  const orphans = await prisma.card.findMany({
    where: { family: "WEAPON", variantKey: "DEFAULT" },
  });
  const nonUniqueOrphans = orphans.filter((c) => !(c.attributes as Record<string, unknown>).isUnique);

  console.log(`Found ${orphans.length} DEFAULT-keyed weapon rows, ${nonUniqueOrphans.length} of them non-unique orphans to migrate.`);

  let repointed = 0;
  let deleted = 0;
  let unresolved = 0;

  for (const old of nonUniqueOrphans) {
    const targetVariant = RARITY_TO_VARIANT[old.rarity] ?? "WHITE";
    const replacement = await prisma.card.findFirst({
      where: { wikiPageId: old.wikiPageId, variantKey: targetVariant },
    });

    if (!replacement) {
      console.warn(`  ! No replacement found for old card ${old.id} (wikiPageId=${old.wikiPageId}, wanted ${targetVariant}) - leaving it in place.`);
      unresolved += 1;
      continue;
    }

    const result = await prisma.cardInstance.updateMany({
      where: { cardId: old.id },
      data: { cardId: replacement.id },
    });
    repointed += result.count;

    await prisma.card.delete({ where: { id: old.id } });
    deleted += 1;
  }

  console.log(`Repointed ${repointed} owned card instance(s), deleted ${deleted} orphaned card row(s), ${unresolved} left unresolved.`);

  const stillOrphaned = await prisma.card.count({
    where: { family: "WEAPON", variantKey: "DEFAULT", attributes: { path: ["isUnique"], equals: false } },
  });
  console.log(`Remaining non-unique DEFAULT-keyed weapon rows: ${stillOrphaned} (should equal "unresolved" above).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
