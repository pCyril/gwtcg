import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

type PrismaTransaction = Prisma.TransactionClient;

export const MIN_DURATION_HOURS = 1;
export const MAX_DURATION_HOURS = 72;

const AUCTION_DETAIL_INCLUDE = {
  seller: true,
  cardInstance: { include: { card: { include: { wikiPage: true } } } },
  bids: { orderBy: { amount: "desc" as const }, include: { bidder: true } },
};

/**
 * Ecto only ever changes hands in the real GW1 client - this platform never
 * holds or moves it. So closing an auction (time's up, or a buyout) doesn't
 * transfer anything: it just locks in the winning bid and waits for the
 * seller to confirm, once the two players have done the actual in-game trade.
 *
 * The conditional `updateMany` is a compare-and-swap: if two concurrent
 * requests both decide an auction needs closing, only the one that commits
 * first actually claims it (its WHERE still matches `ACTIVE`); the other's
 * `count` comes back 0 and it just no-ops.
 */
async function closeAuctionTx(tx: PrismaTransaction, auctionId: string) {
  const topBid = await tx.bid.findFirst({ where: { auctionId }, orderBy: { amount: "desc" } });

  await tx.auction.updateMany({
    where: { id: auctionId, status: "ACTIVE" },
    data: topBid
      ? { status: "AWAITING_HANDOFF" }
      : { status: "EXPIRED", resolvedAt: new Date() },
  });
}

export async function createAuction(
  userId: string,
  cardInstanceId: string,
  startingPrice: number,
  buyoutPrice: number | null,
  durationHours: number,
) {
  if (!Number.isInteger(startingPrice) || startingPrice <= 0) throw new Error("INVALID_STARTING_PRICE");
  if (buyoutPrice !== null && (!Number.isInteger(buyoutPrice) || buyoutPrice <= startingPrice)) {
    throw new Error("INVALID_BUYOUT_PRICE");
  }
  if (!Number.isInteger(durationHours) || durationHours < MIN_DURATION_HOURS || durationHours > MAX_DURATION_HOURS) {
    throw new Error("INVALID_DURATION");
  }

  return prisma.$transaction(async (tx) => {
    const card = await tx.cardInstance.findUnique({ where: { id: cardInstanceId }, include: { auctions: true } });
    if (!card || card.ownerId !== userId || card.discardedAt) throw new Error("INVALID_CARD_SELECTION");
    if (card.auctions.some((a) => a.status === "ACTIVE" || a.status === "AWAITING_HANDOFF")) {
      throw new Error("CARD_IN_AUCTION");
    }

    const inPendingTrade = await tx.tradeItem.findFirst({ where: { cardInstanceId, trade: { status: "PENDING" } } });
    if (inPendingTrade) throw new Error("CARD_IN_TRADE");

    const endsAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);
    return tx.auction.create({ data: { sellerId: userId, cardInstanceId, startingPrice, buyoutPrice, endsAt } });
  });
}

export async function getAuctionDetail(auctionId: string) {
  return prisma.$transaction(async (tx) => {
    const auction = await tx.auction.findUnique({ where: { id: auctionId }, include: AUCTION_DETAIL_INCLUDE });
    if (!auction) throw new Error("AUCTION_NOT_FOUND");

    if (auction.status === "ACTIVE" && auction.endsAt <= new Date()) {
      await closeAuctionTx(tx, auctionId);
      return tx.auction.findUniqueOrThrow({ where: { id: auctionId }, include: AUCTION_DETAIL_INCLUDE });
    }
    return auction;
  });
}

export async function listActiveAuctions() {
  const nowExpired = await prisma.auction.findMany({ where: { status: "ACTIVE", endsAt: { lte: new Date() } } });
  for (const auction of nowExpired) {
    await prisma.$transaction((tx) => closeAuctionTx(tx, auction.id));
  }

  return prisma.auction.findMany({
    where: { status: "ACTIVE" },
    include: {
      seller: true,
      cardInstance: { include: { card: { include: { wikiPage: true } } } },
      bids: { orderBy: { amount: "desc" }, take: 1 },
    },
    orderBy: { endsAt: "asc" },
  });
}

export interface SellerReputation {
  completedSales: number;
  fallenThroughHandoffs: number;
}

/**
 * Two trust signals per seller for buyers browsing the Kamadan:
 * - completedSales: auctions that went all the way through.
 * - fallenThroughHandoffs: auctions cancelled after a bid was already in
 *   (AWAITING_HANDOFF -> CANCELLED, the only path where that's possible -
 *   cancelling an ACTIVE auction with bids is rejected outright). This can't
 *   tell a scamming seller apart from a buyer who never paid up, so it's
 *   deliberately framed as a neutral fact ("didn't go through"), not blame.
 */
export async function getSellerReputations(sellerIds: string[]): Promise<Map<string, SellerReputation>> {
  const uniqueIds = [...new Set(sellerIds)];
  if (uniqueIds.length === 0) return new Map();

  const [completed, fallenThrough] = await Promise.all([
    prisma.auction.groupBy({
      by: ["sellerId"],
      where: { sellerId: { in: uniqueIds }, status: "COMPLETED" },
      _count: { _all: true },
    }),
    prisma.auction.groupBy({
      by: ["sellerId"],
      where: { sellerId: { in: uniqueIds }, status: "CANCELLED", bids: { some: {} } },
      _count: { _all: true },
    }),
  ]);

  const result = new Map<string, SellerReputation>();
  for (const id of uniqueIds) result.set(id, { completedSales: 0, fallenThroughHandoffs: 0 });
  for (const g of completed) result.get(g.sellerId)!.completedSales = g._count._all;
  for (const g of fallenThrough) result.get(g.sellerId)!.fallenThroughHandoffs = g._count._all;
  return result;
}

export async function listMyAuctionActivity(userId: string) {
  const [selling, bidOn] = await Promise.all([
    prisma.auction.findMany({ where: { sellerId: userId }, orderBy: { createdAt: "desc" } }),
    prisma.auction.findMany({
      where: { bids: { some: { bidderId: userId } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return { selling, bidOn };
}

/** Place a competitive bid - a number for price discovery only, no balance is touched. */
export async function placeBid(auctionId: string, userId: string, amount: number): Promise<{ boughtOut: boolean }> {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("INVALID_AMOUNT");

  return prisma.$transaction(async (tx) => {
    const auction = await tx.auction.findUniqueOrThrow({ where: { id: auctionId } });

    if (auction.status === "ACTIVE" && auction.endsAt <= new Date()) {
      await closeAuctionTx(tx, auctionId);
      throw new Error("AUCTION_ENDED");
    }
    if (auction.status !== "ACTIVE") throw new Error("AUCTION_NOT_ACTIVE");
    if (auction.sellerId === userId) throw new Error("CANNOT_BID_OWN_AUCTION");

    const topBid = await tx.bid.findFirst({ where: { auctionId }, orderBy: { amount: "desc" } });
    const minRequired = topBid ? topBid.amount + 1 : auction.startingPrice;
    if (amount < minRequired) throw new Error("BID_TOO_LOW");

    await tx.bid.create({ data: { auctionId, bidderId: userId, amount } });

    if (auction.buyoutPrice !== null && amount >= auction.buyoutPrice) {
      await closeAuctionTx(tx, auctionId);
      return { boughtOut: true };
    }

    return { boughtOut: false };
  });
}

export async function cancelAuction(auctionId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const auction = await tx.auction.findUniqueOrThrow({ where: { id: auctionId } });
    if (auction.sellerId !== userId) throw new Error("NOT_THE_SELLER");

    if (auction.status === "AWAITING_HANDOFF") {
      // The real in-game trade fell through (e.g. the buyer never paid up) - back out cleanly.
      await tx.auction.update({ where: { id: auctionId }, data: { status: "CANCELLED", resolvedAt: new Date() } });
      return;
    }

    if (auction.status !== "ACTIVE") throw new Error("AUCTION_NOT_ACTIVE");
    const hasBids = await tx.bid.findFirst({ where: { auctionId } });
    if (hasBids) throw new Error("CANNOT_CANCEL_WITH_BIDS");
    await tx.auction.update({ where: { id: auctionId }, data: { status: "CANCELLED", resolvedAt: new Date() } });
  });
}

/**
 * The seller confirms they've received the real ecto in GW1 - only now does
 * the card actually change hands on this platform.
 */
export async function confirmHandoff(auctionId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const auction = await tx.auction.findUniqueOrThrow({ where: { id: auctionId } });
    if (auction.sellerId !== userId) throw new Error("NOT_THE_SELLER");
    if (auction.status !== "AWAITING_HANDOFF") throw new Error("AUCTION_NOT_AWAITING_HANDOFF");

    const topBid = await tx.bid.findFirst({ where: { auctionId }, orderBy: { amount: "desc" } });
    if (!topBid) throw new Error("NO_WINNING_BID");

    // Compare-and-swap: only the request that actually claims the AWAITING_HANDOFF -> COMPLETED
    // transition proceeds to transfer the card, in case of a concurrent double-submit.
    const claimed = await tx.auction.updateMany({
      where: { id: auctionId, status: "AWAITING_HANDOFF" },
      data: { status: "COMPLETED", resolvedAt: new Date() },
    });
    if (claimed.count === 0) return;

    await tx.cardInstance.update({ where: { id: auction.cardInstanceId }, data: { ownerId: topBid.bidderId } });
  });
}
