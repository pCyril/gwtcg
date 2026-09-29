import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { createTrade } from "@/lib/game/trade";

export async function GET() {
  const me = await getOrCreateUser();

  const trades = await prisma.trade.findMany({
    where: { OR: [{ initiatorId: me.id }, { recipientId: me.id }] },
    include: { initiator: true, recipient: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    trades: trades.map((t) => ({
      id: t.id,
      status: t.status,
      createdAt: t.createdAt,
      counterparty: t.initiatorId === me.id ? t.recipient.pseudo : t.initiator.pseudo,
      isInitiator: t.initiatorId === me.id,
    })),
  });
}

export async function POST(request: Request) {
  const me = await getOrCreateUser();
  const body = await request.json().catch(() => ({}));
  const recipientPseudo = typeof body?.recipientPseudo === "string" ? body.recipientPseudo.trim() : "";
  const requestedCardId = typeof body?.requestedCardId === "string" ? body.requestedCardId : undefined;

  if (!recipientPseudo) {
    return NextResponse.json({ error: "MISSING_RECIPIENT" }, { status: 400 });
  }
  if (recipientPseudo === me.pseudo) {
    return NextResponse.json({ error: "CANNOT_TRADE_SELF" }, { status: 400 });
  }
  // Guests are free, disposable accounts - allowing them into trades would
  // let someone farm boosters across throwaway sessions and consolidate the
  // cards into one account for free. Blocking both sides at creation time is
  // enough: a trade can never end up with a guest on either side, and
  // isGuest never flips back to true once someone registers.
  if (me.isGuest) {
    return NextResponse.json({ error: "GUEST_CANNOT_TRADE" }, { status: 403 });
  }

  const recipient = await prisma.user.findUnique({ where: { pseudo: recipientPseudo } });
  if (!recipient) {
    return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
  }
  if (recipient.isGuest) {
    return NextResponse.json({ error: "RECIPIENT_IS_GUEST" }, { status: 400 });
  }

  const trade = await createTrade(me.id, recipient.id, requestedCardId);

  return NextResponse.json({ id: trade.id });
}
