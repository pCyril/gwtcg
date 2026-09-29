/**
 * Parser for the {{Item infobox}} template (case varies: "Item infobox" /
 * "item infobox"), shared by crafting materials, miniatures, quest items,
 * keys, currencies and consumables on the wiki. Field names confirmed
 * against live wiki pages (Bone, Miniature Aatxe, Ancient Parchment, Glob
 * of Ectoplasm, Alkar's Concoction) - see project notes.
 */
import { cleanWikiMarkup } from "@/lib/wiki/parseSkill";

export interface ParsedItem {
  name: string;
  campaign: string | null;
  profession: string | null; // holds the item type ("Miniature", "Common crafting material", ...), reusing the same card slot other families use
}

function extractInfobox(wikitext: string): string | null {
  const match = /\{\{[Ii]tem\s+infobox/.exec(wikitext);
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
  let inner = infobox.replace(/^\{\{[Ii]tem\s+infobox\s*/, "");
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

/** Parse wikitext into an item record. Returns null if there's no Item infobox. */
export function parseItem(wikitext: string, pageTitle: string): ParsedItem | null {
  const infobox = extractInfobox(wikitext);
  if (!infobox) return null;

  const fields = parseFields(infobox);
  if (Object.keys(fields).length === 0) return null;

  // Quest items use `questitem = [[Some Quest]]` instead of a `type` label.
  const rawType = fields.type ?? (fields.questitem ? "Quest item" : undefined);

  return {
    name: pageTitle,
    campaign: fields.campaign ? cleanWikiMarkup(fields.campaign) || null : null,
    profession: rawType ? cleanWikiMarkup(rawType) || null : null,
  };
}
