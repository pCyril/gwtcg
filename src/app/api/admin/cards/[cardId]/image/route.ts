import { NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getSessionUser, assertAdmin } from "@/lib/session";

/**
 * Admin removal of one illustration from a card (wiki image or player upload).
 * Uploaded art is also marked rejected so it no longer counts toward the
 * submitter's leaderboard, and its file is deleted from disk.
 */
export async function DELETE(request: Request, ctx: RouteContext<"/api/admin/cards/[cardId]/image">) {
  const me = await getSessionUser();
  try {
    if (!me) throw new Error("NOT_ADMIN");
    assertAdmin(me);
  } catch {
    return NextResponse.json({ error: "NOT_ADMIN" }, { status: 403 });
  }

  const { cardId } = await ctx.params;
  const body = await request.json().catch(() => null);
  const imageUrl = body?.imageUrl;
  if (typeof imageUrl !== "string" || !imageUrl) {
    return NextResponse.json({ error: "INVALID_IMAGE" }, { status: 400 });
  }

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: { wikiPageId: true, wikiPage: { select: { imageUrls: true } } },
  });
  if (!card) return NextResponse.json({ error: "CARD_NOT_FOUND" }, { status: 404 });
  if (!card.wikiPage.imageUrls.includes(imageUrl)) {
    return NextResponse.json({ error: "IMAGE_NOT_FOUND" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.wikiPage.update({
      where: { id: card.wikiPageId },
      data: { imageUrls: card.wikiPage.imageUrls.filter((u) => u !== imageUrl) },
    }),
    prisma.artSubmission.updateMany({
      where: { wikiPageId: card.wikiPageId, imageUrl, status: "APPROVED" },
      data: { status: "REJECTED", reviewedAt: new Date(), reviewNote: "Removed by an admin" },
    }),
  ]);

  if (/^\/uploads\/card-art\/[a-zA-Z0-9-]+\.(jpg|png|webp)$/.test(imageUrl)) {
    await unlink(path.join(process.cwd(), "public", imageUrl.replace(/^\//, ""))).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
