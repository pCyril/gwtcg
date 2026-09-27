/**
 * Rarity scoring, per the GWTCG spec:
 *   score = 40% backlinks normalisés + 40% bonus de données + 20% longueur de page normalisée
 * Thresholds are recomputed on every sync over the whole imported corpus so the
 * target shares below stay roughly accurate as the corpus grows.
 */

export type Rarity = "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY" | "MYTHIC";

// Defaults, overridable per-tier via .env (RARITY_SHARE_COMMON, etc.) - see
// README/`.env` for the full list. Values don't need to sum to 1: they're
// renormalized below, so e.g. doubling one tier just shifts the balance
// without having to recompute every other percentage by hand.
const DEFAULT_SHARES: Record<Rarity, number> = {
  MYTHIC: 0.01,
  LEGENDARY: 0.05,
  EPIC: 0.09,
  RARE: 0.15,
  UNCOMMON: 0.25,
  COMMON: 0.45,
};

function configuredShare(rarity: Rarity): number {
  const raw = process.env[`RARITY_SHARE_${rarity}`];
  if (raw === undefined || raw === "") return DEFAULT_SHARES[rarity];
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_SHARES[rarity];
}

const rawShares: { rarity: Rarity; share: number }[] = (
  ["MYTHIC", "LEGENDARY", "EPIC", "RARE", "UNCOMMON", "COMMON"] as const
).map((rarity) => ({ rarity, share: configuredShare(rarity) }));

const totalShare = rawShares.reduce((sum, s) => sum + s.share, 0);

// Ordered from rarest to most common; `share` is the target fraction of the
// corpus (percentile classification) and the target draw probability
// (weighted booster pulls) - see scoreAndRankCards / booster.ts.
export const RARITY_TARGET_SHARES: { rarity: Rarity; share: number }[] =
  totalShare > 0 ? rawShares.map((s) => ({ rarity: s.rarity, share: s.share / totalShare })) : rawShares;

export interface DataBonusInput {
  isElite?: boolean;
  isBoss?: boolean;
  isUniqueGreenItem?: boolean;
  isMajorLoreCharacter?: boolean;
}

export function dataBonus(input: DataBonusInput): number {
  let bonus = 0;
  if (input.isElite) bonus += 30;
  if (input.isBoss) bonus += 20;
  if (input.isUniqueGreenItem) bonus += 40;
  if (input.isMajorLoreCharacter) bonus += 50;
  return Math.min(bonus, 100);
}

/**
 * Some traits guarantee a tier outright rather than just nudging a score -
 * a green weapon is never "common", regardless of how percentile math with a
 * small sample would round. Percentile ranking still decides the rest.
 */
export function forcedRarityFor(input: DataBonusInput): Rarity | undefined {
  if (input.isMajorLoreCharacter) return "MYTHIC";
  if (input.isUniqueGreenItem) return "LEGENDARY";
  return undefined;
}

export interface SkillRarityInput {
  isElite: boolean;
  isPveOnly: boolean;
  campaign: string | null;
}

/**
 * Skills skip percentile scoring entirely - "elite" is a clean, binary,
 * in-game-visible trait (only one can be equipped at a time), and Eye of the
 * North's PvE-only skills are a recognizable special category, so both map
 * straight to a tier instead of nudging a popularity score.
 */
export function forcedSkillRarity(input: SkillRarityInput): Rarity {
  if (input.isElite) return "MYTHIC";
  if (input.isPveOnly && (input.campaign ?? "").includes("Eye of the North")) return "LEGENDARY";
  return "COMMON";
}

// Real GW1 item-quality colors for non-unique weapon skins, from most to
// least common - every such skin gets one card per tier (see sync-wiki.ts),
// rather than a single card at a percentile-derived rarity.
export const WEAPON_QUALITY_TIERS: { variantKey: string; rarity: Rarity }[] = [
  { variantKey: "WHITE", rarity: "COMMON" },
  { variantKey: "BLUE", rarity: "UNCOMMON" },
  { variantKey: "PURPLE", rarity: "RARE" },
  { variantKey: "GOLD", rarity: "EPIC" },
];

/** Min-max normalize a list of raw values to [0, 1]. Uses log1p for skewed counts (backlinks). */
function normalize(values: number[], useLog = false): number[] {
  const transformed = useLog ? values.map((v) => Math.log1p(Math.max(v, 0))) : values;
  const min = Math.min(...transformed);
  const max = Math.max(...transformed);
  if (max - min < 1e-9) return transformed.map(() => 0.5);
  return transformed.map((v) => (v - min) / (max - min));
}

export interface ScoreInput {
  id: string;
  backlinks: number;
  wikitextLength: number;
  bonus: number; // 0-100, from dataBonus()
  forcedRarity?: Rarity; // from forcedRarityFor() - bypasses percentile ranking entirely
}

export interface ScoredCard {
  id: string;
  score: number;
  rarity: Rarity;
}

/** Score and assign rarity tiers to an entire corpus (or family) in one pass. */
export function scoreAndRankCards(cards: ScoreInput[]): ScoredCard[] {
  if (cards.length === 0) return [];

  const backlinksNorm = normalize(
    cards.map((c) => c.backlinks),
    true,
  );
  const lengthNorm = normalize(cards.map((c) => c.wikitextLength));

  const scored = cards.map((card, i) => ({
    id: card.id,
    score: 40 * backlinksNorm[i] + 0.4 * card.bonus + 20 * lengthNorm[i],
    forcedRarity: card.forcedRarity,
  }));

  const result = new Map<string, Rarity>();
  for (const s of scored) {
    if (s.forcedRarity) result.set(s.id, s.forcedRarity);
  }

  // Percentile-rank only the cards without a forced tier, so a handful of
  // guaranteed-legendary greens don't skew or get skewed by the rest.
  const toRank = scored.filter((s) => !s.forcedRarity);
  const ranked = [...toRank].sort((a, b) => b.score - a.score);
  const n = ranked.length;

  let cumulativeShare = 0;
  let rank = 0;
  for (const { rarity, share } of RARITY_TARGET_SHARES) {
    cumulativeShare += share;
    const cutoffIndex = Math.round(cumulativeShare * n);
    for (; rank < cutoffIndex && rank < n; rank++) {
      result.set(ranked[rank].id, rarity);
    }
  }
  // Anything left over (rounding) falls into the most common tier.
  for (; rank < n; rank++) {
    result.set(ranked[rank].id, "COMMON");
  }

  return scored.map((s) => ({ id: s.id, score: s.score, rarity: result.get(s.id)! }));
}

/**
 * Score and rank cards independently within each family, rather than as one
 * global pool. Families differ wildly in natural backlink counts (a popular
 * skill vs. a niche weapon skin), so a single global ranking would let one
 * family's popularity drown out another's - this keeps white/blue/purple/gold
 * distinctions meaningful within each family, per the game's own design.
 */
export function scoreAndRankCardsByFamily(cards: (ScoreInput & { family: string })[]): ScoredCard[] {
  const groups = new Map<string, (ScoreInput & { family: string })[]>();
  for (const card of cards) {
    const group = groups.get(card.family) ?? [];
    group.push(card);
    groups.set(card.family, group);
  }

  const results: ScoredCard[] = [];
  for (const group of groups.values()) {
    results.push(...scoreAndRankCards(group));
  }
  return results;
}
