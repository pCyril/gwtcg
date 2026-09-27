import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/session";
import { DAILY_BOOSTER_LIMIT, getBoosterAvailability } from "@/lib/game/booster";
import { prisma } from "@/lib/prisma";

const GAME_CHARACTER_NAME_PATTERN = /^[\p{L}][\p{L}' -]{1,30}[\p{L}]$/u;
const PSEUDO_PATTERN = /^[\p{L}\p{N}_-]{3,24}$/u;

export async function GET() {
  const user = await getOrCreateUser();
  const { available, nextAvailableAt } = await getBoosterAvailability(user.id);

  return NextResponse.json({
    pseudo: user.pseudo,
    email: user.email,
    isGuest: user.isGuest,
    isAdmin: user.isAdmin,
    boostersAvailable: available,
    dailyBoosterLimit: DAILY_BOOSTER_LIMIT,
    startingProfession: user.startingProfession,
    gameCharacterName: user.gameCharacterName,
    nextBoosterInMs: nextAvailableAt ? nextAvailableAt.getTime() - Date.now() : null,
  });
}

/**
 * Updates whichever of the caller's own profile fields are present in the body:
 * - gameCharacterName: the player's real GW1 character name (can be cleared
 *   with an empty string), shown to the other side of an auction handoff.
 * - pseudo: the site display handle (unlike gameCharacterName, required and unique).
 */
export async function POST(request: Request) {
  const user = await getOrCreateUser();
  const body = await request.json().catch(() => ({}));
  const data: { gameCharacterName?: string | null; pseudo?: string } = {};

  if (typeof body?.gameCharacterName === "string") {
    const raw = body.gameCharacterName.trim();
    if (raw && !GAME_CHARACTER_NAME_PATTERN.test(raw)) {
      return NextResponse.json({ error: "INVALID_CHARACTER_NAME" }, { status: 400 });
    }
    data.gameCharacterName = raw || null;
  }

  if (typeof body?.pseudo === "string") {
    const pseudo = body.pseudo.trim();
    if (!PSEUDO_PATTERN.test(pseudo)) {
      return NextResponse.json({ error: "INVALID_PSEUDO" }, { status: 400 });
    }
    if (pseudo !== user.pseudo) {
      const taken = await prisma.user.findUnique({ where: { pseudo } });
      if (taken) return NextResponse.json({ error: "PSEUDO_TAKEN" }, { status: 409 });
    }
    data.pseudo = pseudo;
  }

  const updated = await prisma.user.update({ where: { id: user.id }, data });

  return NextResponse.json({ gameCharacterName: updated.gameCharacterName, pseudo: updated.pseudo });
}
