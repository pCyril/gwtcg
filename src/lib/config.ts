import { prisma } from "@/lib/prisma";

/**
 * Global feature kill-switches, read from env at request time (not baked in
 * at build time) so they can be flipped via the server's .env + a redeploy
 * without touching code. MARKET_ENABLED defaults to on; set to the literal
 * string "false" to shut the Kamadan down entirely (every auction API route
 * refuses requests, not just the UI hiding links).
 */
export function isMarketEnabled(): boolean {
  return process.env.MARKET_ENABLED !== "false";
}

const WIKI_ARCHIVE_KEY = "wikiArchive";

/**
 * Whether wiki links should point to the Wayback Machine's latest crawl
 * instead of wiki.guildwars.com (for when the wiki is down for maintenance).
 * Stored in the database so an admin can flip it from /admin/stats.
 */
export async function isWikiArchiveEnabled(): Promise<boolean> {
  const setting = await prisma.appSetting.findUnique({ where: { key: WIKI_ARCHIVE_KEY } });
  return setting?.value === "true";
}

export async function setWikiArchiveEnabled(enabled: boolean): Promise<void> {
  const value = String(enabled);
  await prisma.appSetting.upsert({
    where: { key: WIKI_ARCHIVE_KEY },
    create: { key: WIKI_ARCHIVE_KEY, value },
    update: { value },
  });
}
