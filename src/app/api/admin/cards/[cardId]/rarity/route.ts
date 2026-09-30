import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, assertAdmin } from "@/lib/session";

const RARITIES = ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"] as const;

/**
 * Admin override of a card's rarity. The card is flagged rarityLocked so the
 * next wiki sync (which recomputes rarity from the corpus) doesn't revert it.
 */
export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/cards/[cardId]/rarity">) {
  const me = await getSessionUser();
  try {
    if (!me) throw new Error("NOT_ADMIN");
    assertAdmin(me);
  } catch {
    return NextResponse.json({ error: "NOT_ADMIN" }, { status: 403 });
  }

  const { cardId } = await ctx.params;
  const body = await request.json().catch(() => null);
  const rarity = body?.rarity;
  if (!RARITIES.includes(rarity)) {
    return NextResponse.json({ error: "INVALID_RARITY" }, { status: 400 });
  }

  try {
    await prisma.card.update({ where: { id: cardId }, data: { rarity, rarityLocked: true } });
  } catch {
    return NextResponse.json({ error: "CARD_NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, rarity });
}
