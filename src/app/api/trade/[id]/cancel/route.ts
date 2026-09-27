import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/session";
import { cancelTrade } from "@/lib/game/trade";

const STATUS_BY_ERROR: Record<string, number> = {
  TRADE_NOT_FOUND: 404,
  NOT_A_PARTICIPANT: 403,
  TRADE_NOT_PENDING: 400,
};

export async function POST(_request: Request, ctx: RouteContext<"/api/trade/[id]/cancel">) {
  const me = await getOrCreateUser();
  const { id } = await ctx.params;

  try {
    await cancelTrade(id, me.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    return NextResponse.json({ error: message }, { status: STATUS_BY_ERROR[message] ?? 500 });
  }
}
