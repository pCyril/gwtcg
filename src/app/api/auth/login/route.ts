import { NextResponse } from "next/server";
import { isAdminEmail, verifyPassword } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;

  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
  }

  await setSessionCookie(user.sessionToken);

  // Keeps isAdmin in sync with ADMIN_EMAIL (comma-separated list) even for accounts registered before it was set (or changed).
  const shouldBeAdmin = isAdminEmail(email);
  if (shouldBeAdmin !== user.isAdmin) {
    await prisma.user.update({ where: { id: user.id }, data: { isAdmin: shouldBeAdmin } });
  }

  return NextResponse.json({ pseudo: user.pseudo, email: user.email, isGuest: user.isGuest });
}
