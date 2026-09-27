import { prisma } from "@/lib/prisma";

/**
 * Soft-deletes card instances (sets discardedAt) instead of removing the row
 * outright - Auction and TradeItem rows reference cardInstanceId permanently
 * (for history), with no cascade, so a real delete would fail once a card has
 * ever been traded or auctioned.
 */
export async function discardCardInstances(userId: string, cardInstanceIds: string[]) {
  const uniqueIds = [...new Set(cardInstanceIds)];
  if (uniqueIds.length === 0) throw new Error("NO_CARDS_SELECTED");

  return prisma.$transaction(async (tx) => {
    const owned = await tx.cardInstance.findMany({
      where: { id: { in: uniqueIds }, ownerId: userId, discardedAt: null },
      include: { auctions: true },
    });
    if (owned.length !== uniqueIds.length) throw new Error("INVALID_CARD_SELECTION");

    const inPendingTrade = await tx.tradeItem.findFirst({
      where: { cardInstanceId: { in: uniqueIds }, trade: { status: "PENDING" } },
    });
    if (inPendingTrade) throw new Error("CARD_IN_TRADE");

    if (owned.some((c) => c.auctions.some((a) => a.status === "ACTIVE" || a.status === "AWAITING_HANDOFF"))) {
      throw new Error("CARD_IN_AUCTION");
    }

    const result = await tx.cardInstance.updateMany({
      where: { id: { in: uniqueIds }, ownerId: userId, discardedAt: null },
      data: { discardedAt: new Date() },
    });

    return { discarded: result.count };
  });
}
