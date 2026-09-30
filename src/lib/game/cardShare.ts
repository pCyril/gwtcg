import { prisma } from "@/lib/prisma";
import { getImageCreditsByWikiPage } from "@/lib/game/artSubmission";
import type { CardData } from "@/components/CardTile";

/** Public, session-free view of one card (by Card id) for the shareable /card/[cardId] page. */
export async function getSharedCard(cardId: string): Promise<(CardData & { cardId: string }) | null> {
  const card = await prisma.card.findUnique({ where: { id: cardId }, include: { wikiPage: true } });
  if (!card) return null;

  const credits = await getImageCreditsByWikiPage([card.wikiPageId]);
  return {
    cardId: card.id,
    wikiPageId: card.wikiPageId,
    rarity: card.rarity,
    family: card.family,
    campaign: card.campaign,
    profession: card.profession,
    title: card.wikiPage.title,
    extract: card.wikiPage.extract,
    url: card.wikiPage.url,
    imageUrls: card.wikiPage.imageUrls,
    imageCredits: credits.get(card.wikiPageId) ?? {},
  };
}
