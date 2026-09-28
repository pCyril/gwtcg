/**
 * Parser for the {{Location infobox}} template, shared by every explorable
 * area, outpost, town, port, mission, dungeon, arena and guild hall on the
 * wiki. Field names confirmed against live wiki pages (Lion's Arch, The
 * Falls, Doomlore Shrine, Kessex Peak) - see project notes.
 */
import { cleanWikiMarkup } from "@/lib/wiki/parseSkill";

export interface ParsedLocation {
  name: string;
  campaign: string | null;
  profession: string | null; // holds the location type ("Explorable area", "Outpost", ...), reusing the same card slot skills/bosses/weapons use
  region: string | null;
}

function extractInfobox(wikitext: string): string | null {
  const match = /\{\{Location\s+infobox/i.exec(wikitext);
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
  let inner = infobox.replace(/^\{\{Location\s+infobox\s*/i, "");
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

/** Parse wikitext into a location record. Returns null if there's no Location infobox. */
export function parseLocation(wikitext: string, pageTitle: string): ParsedLocation | null {
  const infobox = extractInfobox(wikitext);
  if (!infobox) return null;

  const fields = parseFields(infobox);
  if (Object.keys(fields).length === 0) return null;

  return {
    name: pageTitle,
    campaign: fields.campaign ? cleanWikiMarkup(fields.campaign) || null : null,
    profession: fields.type ? cleanWikiMarkup(fields.type) || null : null,
    region: fields.region ? cleanWikiMarkup(fields.region) || null : null,
  };
}
