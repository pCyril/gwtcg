/**
 * Import/update cards from the Guild Wars 1 wiki.
 *
 * Usage:
 *   npx tsx scripts/sync-wiki.ts             # skills + bosses + heroes + weapons + locations + items + lore
 *   npx tsx scripts/sync-wiki.ts --only=skills
 *   npx tsx scripts/sync-wiki.ts --only=bosses
 *   npx tsx scripts/sync-wiki.ts --only=heroes
 *   npx tsx scripts/sync-wiki.ts --only=weapons
 *   npx tsx scripts/sync-wiki.ts --only=locations
 *   npx tsx scripts/sync-wiki.ts --only=items
 *   npx tsx scripts/sync-wiki.ts --only=lore
 *
 * Requires outbound network access to wiki.guildwars.com (1 req/s, see
 * src/lib/wiki/client.ts) - not available in every sandboxed environment.
 * For local dev without network access, use `npm run db:seed` instead.
 */
import { prisma } from "@/lib/prisma";
import { WikiClient, pageUrl } from "@/lib/wiki/client";
import { parseSkill } from "@/lib/wiki/parseSkill";
import { parseNpc } from "@/lib/wiki/parseNpc";
import { parseWeapon } from "@/lib/wiki/parseWeapon";
import { parseLocation } from "@/lib/wiki/parseLocation";
import { parseItem } from "@/lib/wiki/parseItem";
import { parseLore } from "@/lib/wiki/parseLore";
import { recomputeRarity } from "@/lib/game/recomputeRarity";
import type { CardFamily, Prisma } from "@prisma/client";

const SKILL_CATEGORIES = [
  "Category:Common skills",
  "Category:Warrior skills",
  "Category:Ranger skills",
  "Category:Monk skills",
  "Category:Necromancer skills",
  "Category:Mesmer skills",
  "Category:Elementalist skills",
  "Category:Assassin skills",
  "Category:Ritualist skills",
  "Category:Paragon skills",
  "Category:Dervish skills",
].map((c) => c.replace(" ", "_"));

// "Category:Bosses" itself only holds subcategory links (no direct boss
// pages), and "Category:Monsters" doesn't exist on this wiki - the real boss
// pages live in these profession/anonymous leaf categories (confirmed live).
const BOSS_CATEGORIES = [
  "Category:Assassin bosses",
  "Category:Dervish bosses",
  "Category:Elementalist bosses",
  "Category:Mesmer bosses",
  "Category:Monk bosses",
  "Category:Necromancer bosses",
  "Category:Paragon bosses",
  "Category:Ranger bosses",
  "Category:Ritualist bosses",
  "Category:Warrior bosses",
  "Category:Bosses with multiple professions",
  "Category:Anonymous bosses",
  "Category:Bosses without skills",
].map((c) => c.replace(/ /g, "_"));

// Playable AI hero companions (Prophecies onward) - same {{NPC infobox}}
// template as monsters/bosses, just filed under campaign-specific categories.
const HERO_CATEGORIES = [
  "Category:Core heroes",
  "Category:Prophecies heroes",
  "Category:Factions heroes",
  "Category:Nightfall heroes",
  "Category:Eye of the North heroes",
  "Category:Beyond heroes",
].map((c) => c.replace(/ /g, "_"));

// Green/unique weapons (fixed stats, always legendary-tier via dataBonus below).
const UNIQUE_WEAPON_CATEGORIES = [
  "Category:Unique swords",
  "Category:Unique axes",
  "Category:Unique bows",
  "Category:Unique daggers",
  "Category:Unique hammers",
  "Category:Unique scythes",
  "Category:Unique shields",
  "Category:Unique spears",
  "Category:Unique staves",
  "Category:Unique wands",
  "Category:Unique focus items",
].map((c) => c.replace(/ /g, "_"));

// Generic weapon skins (random white/blue/purple/gold drops - no wiki rarity
// signal, so they're scored the same way as skills/bosses).
const WEAPON_SKIN_CATEGORIES = [
  "Category:Swords",
  "Category:Axes",
  "Category:Bows",
  "Category:Daggers",
  "Category:Hammers",
  "Category:Scythes",
  "Category:Shields",
  "Category:Spears",
  "Category:Staves",
  "Category:Wands",
  "Category:Focus items",
].map((c) => c.replace(/ /g, "_"));

const WEAPON_CATEGORIES = [...UNIQUE_WEAPON_CATEGORIES, ...WEAPON_SKIN_CATEGORIES];

// Every location "type" as its own wiki category (no single umbrella category
// covers them all - confirmed live: Lion's Arch is in "Ports", Doomlore
// Shrine in "Towns", neither in "Outposts" despite being outpost-like).
const LOCATION_CATEGORIES = [
  "Category:Explorable areas",
  "Category:Outposts",
  "Category:Towns",
  "Category:Ports",
  "Category:Missions",
  "Category:Dungeons",
  "Category:Arenas",
  "Category:Guild halls",
].map((c) => c.replace(/ /g, "_"));

// Curated leaf categories under the sprawling "Category:Items" tree - the
// well-known, cleanly-templated item groups (armor/salvage-only categories
// deliberately left out as noisier/lower-signal - confirmed live).
const ITEM_CATEGORIES = [
  "Category:Common crafting materials",
  "Category:Rare crafting materials",
  "Category:Miniatures",
  "Category:Quest items",
  "Category:Keys",
  "Category:Currencies",
  "Category:Consumables",
].map((c) => c.replace(/ /g, "_"));

// "Category:Lore" itself is genuinely tiny on this wiki (~13 direct pages) -
// almost everything under it is further subcategories with barely any direct
// members of their own (confirmed live), so "Game storylines" is the only
// other leaf worth pulling in.
const LORE_CATEGORIES = ["Category:Lore", "Category:Game storylines"].map((c) => c.replace(/ /g, "_"));

const SKIP_TITLE_PREFIXES = ["List of", "Category:"];
const MIN_PAGE_LENGTH = 300;

function shouldSkipTitle(title: string): boolean {
  return SKIP_TITLE_PREFIXES.some((p) => title.startsWith(p));
}

function isRedirect(wikitext: string): boolean {
  return /^\s*#REDIRECT/i.test(wikitext);
}

function skillExtract(parsed: NonNullable<ReturnType<typeof parseSkill>>): string {
  const text = parsed.conciseDescription || parsed.description || (parsed.profession ? `${parsed.profession} skill.` : "Skill.");
  return text.length > 280 ? `${text.slice(0, 277)}...` : text;
}

function npcExtract(parsed: NonNullable<ReturnType<typeof parseNpc>>): string {
  const parts: string[] = [];
  const kind = parsed.isBoss ? "Boss" : "Monster";
  const level = parsed.hardModeLevel ? `level ${parsed.level} (${parsed.hardModeLevel} in Hard Mode)` : parsed.level ? `level ${parsed.level}` : null;
  parts.push([kind, parsed.species, level].filter(Boolean).join(" "));
  if (parsed.affiliation) parts.push(`Affiliated with ${parsed.affiliation}.`);
  if (parsed.locationText) parts.push(`Found: ${parsed.locationText}.`);
  if (parsed.campaign) parts.push(`Campaign: ${parsed.campaign}.`);
  return parts.filter(Boolean).join(" ");
}

function heroExtract(parsed: NonNullable<ReturnType<typeof parseNpc>>): string {
  const parts: string[] = [];
  const professions = [parsed.profession, parsed.profession2].filter(Boolean).join(" / ");
  parts.push(["Hero", professions].filter(Boolean).join(" "));
  if (parsed.affiliation) parts.push(`Affiliated with ${parsed.affiliation}.`);
  if (parsed.campaign) parts.push(`Campaign: ${parsed.campaign}.`);
  return parts.filter(Boolean).join(" ");
}

function locationExtract(parsed: NonNullable<ReturnType<typeof parseLocation>>): string {
  const parts: string[] = [];
  const kind = [parsed.profession, parsed.region ? `in ${parsed.region}` : null].filter(Boolean).join(" ");
  if (kind) parts.push(`${kind}.`);
  if (parsed.campaign) parts.push(`Campaign: ${parsed.campaign}.`);
  return parts.filter(Boolean).join(" ");
}

function itemExtract(parsed: NonNullable<ReturnType<typeof parseItem>>): string {
  const parts: string[] = [];
  if (parsed.profession) parts.push(`${parsed.profession}.`);
  if (parsed.campaign) parts.push(`Campaign: ${parsed.campaign}.`);
  return parts.filter(Boolean).join(" ") || "Item.";
}

function weaponExtract(parsed: NonNullable<ReturnType<typeof parseWeapon>>): string {
  if (!parsed.isUnique) {
    const parts = [parsed.weaponType, parsed.damageType?.toLowerCase() ?? null];
    return `Weapon (${[...parts.filter(Boolean)].join(", ")}).`;
  }
  const parts: string[] = [`Unique ${parsed.weaponType ?? "weapon"}.`];
  if (parsed.damageMin !== null && parsed.requirement !== null) {
    parts.push(`Damage ${parsed.damageMin}-${parsed.damageMax} (requires ${parsed.requirement} ${parsed.attribute ?? ""}).`.trim());
  }
  if (parsed.bonuses.length) parts.push(parsed.bonuses.slice(0, 2).join(" "));
  return parts.join(" ");
}

async function syncFamily<T extends { campaign?: string | null; profession?: string | null }>(
  client: WikiClient,
  categories: string[],
  family: CardFamily,
  parsePage: (wikitext: string, title: string) => T | null,
  buildExtract: (parsed: T) => string,
  buildAttributes: (parsed: T) => Record<string, unknown>,
  minPageLength = MIN_PAGE_LENGTH,
  shouldSkipParsed?: (parsed: T) => boolean,
) {
  const seen = new Set<string>();
  const titles: string[] = [];
  for (const category of categories) {
    console.log(`Fetching category members: ${category}`);
    const members = await client.getCategoryMembers(category);
    for (const title of members) {
      if (!seen.has(title) && !shouldSkipTitle(title)) {
        seen.add(title);
        titles.push(title);
      }
    }
    console.log(`  ${members.length} members (${seen.size} unique so far)`);
  }

  let imported = 0;
  for (let i = 0; i < titles.length; i++) {
    const title = titles[i];
    const page = await client.getPage(title);
    if (!page || isRedirect(page.wikitext) || page.wikitext.trim().length < minPageLength) {
      continue;
    }

    const parsed = parsePage(page.wikitext, title);
    if (!parsed || shouldSkipParsed?.(parsed)) continue;

    const backlinks = await client.getBacklinksCount(title);

    const wikiPage = await prisma.wikiPage.upsert({
      where: { title },
      create: {
        title,
        url: pageUrl(title),
        revisionId: page.revisionId,
        categories: page.categories,
        extract: buildExtract(parsed),
        backlinks,
        contentLength: page.wikitext.length,
      },
      update: {
        url: pageUrl(title),
        revisionId: page.revisionId,
        categories: page.categories,
        extract: buildExtract(parsed),
        backlinks,
        contentLength: page.wikitext.length,
        syncedAt: new Date(),
      },
    });

    await prisma.card.upsert({
      where: { wikiPageId_variantKey: { wikiPageId: wikiPage.id, variantKey: "DEFAULT" } },
      create: {
        wikiPageId: wikiPage.id,
        family,
        campaign: parsed.campaign ?? null,
        profession: parsed.profession ?? null,
        attributes: buildAttributes(parsed) as Prisma.InputJsonValue,
      },
      update: {
        campaign: parsed.campaign ?? null,
        profession: parsed.profession ?? null,
        attributes: buildAttributes(parsed) as Prisma.InputJsonValue,
      },
    });

    imported += 1;
    if (imported % 25 === 0) {
      console.log(`  progress: ${i + 1}/${titles.length} pages checked, ${imported} imported`);
    }
  }

  console.log(`Done with ${family}: ${imported} cards imported/updated out of ${titles.length} candidate pages`);
}

/**
 * Weapons: one card per wiki page like every other family, but their rarity is
 * ranked among weapons only (recomputeRarity), Common..Legendary - Mythic
 * weapons are picked by hand by an admin.
 */
async function syncWeaponFamily(client: WikiClient) {
  const seen = new Set<string>();
  const titles: string[] = [];
  for (const category of WEAPON_CATEGORIES) {
    console.log(`Fetching category members: ${category}`);
    const members = await client.getCategoryMembers(category);
    for (const title of members) {
      if (!seen.has(title) && !shouldSkipTitle(title)) {
        seen.add(title);
        titles.push(title);
      }
    }
    console.log(`  ${members.length} members (${seen.size} unique so far)`);
  }

  let imported = 0;
  for (let i = 0; i < titles.length; i++) {
    const title = titles[i];
    const page = await client.getPage(title);
    // Generic weapon skins are often just a bare infobox with no prose body,
    // unlike skill/boss pages - a 300-char floor would wrongly drop them.
    if (!page || isRedirect(page.wikitext) || page.wikitext.trim().length < 60) {
      continue;
    }

    const parsed = parseWeapon(page.wikitext, title);
    if (!parsed) continue;

    const backlinks = await client.getBacklinksCount(title);
    const attributes = parsed as unknown as Record<string, unknown>;

    const wikiPage = await prisma.wikiPage.upsert({
      where: { title },
      create: {
        title,
        url: pageUrl(title),
        revisionId: page.revisionId,
        categories: page.categories,
        extract: weaponExtract(parsed),
        backlinks,
        contentLength: page.wikitext.length,
      },
      update: {
        url: pageUrl(title),
        revisionId: page.revisionId,
        categories: page.categories,
        extract: weaponExtract(parsed),
        backlinks,
        contentLength: page.wikitext.length,
        syncedAt: new Date(),
      },
    });

    await prisma.card.upsert({
      where: { wikiPageId_variantKey: { wikiPageId: wikiPage.id, variantKey: "DEFAULT" } },
      create: {
        wikiPageId: wikiPage.id,
        variantKey: "DEFAULT",
        family: "WEAPON",
        campaign: parsed.campaign ?? null,
        profession: parsed.profession ?? null,
        attributes: attributes as Prisma.InputJsonValue,
      },
      // Rarity is never touched here - recomputeRarity() ranks weapons afterwards.
      update: {
        campaign: parsed.campaign ?? null,
        profession: parsed.profession ?? null,
        attributes: attributes as Prisma.InputJsonValue,
      },
    });

    imported += 1;
    if (imported % 25 === 0) {
      console.log(`  progress: ${i + 1}/${titles.length} pages checked, ${imported} imported`);
    }
  }

  console.log(`Done with WEAPON: ${imported} pages imported/updated out of ${titles.length} candidate pages`);
}

async function main() {
  const only = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1];
  const client = new WikiClient();

  if (!only || only === "skills") {
    await syncFamily(
      client,
      SKILL_CATEGORIES,
      "SKILL",
      parseSkill,
      skillExtract,
      (p) => ({ ...p, isBoss: false }),
      MIN_PAGE_LENGTH,
      (p) => p.isPvpVariant,
    );
  }

  if (!only || only === "bosses") {
    await syncFamily(
      client,
      BOSS_CATEGORIES,
      "BOSS",
      parseNpc,
      npcExtract,
      (p) => ({ ...p }),
    );
  }

  if (!only || only === "heroes") {
    await syncFamily(
      client,
      HERO_CATEGORIES,
      "HERO_NPC",
      parseNpc,
      heroExtract,
      (p) => ({ ...p, isMajorLoreCharacter: true }),
    );
  }

  if (!only || only === "weapons") {
    await syncWeaponFamily(client);
  }

  if (!only || only === "locations") {
    await syncFamily(client, LOCATION_CATEGORIES, "LOCATION", parseLocation, locationExtract, (p) => ({ ...p }));
  }

  if (!only || only === "items") {
    await syncFamily(client, ITEM_CATEGORIES, "ITEM", parseItem, itemExtract, (p) => ({ ...p }));
  }

  if (!only || only === "lore") {
    await syncFamily(client, LORE_CATEGORIES, "LORE", parseLore, (p) => p.extract, (p) => ({ ...p }));
  }

  await recomputeRarity();
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
