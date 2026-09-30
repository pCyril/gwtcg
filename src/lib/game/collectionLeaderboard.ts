import { prisma } from "@/lib/prisma";

export interface CollectionLeaderboardEntry {
  pseudo: string;
  owned: number;
  total: number;
  percent: number;
}

const COLLECTION_LEADERBOARD_SIZE = 10;

/** Top players by collection completion (distinct cards currently owned / all cards), registered players only. */
export async function getCollectionLeaderboard(): Promise<CollectionLeaderboardEntry[]> {
  const [total, rows] = await Promise.all([
    prisma.card.count(),
    prisma.$queryRaw<{ ownerId: string; owned: bigint }[]>`
      SELECT ci."ownerId", COUNT(DISTINCT ci."cardId") AS owned
      FROM "CardInstance" ci
      JOIN "User" u ON u.id = ci."ownerId"
      WHERE ci."discardedAt" IS NULL AND u."isGuest" = false
      GROUP BY ci."ownerId"
      ORDER BY owned DESC
      LIMIT ${COLLECTION_LEADERBOARD_SIZE}
    `,
  ]);
  if (total === 0 || rows.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: rows.map((r) => r.ownerId) } },
    select: { id: true, pseudo: true },
  });
  const pseudoById = new Map(users.map((u) => [u.id, u.pseudo]));

  return rows.map((r) => {
    const owned = Number(r.owned);
    return { pseudo: pseudoById.get(r.ownerId) ?? "?", owned, total, percent: Math.round((owned / total) * 1000) / 10 };
  });
}
