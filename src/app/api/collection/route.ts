import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getImageCreditsByWikiPage } from "@/lib/game/artSubmission";
import type { CardFamily, Rarity } from "@prisma/client";

// Matches the fixed family/rarity option order shown in the collection filters,
// so sorting by either reads as grouped tiers rather than arbitrary/alphabetical.
const FAMILY_ORDER: CardFamily[] = ["SKILL", "BOSS", "HERO_NPC", "LOCATION", "ITEM", "WEAPON", "LORE"];
const RARITY_ORDER: Rarity[] = ["MYTHIC", "LEGENDARY", "EPIC", "RARE", "UNCOMMON", "COMMON"];

export async function GET(request: Request) {
  const user = await getOrCreateUser();
  const { searchParams } = new URL(request.url);

  const family = searchParams.get("family") as CardFamily | null;
  const rarity = searchParams.get("rarity") as Rarity | null;
  const campaign = searchParams.get("campaign");
  const profession = searchParams.get("profession");
  const sort = searchParams.get("sort");

  const [instances, corpusSize] = await Promise.all([
    prisma.cardInstance.findMany({
      where: {
        ownerId: user.id,
        discardedAt: null,
        card: {
          ...(family ? { family } : {}),
          ...(rarity ? { rarity } : {}),
          ...(campaign ? { campaign } : {}),
          ...(profession ? { profession } : {}),
        },
      },
      include: { card: { include: { wikiPage: true } } },
      orderBy: { obtainedAt: "desc" },
    }),
    prisma.card.count(),
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

  return NextResponse.json({
    cards: instances.map((instance) => ({
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
  });
}
