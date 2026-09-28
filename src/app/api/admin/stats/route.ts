import { NextResponse } from "next/server";
import { getOrCreateUser, assertAdmin } from "@/lib/session";
import { getAdminStats } from "@/lib/game/stats";

export async function GET() {
  const me = await getOrCreateUser();
  try {
    assertAdmin(me);
  } catch {
    return NextResponse.json({ error: "NOT_ADMIN" }, { status: 403 });
  }

  const stats = await getAdminStats();
  return NextResponse.json(stats);
}
