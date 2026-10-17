import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
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

  // Tell a logged-in viewer which of these cards they own themselves (and how
  // many copies). Left undefined for anonymous visitors and for the owner
  // looking at their own public page, where the comparison is meaningless.
  const viewer = await getSessionUser();
  let viewerCopies: Map<string, number> | null = null;
  if (viewer && viewer.id !== owner.id) {
    const owned = await prisma.cardInstance.groupBy({
      by: ["cardId"],
      where: { ownerId: viewer.id, discardedAt: null, cardId: { in: result.cards.map((card) => card.cardId) } },
      _count: { _all: true },
    });
    viewerCopies = new Map(owned.map((row) => [row.cardId, row._count._all]));
  }

  // Omit instanceId - it only matters for the owner's own instance-scoped
  // actions (discard, sell), which a public viewer never has access to.
  // cardId is safe to expose (it only identifies the card template, not a
  // specific owned instance) - it's what lets a viewer request this exact
  // card when proposing a trade with the owner.
  return NextResponse.json({
    pseudo: owner.pseudo,
    cards: result.cards.map((card) => ({
      cardId: card.cardId,
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
      viewerCopies: viewerCopies ? (viewerCopies.get(card.cardId) ?? 0) : undefined,
    })),
    progress: result.progress,
    hasMore: result.hasMore,
  });
}
