import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/session";
import { placeBid } from "@/lib/game/auction";

const STATUS_BY_ERROR: Record<string, number> = {
  AUCTION_NOT_ACTIVE: 400,
  AUCTION_ENDED: 400,
  CANNOT_BID_OWN_AUCTION: 400,
  BID_TOO_LOW: 400,
  INVALID_AMOUNT: 400,
};

export async function POST(request: Request, ctx: RouteContext<"/api/auctions/[id]/bid">) {
  const me = await getOrCreateUser();
  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  const amount = Number.isFinite(body?.amount) ? Math.trunc(body.amount) : NaN;

  try {
    const result = await placeBid(id, me.id, amount);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    return NextResponse.json({ error: message }, { status: STATUS_BY_ERROR[message] ?? 500 });
  }
}
