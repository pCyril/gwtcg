import { NextResponse } from "next/server";
import { getSessionUser, assertAdmin } from "@/lib/session";
import { recomputeRarity } from "@/lib/game/recomputeRarity";

/**
 * Admin-only: recompute every card's rarity from the stored wiki data, same as
 * `npm run rarity:recompute` (the production image has no tsx to run scripts).
 * Cards whose rarity an admin set by hand (rarityLocked) are left untouched.
 */
export async function POST() {
  const me = await getSessionUser();
  try {
    if (!me) throw new Error("NOT_ADMIN");
    assertAdmin(me);
  } catch {
    return NextResponse.json({ error: "NOT_ADMIN" }, { status: 403 });
  }

  const updated = await recomputeRarity(() => {});
  return NextResponse.json({ ok: true, updated });
}
