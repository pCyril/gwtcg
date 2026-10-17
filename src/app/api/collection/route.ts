import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { parseCollectionQuery, queryCollection } from "@/lib/game/collectionQuery";

export async function GET(request: Request) {
  const user = await getOrCreateUser();
  const { searchParams } = new URL(request.url);

  const query = parseCollectionQuery(searchParams);

  // ?notOwnedBy=<pseudo>: leave out the cards that player already has (their
  // collection is public anyway) - used by trades to offer only what they lack.
  const notOwnedBy = searchParams.get("notOwnedBy");
  if (notOwnedBy) {
    const other = await prisma.user.findUnique({ where: { pseudo: notOwnedBy } });
    if (other) {
      const owned = await prisma.cardInstance.findMany({
        where: { ownerId: other.id, discardedAt: null },
        select: { cardId: true },
        distinct: ["cardId"],
      });
      query.excludeCardIds = new Set(owned.map((row) => row.cardId));
    }
  }

  const result = await queryCollection(user.id, query);

  return NextResponse.json({ pseudo: user.pseudo, ...result });
}
