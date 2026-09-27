import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/session";
import { setOffer } from "@/lib/game/trade";

const STATUS_BY_ERROR: Record<string, number> = {
  TRADE_NOT_FOUND: 404,
  NOT_A_PARTICIPANT: 403,
  TRADE_NOT_PENDING: 400,
  TOO_MANY_ITEMS: 400,
  INVALID_CARD_SELECTION: 400,
  CARD_IN_AUCTION: 400,
};

export async function POST(request: Request, ctx: RouteContext<"/api/trade/[id]/offer">) {
  const me = await getOrCreateUser();
  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));

  const cardInstanceIds = Array.isArray(body?.cardInstanceIds)
    ? body.cardInstanceIds.filter((v: unknown) => typeof v === "string")
    : [];

  try {
    await setOffer(id, me.id, cardInstanceIds);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    return NextResponse.json({ error: message }, { status: STATUS_BY_ERROR[message] ?? 500 });
  }
}
