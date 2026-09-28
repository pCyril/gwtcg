import { prisma } from "@/lib/prisma";

const HOUR_MS = 60 * 60 * 1000;

export async function getAdminStats() {
  const now = Date.now();
  const since1h = new Date(now - HOUR_MS);
  const since24h = new Date(now - 24 * HOUR_MS);

  const [
    totalUsers,
    usersLast1h,
    usersLast24h,
    totalBoosters,
    boostersLast1h,
    boostersLast24h,
    totalTrades,
    totalAuctions,
    activeAuctions,
    totalArtSubmissions,
    pendingArtSubmissions,
    totalCardInstances,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: since1h } } }),
    prisma.user.count({ where: { createdAt: { gte: since24h } } }),
    prisma.boosterOpening.count(),
    prisma.boosterOpening.count({ where: { openedAt: { gte: since1h } } }),
    prisma.boosterOpening.count({ where: { openedAt: { gte: since24h } } }),
    prisma.trade.count(),
    prisma.auction.count(),
    prisma.auction.count({ where: { status: { in: ["ACTIVE", "AWAITING_HANDOFF"] } } }),
    prisma.artSubmission.count(),
    prisma.artSubmission.count({ where: { status: "PENDING" } }),
    prisma.cardInstance.count(),
  ]);

  return {
    totalUsers,
    usersLast1h,
    usersLast24h,
    totalBoosters,
    boostersLast1h,
    boostersLast24h,
    totalTrades,
    totalAuctions,
    activeAuctions,
    totalArtSubmissions,
    pendingArtSubmissions,
    totalCardInstances,
  };
}
