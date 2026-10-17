import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/session";
import { toggleRequestedCard } from "@/lib/game/trade";

const STATUS_BY_ERROR: Record<string, number> = {
  TRADE_NOT_FOUND: 404,
  NOT_A_PARTICIPANT: 403,
  TRADE_NOT_PENDING: 400,
  TOO_MANY_ITEMS: 400,
  CARD_NOT_AVAILABLE: 400,
};

export async function POST(request: Request, ctx: RouteContext<"/api/trade/[id]/request">) {
  const me = await getOrCreateUser();
  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  const cardId = typeof body?.cardId === "string" ? body.cardId : "";
  if (!cardId) return NextResponse.json({ error: "INVALID_CARD_SELECTION" }, { status: 400 });

  try {
    await toggleRequestedCard(id, me.id, cardId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    return NextResponse.json({ error: message }, { status: STATUS_BY_ERROR[message] ?? 500 });
  }
}
