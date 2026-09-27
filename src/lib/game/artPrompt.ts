import type { CardData } from "@/components/CardTile";
import { t, translations, type Locale, type TranslationKey } from "@/lib/i18n/translations";

/** Recommended art-window aspect ratio, measured live against the rendered CardTile. */
export const RECOMMENDED_ART_RATIO = "3:2";
export const RECOMMENDED_ART_RESOLUTION = "1200x800px";

export function buildArtPrompt(
  locale: Locale,
  card: Pick<CardData, "title" | "family" | "campaign" | "extract">,
): string {
  const familyKey = `art.subject.${card.family}`;
  const hasFamilyKey = Object.prototype.hasOwnProperty.call(translations.fr, familyKey);
  const subject = t(locale, (hasFamilyKey ? familyKey : "art.subject.default") as TranslationKey);
  const campaign = card.campaign ? ` (${card.campaign})` : "";

  return [
    t(locale, "art.promptIntro"),
    t(locale, "art.promptSubject", { subject, title: card.title, campaign, extract: card.extract }),
    t(locale, "art.promptReference"),
    t(locale, "art.promptFormat", { ratio: RECOMMENDED_ART_RATIO, resolution: RECOMMENDED_ART_RESOLUTION }),
  ].join("\n");
}
