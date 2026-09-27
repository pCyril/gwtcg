import { NextResponse } from "next/server";
import { getOrCreateUser, assertAdmin } from "@/lib/session";
import { listPendingArtSubmissions } from "@/lib/game/artSubmission";

export async function GET() {
  const me = await getOrCreateUser();
  try {
    assertAdmin(me);
  } catch {
    return NextResponse.json({ error: "NOT_ADMIN" }, { status: 403 });
  }

  const submissions = await listPendingArtSubmissions();
  return NextResponse.json({
    submissions: submissions.map((s) => ({
      id: s.id,
      imageUrl: s.imageUrl,
      createdAt: s.createdAt,
      submitterPseudo: s.submitter.pseudo,
      wikiPageTitle: s.wikiPage.title,
      wikiPageUrl: s.wikiPage.url,
    })),
  });
}
