/**
 * Parser for Lore pages - unlike every other family, these are free-form
 * narrative articles with no infobox at all (confirmed live: Magic, Tyria
 * (world), Ecology of Tyria). The "extract" is instead a cleaned-up snippet
 * of the page's actual intro paragraph, with leading banner templates
 * ({{rewrite|...}}, {{TOCright}}, ...) and lead images skipped first.
 */
import { cleanWikiMarkup } from "@/lib/wiki/parseSkill";

export interface ParsedLore {
  name: string;
  campaign: string | null; // lore concepts are generally campaign-agnostic - always null
  extract: string;
}

function skipBraceBlock(text: string, start: number): number {
  let depth = 0;
  let i = start;
  while (i < text.length) {
    if (text.slice(i, i + 2) === "{{") {
      depth += 1;
      i += 2;
    } else if (text.slice(i, i + 2) === "}}") {
      depth -= 1;
      i += 2;
      if (depth === 0) return i;
    } else {
      i += 1;
    }
  }
  return i;
}

function skipBracketBlock(text: string, start: number): number {
  let depth = 0;
  let i = start;
  while (i < text.length) {
    if (text.slice(i, i + 2) === "[[") {
      depth += 1;
      i += 2;
    } else if (text.slice(i, i + 2) === "]]") {
      depth -= 1;
      i += 2;
      if (depth === 0) return i;
    } else {
      i += 1;
    }
  }
  return i;
}

/** Strips leading banner templates and lead images so real prose is what's left at the front. */
function stripLeadingNoise(wikitext: string): string {
  let text = wikitext;
  for (;;) {
    text = text.trimStart();
    if (text.startsWith("{{")) {
      text = text.slice(skipBraceBlock(text, 0));
      continue;
    }
    if (/^\[\[\s*(File|Image):/i.test(text)) {
      text = text.slice(skipBracketBlock(text, 0));
      continue;
    }
    break;
  }
  return text;
}

function extractIntro(wikitext: string): string {
  const body = stripLeadingNoise(wikitext);
  const paragraph = body.split(/\n\s*\n|\n==/)[0] ?? "";
  const withoutEmphasis = paragraph.replace(/\n/g, " ").replace(/'{2,}/g, "");
  const cleaned = cleanWikiMarkup(withoutEmphasis);
  return cleaned.length > 280 ? `${cleaned.slice(0, 277)}...` : cleaned;
}

/** Parse wikitext into a lore record. Returns null if no meaningful intro text is found. */
export function parseLore(wikitext: string, pageTitle: string): ParsedLore | null {
  const extract = extractIntro(wikitext);
  if (extract.length < 20) return null;

  return {
    name: pageTitle,
    campaign: null,
    extract,
  };
}
