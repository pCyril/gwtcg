/**
 * Deterministic, original placeholder art for a card's illustration band.
 * We never use real Guild Wars wiki images/icons here: those are ArenaNet/NCSoft
 * game assets, not covered by the wiki's GFDL text license (see project notes).
 * Each card instead gets a unique-but-stable gradient derived from its title.
 */

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function cardGradient(title: string): string {
  const hash = hashString(title);
  const hueA = hash % 360;
  const hueB = (hueA + 40 + (hash % 60)) % 360;
  return `linear-gradient(135deg, hsl(${hueA} 55% 22%) 0%, hsl(${hueB} 60% 12%) 100%)`;
}

// Real GW1 item-quality colors for a non-unique weapon skin's 4 variant cards.
const WEAPON_QUALITY_LABELS: Partial<Record<string, string>> = {
  COMMON: "Blanche",
  UNCOMMON: "Bleue",
  RARE: "Violette",
  EPIC: "Dorée",
};

/**
 * A non-unique weapon has up to 4 cards sharing the same wiki page - the base
 * title alone can't tell them apart, so the quality tier is appended for display.
 * Every other family/card keeps its plain title unchanged.
 */
export function displayCardTitle(
  baseTitle: string,
  family: string,
  rarity: string,
  attributes: Record<string, unknown>,
): string {
  if (family !== "WEAPON" || attributes.isUnique) return baseTitle;
  const label = WEAPON_QUALITY_LABELS[rarity];
  return label ? `${baseTitle} (${label})` : baseTitle;
}
