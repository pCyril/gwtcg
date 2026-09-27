import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/session";
import { listMyAuctionActivity } from "@/lib/game/auction";

export async function GET() {
  const me = await getOrCreateUser();
  const { selling, bidOn } = await listMyAuctionActivity(me.id);

  return NextResponse.json({
    selling: selling.map((a) => ({ id: a.id, status: a.status, startingPrice: a.startingPrice, endsAt: a.endsAt })),
    bidOn: bidOn.map((a) => ({ id: a.id, status: a.status, startingPrice: a.startingPrice, endsAt: a.endsAt })),
  });
}
