import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const VALID_PROFESSIONS = [
  "Warrior",
  "Ranger",
  "Monk",
  "Necromancer",
  "Mesmer",
  "Elementalist",
  "Assassin",
  "Ritualist",
  "Paragon",
  "Dervish",
];

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const profession = typeof body?.profession === "string" ? body.profession : null;

  if (!profession || !VALID_PROFESSIONS.includes(profession)) {
    return NextResponse.json({ error: "INVALID_PROFESSION" }, { status: 400 });
  }

  const user = await getOrCreateUser();
  if (user.startingProfession) {
    return NextResponse.json({ error: "PROFESSION_ALREADY_SET" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { startingProfession: profession },
  });

  return NextResponse.json({ startingProfession: profession });
}
