/**
 * Parser for the {{NPC infobox}} template, shared by regular monsters,
 * bosses (bosses simply set `boss = y`), and playable heroes (Koss, Gwen,
 * etc. - same template, just filed under hero categories instead of a boss
 * flag). Field names and quirks confirmed against live wiki pages (Arlak
 * Stoneleaf, Aguo Gruffmane, Alpha Tyrannus, Annihilator Golem, Cairn the
 * Berserker, Koss) - see project notes.
 */

import { cleanWikiMarkup } from "@/lib/wiki/parseSkill";

export interface ParsedNpc {
  name: string;
  isBoss: boolean;
  species: string | null;
  affiliation: string | null;
  profession: string | null;
  profession2: string | null;
  level: number | null;
  hardModeLevel: number | null;
  campaign: string | null;
  locationText: string | null;
}

function extractInfobox(wikitext: string): string | null {
  const match = /\{\{NPC\s+infobox/i.exec(wikitext);
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
  let inner = infobox.replace(/^\{\{NPC\s+infobox\s*/i, "");
  inner = inner.replace(/\}\}\s*$/, "");

  const fields: Record<string, string> = {};
  for (const rawPart of inner.split(/\n\s*\|/)) {
    const part = rawPart.trim().replace(/^\|/, "").trim();
    if (!part.includes("=")) continue;
    const idx = part.indexOf("=");
    const key = part.slice(0, idx).trim().toLowerCase();
    const value = part.slice(idx + 1).replace(/<!--[\s\S]*?-->/g, "").trim();
    if (key && value) fields[key] = value;
  }
  return fields;
}

// {{NPC infobox}} profession fields use short codes, unlike {{Skill infobox}}
// which spells them out - normalize to the same full names used everywhere else.
const PROFESSION_CODES: Record<string, string> = {
  w: "Warrior",
  r: "Ranger",
  mo: "Monk",
  n: "Necromancer",
  me: "Mesmer",
  e: "Elementalist",
  a: "Assassin",
  rt: "Ritualist",
  p: "Paragon",
  d: "Dervish",
};

function normalizeProfession(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  const code = PROFESSION_CODES[trimmed.toLowerCase()];
  if (code) return code;
  // Some pages spell the profession out in full instead of using the short code.
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

function stripWikiLinks(value: string | undefined): string | null {
  if (!value) return null;
  const withoutFiles = value.replace(/\[\[File:[^\]]*\]\]/gi, "");
  const cleaned = cleanWikiMarkup(withoutFiles);
  return cleaned || null;
}

/** "28 (30)" -> [28, 30]; "30" -> [30, null]. */
function parseLevel(value: string | undefined): [number | null, number | null] {
  if (!value) return [null, null];
  const match = /(\d+)\s*(?:\((\d+)\))?/.exec(value);
  if (!match) return [null, null];
  const level = Number.parseInt(match[1], 10);
  const hardMode = match[2] ? Number.parseInt(match[2], 10) : null;
  return [Number.isNaN(level) ? null : level, hardMode];
}

/** Parse wikitext into an NPC record. Returns null if there's no NPC infobox. */
export function parseNpc(wikitext: string, pageTitle: string): ParsedNpc | null {
  const infobox = extractInfobox(wikitext);
  if (!infobox) return null;

  const fields = parseFields(infobox);
  if (Object.keys(fields).length === 0) return null;

  const [level, hardModeLevel] = parseLevel(fields.level);

  return {
    name: pageTitle,
    isBoss: (fields.boss ?? "").trim().toLowerCase() === "y",
    species: fields.type ?? null,
    affiliation: stripWikiLinks(fields.affiliation),
    profession: normalizeProfession(fields.profession),
    profession2: normalizeProfession(fields.profession2),
    level,
    hardModeLevel,
    campaign: fields.campaign ? cleanWikiMarkup(fields.campaign) || null : null,
    locationText: stripWikiLinks(fields["map1-text"]),
  };
}
