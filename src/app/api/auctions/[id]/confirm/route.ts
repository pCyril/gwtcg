import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/session";
import { confirmHandoff } from "@/lib/game/auction";

const STATUS_BY_ERROR: Record<string, number> = {
  NOT_THE_SELLER: 403,
  AUCTION_NOT_AWAITING_HANDOFF: 400,
  NO_WINNING_BID: 400,
};

export async function POST(_request: Request, ctx: RouteContext<"/api/auctions/[id]/confirm">) {
  const me = await getOrCreateUser();
  const { id } = await ctx.params;

  try {
    await confirmHandoff(id, me.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    return NextResponse.json({ error: message }, { status: STATUS_BY_ERROR[message] ?? 500 });
  }
}
