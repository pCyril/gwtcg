import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "gm_session";

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

function generatePseudo(): string {
  return `Voyageur${randomBytes(3).toString("hex")}`;
}

/** Point the session cookie at a given token - used by login to switch to another account. */
export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
}

/** Drop the session cookie - the next request will get a fresh guest account. */
export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

/**
 * Resolve the current guest/registered user from the session cookie,
 * creating a fresh guest account (and cookie) on first visit. This is what
 * lets a brand new visitor open a booster with zero signup friction.
 */
export async function getOrCreateUser() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;

  if (token) {
    const existing = await prisma.user.findUnique({ where: { sessionToken: token } });
    if (existing) return existing;
  }

  const newToken = generateToken();
  const user = await prisma.user.create({
    data: {
      sessionToken: newToken,
      pseudo: generatePseudo(),
    },
  });

  await setSessionCookie(newToken);

  return user;
}

/** Throws NOT_ADMIN for the caller to turn into a 403 - used by moderation routes. */
export function assertAdmin(user: { isAdmin: boolean }) {
  if (!user.isAdmin) throw new Error("NOT_ADMIN");
}
