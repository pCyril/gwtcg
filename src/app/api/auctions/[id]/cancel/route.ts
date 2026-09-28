import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/session";
import { cancelAuction } from "@/lib/game/auction";
import { isMarketEnabled } from "@/lib/config";

const STATUS_BY_ERROR: Record<string, number> = {
  NOT_THE_SELLER: 403,
  AUCTION_NOT_ACTIVE: 400,
  CANNOT_CANCEL_WITH_BIDS: 400,
};

export async function POST(_request: Request, ctx: RouteContext<"/api/auctions/[id]/cancel">) {
  if (!isMarketEnabled()) return NextResponse.json({ error: "MARKET_DISABLED" }, { status: 503 });

  const me = await getOrCreateUser();
  const { id } = await ctx.params;

  try {
    await cancelAuction(id, me.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    return NextResponse.json({ error: message }, { status: STATUS_BY_ERROR[message] ?? 500 });
  }
}
