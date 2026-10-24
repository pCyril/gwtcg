import { NextResponse } from "next/server";
import { getSessionUser, assertAdmin } from "@/lib/session";
import { setWikiArchiveEnabled } from "@/lib/config";

/** Admin-only: point every wiki link at archive.org (true) or back at the live wiki (false). */
export async function PUT(request: Request) {
  const me = await getSessionUser();
  try {
    if (!me) throw new Error("NOT_ADMIN");
    assertAdmin(me);
  } catch {
    return NextResponse.json({ error: "NOT_ADMIN" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (typeof body?.enabled !== "boolean") {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  await setWikiArchiveEnabled(body.enabled);
  return NextResponse.json({ ok: true, wikiArchive: body.enabled });
}
