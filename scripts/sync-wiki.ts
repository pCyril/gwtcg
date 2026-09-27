/**
 * Import/update cards from the Guild Wars 1 wiki.
 *
 * Usage:
 *   npx tsx scripts/sync-wiki.ts             # skills + bosses + heroes + weapons
 *   npx tsx scripts/sync-wiki.ts --only=skills
 *   npx tsx scripts/sync-wiki.ts --only=bosses
 *   npx tsx scripts/sync-wiki.ts --only=heroes
 *   npx tsx scripts/sync-wiki.ts --only=weapons
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
import {
  dataBonus,
  forcedRarityFor,
  forcedSkillRarity,
  scoreAndRankCardsByFamily,
  WEAPON_QUALITY_TIERS,
} from "@/lib/game/rarity";
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

const SKIP_TITLE_PREFIXES = ["List of", "Category:"];
const MIN_PAGE_LENGTH = 300;

function shouldSkipTitle(title: string): boolean {
  return SKIP_TITLE_PREFIXES.some((p) => title.startsWith(p));
}

function isRedirect(wikitext: string): boolean {
  return /^\s*#REDIRECT/i.test(wikitext);
}

function skillExtract(parsed: NonNullable<ReturnType<typeof parseSkill>>): string {
  const text = parsed.conciseDescription || parsed.description || `Compétence ${parsed.profession ?? ""}.`.trim();
  return text.length > 280 ? `${text.slice(0, 277)}...` : text;
}

function npcExtract(parsed: NonNullable<ReturnType<typeof parseNpc>>): string {
  const parts: string[] = [];
  const kind = parsed.isBoss ? "Boss" : "Monstre";
  const level = parsed.hardModeLevel ? `niveau ${parsed.level} (${parsed.hardModeLevel} en mode difficile)` : parsed.level ? `niveau ${parsed.level}` : null;
  parts.push([kind, parsed.species, level].filter(Boolean).join(" "));
  if (parsed.affiliation) parts.push(`Affilié à ${parsed.affiliation}.`);
  if (parsed.locationText) parts.push(`Rencontré : ${parsed.locationText}.`);
  if (parsed.campaign) parts.push(`Campagne ${parsed.campaign}.`);
  return parts.filter(Boolean).join(" ");
}

function heroExtract(parsed: NonNullable<ReturnType<typeof parseNpc>>): string {
  const parts: string[] = [];
  const professions = [parsed.profession, parsed.profession2].filter(Boolean).join(" / ");
  parts.push(["Héros", professions].filter(Boolean).join(" "));
  if (parsed.affiliation) parts.push(`Affilié à ${parsed.affiliation}.`);
  if (parsed.campaign) parts.push(`Campagne ${parsed.campaign}.`);
  return parts.filter(Boolean).join(" ");
}

function weaponExtract(parsed: NonNullable<ReturnType<typeof parseWeapon>>): string {
  if (!parsed.isUnique) {
    const parts = [parsed.weaponType, parsed.damageType ? `dégâts ${parsed.damageType.toLowerCase()}` : null];
    return `Arme (${[...parts.filter(Boolean)].join(", ")}). Rareté variable selon le tirage en jeu.`;
  }
  const parts: string[] = [`${parsed.weaponType ?? "Arme"} unique.`];
  if (parsed.damageMin !== null && parsed.requirement !== null) {
    parts.push(`Dégâts ${parsed.damageMin}-${parsed.damageMax} (requiert ${parsed.requirement} ${parsed.attribute ?? ""}).`.trim());
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
 * Weapons don't fit the generic one-card-per-page shape: a green/unique
 * weapon is one fixed-stat card (forced Legendary, as before), but a generic
 * skin can actually drop in white/blue/purple/gold in-game, so it gets one
 * card per real quality tier instead of a single percentile-derived rarity.
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

    const tiers = parsed.isUnique ? [{ variantKey: "DEFAULT", rarity: "LEGENDARY" as const }] : WEAPON_QUALITY_TIERS;

    for (const tier of tiers) {
      await prisma.card.upsert({
        where: { wikiPageId_variantKey: { wikiPageId: wikiPage.id, variantKey: tier.variantKey } },
        create: {
          wikiPageId: wikiPage.id,
          variantKey: tier.variantKey,
          family: "WEAPON",
          campaign: parsed.campaign ?? null,
          profession: parsed.profession ?? null,
          attributes: attributes as Prisma.InputJsonValue,
          rarity: tier.rarity,
        },
        update: {
          campaign: parsed.campaign ?? null,
          profession: parsed.profession ?? null,
          attributes: attributes as Prisma.InputJsonValue,
          rarity: tier.rarity,
        },
      });
    }

    imported += 1;
    if (imported % 25 === 0) {
      console.log(`  progress: ${i + 1}/${titles.length} pages checked, ${imported} imported`);
    }
  }

  console.log(`Done with WEAPON: ${imported} pages imported/updated out of ${titles.length} candidate pages`);
}

async function recomputeRarity() {
  console.log("Recomputing rarity within each family...");
  // Weapons set their own rarity directly at creation time (syncWeaponFamily) -
  // fixed per quality tier, never revised by percentile scoring.
  const cards = await prisma.card.findMany({ where: { family: { not: "WEAPON" } }, include: { wikiPage: true } });

  const inputs = cards.map((card) => {
    const attrs = card.attributes as Record<string, unknown>;

    if (card.family === "SKILL") {
      return {
        id: card.id,
        family: card.family,
        backlinks: 0,
        wikitextLength: 0,
        bonus: 0,
        forcedRarity: forcedSkillRarity({
          isElite: Boolean(attrs.isElite),
          isPveOnly: Boolean(attrs.isPveOnly),
          campaign: card.campaign,
        }),
      };
    }

    const traits = {
      isElite: Boolean(attrs.isElite),
      isBoss: Boolean(attrs.isBoss),
      isUniqueGreenItem: Boolean(attrs.isUnique),
      isMajorLoreCharacter: Boolean(attrs.isMajorLoreCharacter),
    };
    return {
      id: card.id,
      family: card.family,
      backlinks: card.wikiPage.backlinks,
      wikitextLength: card.wikiPage.contentLength,
      bonus: dataBonus(traits),
      forcedRarity: forcedRarityFor(traits),
    };
  });

  const scored = scoreAndRankCardsByFamily(inputs);

  for (const s of scored) {
    await prisma.card.update({ where: { id: s.id }, data: { score: s.score, rarity: s.rarity } });
  }

  console.log(`Rarity updated for ${scored.length} cards.`);
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

  await recomputeRarity();
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
