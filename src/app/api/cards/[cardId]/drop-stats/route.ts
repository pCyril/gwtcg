import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * How many copies of a card have ever dropped, versus every card dropped so far
 * (discarded copies still count - they did drop). Public, no session needed.
 */
export async function GET(_request: Request, { params }: RouteContext<"/api/cards/[cardId]/drop-stats">) {
  const { cardId } = await params;
  const [copies, total] = await Promise.all([
    prisma.cardInstance.count({ where: { cardId } }),
    prisma.cardInstance.count(),
  ]);
  return NextResponse.json({ copies, total });
}
