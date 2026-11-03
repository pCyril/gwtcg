import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/session";
import { listMyAuctionActivity } from "@/lib/game/auction";
import { isMarketEnabled } from "@/lib/config";
import { prisma } from "@/lib/prisma";

export async function GET() {
  if (!isMarketEnabled()) return NextResponse.json({ error: "MARKET_DISABLED" }, { status: 503 });

  const me = await getOrCreateUser();
  const { selling, bidOn } = await listMyAuctionActivity(me.id);

  // Card titles, so each row's link can say which card it opens (RGAA 6.1).
  const instanceIds = [...new Set([...selling, ...bidOn].map((a) => a.cardInstanceId))];
  const instances = instanceIds.length
    ? await prisma.cardInstance.findMany({
        where: { id: { in: instanceIds } },
        select: { id: true, card: { select: { wikiPage: { select: { title: true } } } } },
      })
    : [];
  const titleByInstance = new Map(instances.map((i) => [i.id, i.card.wikiPage.title]));

  const toRow = (a: (typeof selling)[number]) => ({
    id: a.id,
    status: a.status,
    startingPrice: a.startingPrice,
    endsAt: a.endsAt,
    cardTitle: titleByInstance.get(a.cardInstanceId) ?? null,
  });

  return NextResponse.json({
    selling: selling.map(toRow),
    bidOn: bidOn.map(toRow),
  });
}
