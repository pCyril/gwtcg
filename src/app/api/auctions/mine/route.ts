import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/session";
import { listMyAuctionActivity } from "@/lib/game/auction";
import { isMarketEnabled } from "@/lib/config";

export async function GET() {
  if (!isMarketEnabled()) return NextResponse.json({ error: "MARKET_DISABLED" }, { status: 503 });

  const me = await getOrCreateUser();
  const { selling, bidOn } = await listMyAuctionActivity(me.id);

  return NextResponse.json({
    selling: selling.map((a) => ({ id: a.id, status: a.status, startingPrice: a.startingPrice, endsAt: a.endsAt })),
    bidOn: bidOn.map((a) => ({ id: a.id, status: a.status, startingPrice: a.startingPrice, endsAt: a.endsAt })),
  });
}
