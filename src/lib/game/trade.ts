import { prisma } from "@/lib/prisma";
import type { TradeSide } from "@prisma/client";

export const MAX_TRADE_ITEMS = 7;

export function sideOf(trade: { initiatorId: string; recipientId: string }, userId: string): TradeSide {
  if (trade.initiatorId === userId) return "INITIATOR";
  if (trade.recipientId === userId) return "RECIPIENT";
  throw new Error("NOT_A_PARTICIPANT");
}

export async function getTradeDetail(tradeId: string, userId: string) {
  const trade = await prisma.trade.findUnique({
    where: { id: tradeId },
    include: {
      initiator: true,
      recipient: true,
      items: { include: { cardInstance: { include: { card: { include: { wikiPage: true } } } } } },
    },
  });
  if (!trade) throw new Error("TRADE_NOT_FOUND");
  sideOf(trade, userId); // throws NOT_A_PARTICIPANT if the caller isn't in this trade
  return trade;
}

/** Replace the caller's offered cards for a still-pending trade. Any edit clears both confirmations. */
export async function setOffer(tradeId: string, userId: string, cardInstanceIds: string[]) {
  if (cardInstanceIds.length > MAX_TRADE_ITEMS) throw new Error("TOO_MANY_ITEMS");

  return prisma.$transaction(async (tx) => {
    const trade = await tx.trade.findUniqueOrThrow({ where: { id: tradeId } });
    if (trade.status !== "PENDING") throw new Error("TRADE_NOT_PENDING");
    const side = sideOf(trade, userId);

    // Must own every offered card, and none may be tied up in an active auction.
    const owned = await tx.cardInstance.findMany({
      where: { id: { in: cardInstanceIds }, ownerId: userId, discardedAt: null },
      include: { auctions: true },
    });
    if (owned.length !== cardInstanceIds.length) throw new Error("INVALID_CARD_SELECTION");
    if (owned.some((c) => c.auctions.some((a) => a.status === "ACTIVE" || a.status === "AWAITING_HANDOFF"))) {
      throw new Error("CARD_IN_AUCTION");
    }

    await tx.tradeItem.deleteMany({ where: { tradeId, side } });
    if (cardInstanceIds.length) {
      await tx.tradeItem.createMany({
        data: cardInstanceIds.map((cardInstanceId) => ({ tradeId, cardInstanceId, side })),
      });
    }

    await tx.trade.update({
      where: { id: tradeId },
      data: { initiatorConfirmed: false, recipientConfirmed: false },
    });
  });
}

export async function cancelTrade(tradeId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const trade = await tx.trade.findUniqueOrThrow({ where: { id: tradeId } });
    sideOf(trade, userId);
    if (trade.status !== "PENDING") throw new Error("TRADE_NOT_PENDING");
    await tx.trade.update({ where: { id: tradeId }, data: { status: "CANCELLED", resolvedAt: new Date() } });
  });
}

/**
 * Confirm the caller's side. If both sides are now confirmed, re-validates
 * everything (ownership may have changed since the offer was set - e.g. the
 * card got auctioned off in the meantime) and swaps the cards atomically. If
 * validation fails, both confirmations are cleared so players can adjust.
 */
export async function confirmTrade(tradeId: string, userId: string): Promise<{ executed: boolean }> {
  return prisma.$transaction(async (tx) => {
    const trade = await tx.trade.findUniqueOrThrow({ where: { id: tradeId } });
    if (trade.status !== "PENDING") throw new Error("TRADE_NOT_PENDING");
    const side = sideOf(trade, userId);

    await tx.trade.update({
      where: { id: tradeId },
      data: side === "INITIATOR" ? { initiatorConfirmed: true } : { recipientConfirmed: true },
    });

    const refreshed = await tx.trade.findUniqueOrThrow({ where: { id: tradeId }, include: { items: true } });
    if (!refreshed.initiatorConfirmed || !refreshed.recipientConfirmed) {
      return { executed: false };
    }

    const initiatorItems = refreshed.items.filter((i) => i.side === "INITIATOR").map((i) => i.cardInstanceId);
    const recipientItems = refreshed.items.filter((i) => i.side === "RECIPIENT").map((i) => i.cardInstanceId);

    const [initiatorOwned, recipientOwned] = await Promise.all([
      tx.cardInstance.findMany({
        where: { id: { in: initiatorItems }, ownerId: refreshed.initiatorId, discardedAt: null },
        include: { auctions: true },
      }),
      tx.cardInstance.findMany({
        where: { id: { in: recipientItems }, ownerId: refreshed.recipientId, discardedAt: null },
        include: { auctions: true },
      }),
    ]);

    const stillValid =
      initiatorOwned.length === initiatorItems.length &&
      recipientOwned.length === recipientItems.length &&
      ![...initiatorOwned, ...recipientOwned].some((c) =>
        c.auctions.some((a) => a.status === "ACTIVE" || a.status === "AWAITING_HANDOFF"),
      );

    if (!stillValid) {
      await tx.trade.update({
        where: { id: tradeId },
        data: { initiatorConfirmed: false, recipientConfirmed: false },
      });
      throw new Error("TRADE_NO_LONGER_VALID");
    }

    if (initiatorItems.length) {
      await tx.cardInstance.updateMany({ where: { id: { in: initiatorItems } }, data: { ownerId: refreshed.recipientId } });
    }
    if (recipientItems.length) {
      await tx.cardInstance.updateMany({ where: { id: { in: recipientItems } }, data: { ownerId: refreshed.initiatorId } });
    }

    await tx.trade.update({
      where: { id: tradeId },
      data: { status: "ACCEPTED", resolvedAt: new Date() },
    });

    return { executed: true };
  });
}
