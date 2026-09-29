import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseCollectionQuery, queryCollection } from "@/lib/game/collectionQuery";

/**
 * Public, read-only view of another player's collection by pseudo - no
 * session/auth involved, so merely opening a share link never creates an
 * account for the visitor (see getSessionUser() vs getOrCreateUser()).
 */
export async function GET(request: Request, { params }: RouteContext<"/api/collection/shared/[pseudo]">) {
  const { pseudo } = await params;
  const owner = await prisma.user.findUnique({ where: { pseudo } });
  if (!owner) {
    return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const result = await queryCollection(owner.id, parseCollectionQuery(searchParams));

  // Omit instanceId - it only matters for the owner's own instance-scoped
  // actions (discard, sell), which a public viewer never has access to.
  return NextResponse.json({
    pseudo: owner.pseudo,
    cards: result.cards.map((card) => ({
      wikiPageId: card.wikiPageId,
      obtainedAt: card.obtainedAt,
      rarity: card.rarity,
      family: card.family,
      campaign: card.campaign,
      profession: card.profession,
      title: card.title,
      extract: card.extract,
      url: card.url,
      imageUrls: card.imageUrls,
      imageCredits: card.imageCredits,
      attributes: card.attributes,
      copies: card.copies,
    })),
    progress: result.progress,
    hasMore: result.hasMore,
  });
}
