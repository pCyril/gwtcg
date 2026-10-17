import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuffer = Buffer.from(hash, "hex");
  const derived = scryptSync(password, salt, KEY_LENGTH);
  if (derived.length !== hashBuffer.length) return false;
  return timingSafeEqual(derived, hashBuffer);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Whether the email is listed in ADMIN_EMAIL (one address, or several separated by commas). */
export function isAdminEmail(email: string): boolean {
  const admins = (process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((address) => address.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.trim().toLowerCase());
}
