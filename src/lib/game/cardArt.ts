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
