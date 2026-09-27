import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/session";
import { hashPassword, isValidEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Upgrades the current guest account in place (same collection) into a real
 * account, so signing up never costs the player their progress.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const pseudo = typeof body?.pseudo === "string" ? body.pseudo.trim() : "";

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "INVALID_EMAIL" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "PASSWORD_TOO_SHORT" }, { status: 400 });
  }
  if (pseudo && (pseudo.length < 3 || pseudo.length > 24)) {
    return NextResponse.json({ error: "INVALID_PSEUDO" }, { status: 400 });
  }

  const user = await getOrCreateUser();

  if (user.passwordHash) {
    return NextResponse.json({ error: "ALREADY_REGISTERED" }, { status: 400 });
  }

  const emailTaken = await prisma.user.findUnique({ where: { email } });
  if (emailTaken) {
    return NextResponse.json({ error: "EMAIL_TAKEN" }, { status: 409 });
  }

  if (pseudo && pseudo !== user.pseudo) {
    const pseudoTaken = await prisma.user.findUnique({ where: { pseudo } });
    if (pseudoTaken) {
      return NextResponse.json({ error: "PSEUDO_TAKEN" }, { status: 409 });
    }
  }

  const isAdmin = !!process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL.trim().toLowerCase();

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      email,
      passwordHash: hashPassword(password),
      isGuest: false,
      ...(isAdmin ? { isAdmin: true } : {}),
      ...(pseudo ? { pseudo } : {}),
    },
  });

  return NextResponse.json({ pseudo: updated.pseudo, email: updated.email, isGuest: updated.isGuest });
}
