import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/session";
import { discardCardInstances } from "@/lib/game/discard";

const STATUS_BY_ERROR: Record<string, number> = {
  NO_CARDS_SELECTED: 400,
  INVALID_CARD_SELECTION: 400,
  CARD_IN_TRADE: 400,
  CARD_IN_AUCTION: 400,
};

export async function POST(request: Request) {
  const me = await getOrCreateUser();
  const body = await request.json().catch(() => ({}));
  const cardInstanceIds = Array.isArray(body?.cardInstanceIds)
    ? body.cardInstanceIds.filter((x: unknown): x is string => typeof x === "string")
    : [];

  try {
    const result = await discardCardInstances(me.id, cardInstanceIds);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    return NextResponse.json({ error: message }, { status: STATUS_BY_ERROR[message] ?? 500 });
  }
}
