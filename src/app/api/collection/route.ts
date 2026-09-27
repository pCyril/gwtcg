import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getImageCreditsByWikiPage } from "@/lib/game/artSubmission";
import { displayCardTitle } from "@/lib/game/cardArt";
import type { CardFamily, Rarity } from "@prisma/client";

export async function GET(request: Request) {
  const user = await getOrCreateUser();
  const { searchParams } = new URL(request.url);

  const family = searchParams.get("family") as CardFamily | null;
  const rarity = searchParams.get("rarity") as Rarity | null;
  const campaign = searchParams.get("campaign");
  const profession = searchParams.get("profession");

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

  return NextResponse.json({
    cards: instances.map((instance) => ({
      instanceId: instance.id,
      wikiPageId: instance.card.wikiPageId,
      obtainedAt: instance.obtainedAt,
      rarity: instance.card.rarity,
      family: instance.card.family,
      campaign: instance.card.campaign,
      profession: instance.card.profession,
      title: displayCardTitle(
        instance.card.wikiPage.title,
        instance.card.family,
        instance.card.rarity,
        instance.card.attributes as Record<string, unknown>,
      ),
      extract: instance.card.wikiPage.extract,
      url: instance.card.wikiPage.url,
      imageUrls: instance.card.wikiPage.imageUrls,
      imageCredits: credits.get(instance.card.wikiPageId) ?? {},
      attributes: instance.card.attributes,
    })),
    progress: {
      uniqueOwned,
      corpusSize,
      percent: corpusSize === 0 ? 0 : Math.round((uniqueOwned / corpusSize) * 1000) / 10,
    },
  });
}
