import type { CardData } from "@/components/CardTile";
import { t, translations, type Locale, type TranslationKey } from "@/lib/i18n/translations";

/** Recommended art-window aspect ratio, measured live against the rendered CardTile. */
export const RECOMMENDED_ART_RATIO = "3:2";
export const RECOMMENDED_ART_RESOLUTION = "1200x800px";

type GearKey = "bow" | "staff" | "axeShield" | "swordShield" | "meleeShield" | "hammer" | "scythe" | "spearShield" | "daggers";

const CASTER_PROFESSIONS = ["monk", "mesmer", "necromancer", "elementalist", "ritualist"];

/**
 * What the character in a skill's illustration should be holding. Skills are
 * drawn as their profession's hero using the skill, so the gear follows the
 * profession; warriors depend on the skill itself ("Hammer Attack" -> a
 * two-handed hammer, "Axe Attack" -> axe and shield, ...).
 */
function skillGear(profession: string | null | undefined, attributes: CardData["attributes"]): GearKey | null {
  const p = (profession ?? "").toLowerCase();
  if (CASTER_PROFESSIONS.includes(p)) return "staff";
  switch (p) {
    case "ranger":
      return "bow";
    case "dervish":
      return "scythe";
    case "paragon":
      return "spearShield";
    case "assassin":
      return "daggers";
    case "warrior": {
      const type = String(attributes?.type ?? "").toLowerCase();
      const attribute = String(attributes?.attribute ?? "").toLowerCase();
      if (type.startsWith("hammer") || attribute === "hammer mastery") return "hammer";
      if (type.startsWith("axe") || attribute === "axe mastery") return "axeShield";
      if (type.startsWith("sword") || attribute === "swordsmanship") return "swordShield";
      return "meleeShield";
    }
    default:
      return null;
  }
}

export function buildArtPrompt(
  locale: Locale,
  card: Pick<CardData, "title" | "family" | "campaign" | "extract" | "profession" | "attributes">,
): string {
  const familyKey = `art.subject.${card.family}`;
  const hasFamilyKey = Object.prototype.hasOwnProperty.call(translations.fr, familyKey);
  const subject = t(locale, (hasFamilyKey ? familyKey : "art.subject.default") as TranslationKey);
  const campaign = card.campaign ? ` (${card.campaign})` : "";

  const gear = card.family === "SKILL" ? skillGear(card.profession, card.attributes) : null;

  return [
    t(locale, "art.promptIntro"),
    t(locale, "art.promptSubject", { subject, title: card.title, campaign, extract: card.extract }),
    ...(gear
      ? [
          t(locale, "art.promptSkillCharacter", {
            profession: card.profession ?? "",
            gear: t(locale, `art.gear.${gear}` as TranslationKey),
          }),
        ]
      : []),
    // Weapons must keep the exact shape of the real item, so they get a fidelity
    // instruction instead of the generic "reinterpret it freely" one.
    t(locale, card.family === "WEAPON" ? "art.promptReferenceWeapon" : "art.promptReference"),
    t(locale, "art.promptFormat", { ratio: RECOMMENDED_ART_RATIO, resolution: RECOMMENDED_ART_RESOLUTION }),
  ].join("\n");
}
