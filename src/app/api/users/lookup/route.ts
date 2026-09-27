import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const me = await getOrCreateUser();
  const { searchParams } = new URL(request.url);
  const pseudo = searchParams.get("pseudo")?.trim();

  if (!pseudo) {
    return NextResponse.json({ error: "MISSING_PSEUDO" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { pseudo } });
  if (!user || user.id === me.id) {
    return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ id: user.id, pseudo: user.pseudo });
}
