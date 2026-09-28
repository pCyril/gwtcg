import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/session";
import { createArtSubmission } from "@/lib/game/artSubmission";

const STATUS_BY_ERROR: Record<string, number> = {
  CONSENT_REQUIRED: 400,
  UNSUPPORTED_FILE_TYPE: 400,
  FILE_TOO_LARGE: 400,
  WIKI_PAGE_NOT_FOUND: 404,
  TOO_MANY_PENDING: 429,
};

export async function POST(request: Request) {
  const me = await getOrCreateUser();
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "INVALID_FORM" }, { status: 400 });

  const wikiPageId = form.get("wikiPageId");
  const file = form.get("file");
  const certifiedOriginal = form.get("certifiedOriginal") === "true";

  if (typeof wikiPageId !== "string" || !wikiPageId) {
    return NextResponse.json({ error: "WIKI_PAGE_NOT_FOUND" }, { status: 404 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "UNSUPPORTED_FILE_TYPE" }, { status: 400 });
  }

  try {
    const submission = await createArtSubmission(me.id, wikiPageId, file, certifiedOriginal, me.isAdmin);
    return NextResponse.json({ id: submission.id, status: submission.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    return NextResponse.json({ error: message }, { status: STATUS_BY_ERROR[message] ?? 500 });
  }
}
