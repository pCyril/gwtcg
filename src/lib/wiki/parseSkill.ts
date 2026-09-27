/**
 * Parser for the {{Skill infobox}} template on the Guild Wars wiki.
 * Ported field-for-field from the proven parser in
 * guild-wars-build/src/scraper/wikitext_parser.py.
 */

const FRACTION_MAP: Record<string, string> = {
  "{{1/4}}": "0.25",
  "{{1/2}}": "0.5",
  "{{3/4}}": "0.75",
};

export interface ParsedSkill {
  skillId: number | null;
  name: string;
  campaign: string | null;
  profession: string | null;
  attribute: string | null;
  type: string;
  isElite: boolean;
  isPveOnly: boolean;
  isPvpVariant: boolean;
  energy: number | null;
  adrenaline: number | null;
  activation: number | null;
  recharge: number | null;
  rechargeNote: string | null;
  overcast: number | null;
  range: string | null;
  aoe: string | null;
  target: string | null;
  causes: string[] | null;
  description: string;
  conciseDescription: string;
}

function extractInfobox(wikitext: string): string | null {
  const match = /\{\{[Ss]kill\s+infobox/.exec(wikitext);
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
  let inner = infobox.replace(/^\{\{[Ss]kill\s+infobox\s*/, "");
  inner = inner.replace(/\}\}\s*$/, "");

  const fields: Record<string, string> = {};
  for (const rawPart of inner.split(/\n\|/)) {
    const part = rawPart.trim().replace(/^\|/, "").trim();
    if (!part.includes("=")) continue;
    const idx = part.indexOf("=");
    const key = part.slice(0, idx).trim().toLowerCase();
    const value = part.slice(idx + 1).trim();
    if (key && value) fields[key] = value;
  }
  return fields;
}

function stripHtmlComments(text: string): string {
  return text.replace(/<!--[\s\S]*?-->/g, "");
}

function applyFractions(value: string): string {
  let out = value;
  for (const [frac, decimal] of Object.entries(FRACTION_MAP)) {
    out = out.split(frac).join(decimal);
  }
  return out;
}

function parseInt_(value: string): number | null {
  const cleaned = applyFractions(stripHtmlComments(value).trim());
  const match = /^[\d.]+/.exec(cleaned);
  if (!match) return null;
  const num = Number.parseFloat(match[0]);
  return Number.isNaN(num) ? null : Math.trunc(num);
}

function parseReal(value: string): [number | null, string | null] {
  const cleaned = applyFractions(stripHtmlComments(value).trim());
  const match = /^[\d.]+/.exec(cleaned);
  if (match) {
    const num = Number.parseFloat(match[0]);
    return Number.isNaN(num) ? [null, cleaned] : [num, null];
  }
  if (cleaned) return [null, cleaned];
  return [null, null];
}

function isYes(value: string | undefined): boolean {
  return ["y", "yes", "true", "1"].includes((value ?? "").trim().toLowerCase());
}

export function cleanWikiMarkup(text: string | undefined): string {
  if (!text) return "";
  let out = stripHtmlComments(text);
  // MediaWiki sometimes injects invisible bidi-formatting characters (e.g. a
  // trailing left-to-right mark) around links, which silently fragments
  // otherwise-identical values like "Bonus Mission Pack" into two.
  out = out.replace(/[​-‏﻿]/g, "");
  // <br> is used both for real line breaks and to cram multiple values into one
  // infobox field (e.g. campaign = [[Nightfall]]<br>[[Eye of the North]]) - a
  // plain strip would glue the two sides together, so join them as a list instead.
  out = out.replace(/\s*<br\s*\/?>\s*/gi, ", ");
  out = out.replace(/\{\{gr\|(\d+)\|(\d+)\}\}/g, "$1...$2");
  out = out.replace(/\{\{gr2\|(\d+)\|(\d+)\}\}/g, "$1...$2");
  out = out.replace(/\{\{gr[ae]y\|(.+?)\}\}/g, "$1");
  out = applyFractions(out);
  out = out.replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, "$2");
  out = out.replace(/\[\[([^\]]+)\]\]/g, "$1");
  out = out.replace(/\{\{[^}]*\}\}/g, "");
  out = out.replace(/(,\s*){2,}/g, ", ");
  out = out.replace(/^,\s*|,\s*$/g, "");
  out = out.replace(/\s+/g, " ").trim();
  return out;
}

function collectIndexedFields(fields: Record<string, string>, prefix: string): string[] | null {
  const values: string[] = [];
  if (fields[prefix]) values.push(fields[prefix].trim());
  for (let i = 1; i < 20; i++) {
    const value = fields[`${prefix}${i}`];
    if (value?.trim()) values.push(value.trim());
  }
  return values.length ? values : null;
}

/** Parse wikitext into a skill record. Returns null if there's no Skill infobox. */
export function parseSkill(wikitext: string, pageTitle: string): ParsedSkill | null {
  const infobox = extractInfobox(wikitext);
  if (!infobox) return null;

  const fields = parseFields(infobox);
  if (Object.keys(fields).length === 0) return null;

  const type = fields.type;
  if (!type) return null;

  const skillId = fields.id ? parseInt_(fields.id) : null;
  const energy = fields.energy ? parseInt_(fields.energy) : null;
  const adrenaline = fields.adrenaline ? parseInt_(fields.adrenaline) : null;
  const overcast = fields.overcast ? parseInt_(fields.overcast) : null;

  const [activation] = fields.activation ? parseReal(fields.activation) : [null, null];
  const [recharge, rechargeNote] = fields.recharge ? parseReal(fields.recharge) : [null, null];

  const isElite = isYes(fields.elite);
  const isPveOnly = isYes(fields["pve-only"]) || isYes(fields["pve only"]);
  const isPvpVariant = isYes(fields["is-pvp"]) || isYes(fields["is pvp"]) || pageTitle.endsWith("(PvP)");

  return {
    skillId,
    name: pageTitle,
    campaign: fields.campaign ? cleanWikiMarkup(fields.campaign) || null : null,
    profession: fields.profession ?? null,
    attribute: fields.attribute ?? null,
    type,
    isElite,
    isPveOnly,
    isPvpVariant,
    energy,
    adrenaline,
    activation,
    recharge,
    rechargeNote,
    overcast,
    range: fields.range ?? null,
    aoe: fields.aoe ?? null,
    target: fields.target ?? null,
    causes: collectIndexedFields(fields, "causes"),
    description: cleanWikiMarkup(fields.description),
    conciseDescription: cleanWikiMarkup(fields["concise description"]),
  };
}
