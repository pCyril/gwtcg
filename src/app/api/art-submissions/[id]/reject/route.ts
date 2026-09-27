import { NextResponse } from "next/server";
import { getOrCreateUser, assertAdmin } from "@/lib/session";
import { rejectArtSubmission } from "@/lib/game/artSubmission";

export async function POST(request: Request, ctx: RouteContext<"/api/art-submissions/[id]/reject">) {
  const me = await getOrCreateUser();
  try {
    assertAdmin(me);
  } catch {
    return NextResponse.json({ error: "NOT_ADMIN" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  const reviewNote = typeof body?.reviewNote === "string" ? body.reviewNote : undefined;

  try {
    await rejectArtSubmission(id, reviewNote);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    return NextResponse.json({ error: message }, { status: message === "SUBMISSION_NOT_PENDING" ? 400 : 500 });
  }
}
