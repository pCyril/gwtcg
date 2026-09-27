/**
 * Parser for the {{Weapon infobox}} template, shared by every weapon page on
 * the wiki - both fixed green/unique items (`unique = yes`) and generic
 * skins that drop in random white/blue/purple/gold rolls. Confirmed against
 * live wiki pages (Droknar's Sword, Fiery Dragon Sword) - see project notes.
 *
 * Crucially, the wiki carries NO white/blue/purple/gold color signal on
 * generic skin pages - only `unique = yes` distinguishes green items. Rarity
 * for non-green weapons is assigned the same way as skills/bosses: via the
 * backlinks/page-length score in src/lib/game/rarity.ts.
 */
import { cleanWikiMarkup } from "@/lib/wiki/parseSkill";

export interface ParsedWeapon {
  name: string;
  campaign: string | null;
  profession: string | null; // holds the attribute name (e.g. "Swordsmanship"), reusing the same card slot skills/bosses use
  weaponType: string | null;
  attribute: string | null;
  damageType: string | null;
  isUnique: boolean;
  damageMin: number | null;
  damageMax: number | null;
  requirement: number | null;
  bonuses: string[];
}

function extractInfobox(wikitext: string): string | null {
  const match = /\{\{Weapon\s+infobox/i.exec(wikitext);
  if (!match) return null;

  const start = match.index;
  let depth = 0;
  let i = start;
  while (i < wikitext.length) {
    if (wikitext.slice(i, i + 2) === "{{") {
      depth += 1;
      i += 2;
    } else if (wikitext.slice(i, i + 2) === "}}") {
      depth -= 1;
      if (depth === 0) return wikitext.slice(start, i + 2);
      i += 2;
    } else {
      i += 1;
    }
  }
  return null;
}

function parseFields(infobox: string): Record<string, string> {
  let inner = infobox.replace(/^\{\{Weapon\s+infobox\s*/i, "");
  inner = inner.replace(/\}\}\s*$/, "");

  const fields: Record<string, string> = {};
  for (const rawPart of inner.split(/\n\s*\|/)) {
    const part = rawPart.trim().replace(/^\|/, "").trim();
    if (!part.includes("=")) continue;
    const idx = part.indexOf("=");
    const key = part.slice(0, idx).trim().toLowerCase();
    const value = part.slice(idx + 1).trim();
    if (key && value) fields[key] = value;
  }
  return fields;
}

function stripLink(value: string | undefined): string | null {
  if (!value) return null;
  const cleaned = cleanWikiMarkup(value);
  return cleaned || null;
}

/** Pull the prose ==Stats== section (fixed rolls, only present on unique items). */
function extractStatsSection(wikitext: string): string | null {
  const match = /==\s*Stats\s*==\s*([\s\S]*?)(?=\n==|$)/i.exec(wikitext);
  return match ? match[1].trim() : null;
}

function parseStats(statsText: string | null): {
  damageMin: number | null;
  damageMax: number | null;
  requirement: number | null;
  bonuses: string[];
} {
  if (!statsText) return { damageMin: null, damageMax: null, requirement: null, bonuses: [] };

  const lines = statsText
    .split("\n")
    .map((l) => cleanWikiMarkup(l.replace(/^\*+\s*/, "")))
    .filter(Boolean);

  let damageMin: number | null = null;
  let damageMax: number | null = null;
  let requirement: number | null = null;
  const bonuses: string[] = [];

  const damageRe = /(\d+)\s*-\s*(\d+).*?Requires?\s*(\d+)/i;

  for (const line of lines) {
    const dmgMatch = damageRe.exec(line);
    if (dmgMatch && damageMin === null) {
      damageMin = Number.parseInt(dmgMatch[1], 10);
      damageMax = Number.parseInt(dmgMatch[2], 10);
      requirement = Number.parseInt(dmgMatch[3], 10);
      continue;
    }
    bonuses.push(line);
  }

  return { damageMin, damageMax, requirement, bonuses };
}

/** Parse wikitext into a weapon record. Returns null if there's no Weapon infobox. */
export function parseWeapon(wikitext: string, pageTitle: string): ParsedWeapon | null {
  const infobox = extractInfobox(wikitext);
  if (!infobox) return null;

  const fields = parseFields(infobox);
  if (Object.keys(fields).length === 0) return null;

  const isUnique = (fields.unique ?? "").trim().toLowerCase() === "yes";
  const stats = isUnique ? parseStats(extractStatsSection(wikitext)) : parseStats(null);

  return {
    name: pageTitle,
    campaign: stripLink(fields.campaign),
    profession: stripLink(fields.attribute),
    weaponType: stripLink(fields.type),
    attribute: stripLink(fields.attribute),
    damageType: stripLink(fields.damagetype),
    isUnique,
    ...stats,
  };
}
