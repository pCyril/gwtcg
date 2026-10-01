import type { TranslationKey } from "@/lib/i18n/translations";

export type RarityKey = "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY" | "MYTHIC";

/** Rarities from most common to rarest - e.g. to reveal a booster's best pull last. */
export const RARITY_ASCENDING: RarityKey[] = ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"];

/** Translation key for a rarity's display label - use with useLocale()'s t(). */
export function rarityLabelKey(rarity: RarityKey): TranslationKey {
  return `rarity.${rarity}` as TranslationKey;
}

/** Translation key for a card family's display label - use with useLocale()'s t(). */
export function familyLabelKey(family: string): TranslationKey {
  return `family.${family}` as TranslationKey;
}

// Mirrors GW1 item-rarity colors: white / blue / purple / gold / green, plus red for Mythic (the one hue left
// that stays clearly apart from Rare's purple).
// `radial` is a raw CSS color (not a Tailwind class) used for the JS-built radial-gradient burst.
export const RARITY_STYLES: Record<
  RarityKey,
  { border: string; text: string; glow: string; bg: string; accentBg: string; radial: string }
> = {
  COMMON: {
    border: "border-neutral-400",
    text: "text-neutral-200",
    glow: "",
    bg: "bg-neutral-900",
    accentBg: "bg-neutral-400",
    radial: "rgba(163,163,163,0.5)",
  },
  UNCOMMON: {
    border: "border-sky-400",
    text: "text-sky-300",
    glow: "shadow-[0_0_10px_rgba(56,189,248,0.35)]",
    bg: "bg-neutral-900",
    accentBg: "bg-sky-400",
    radial: "rgba(56,189,248,0.5)",
  },
  RARE: {
    border: "border-purple-400",
    text: "text-purple-300",
    glow: "shadow-[0_0_12px_rgba(192,132,252,0.4)]",
    bg: "bg-neutral-900",
    accentBg: "bg-purple-400",
    radial: "rgba(192,132,252,0.5)",
  },
  EPIC: {
    border: "border-amber-400",
    text: "text-amber-300",
    glow: "shadow-[0_0_14px_rgba(251,191,36,0.45)]",
    bg: "bg-neutral-900",
    accentBg: "bg-amber-400",
    radial: "rgba(251,191,36,0.55)",
  },
  LEGENDARY: {
    border: "border-emerald-400",
    text: "text-emerald-300",
    glow: "shadow-[0_0_16px_rgba(52,211,153,0.5)]",
    bg: "bg-neutral-900",
    accentBg: "bg-emerald-400",
    radial: "rgba(52,211,153,0.55)",
  },
  MYTHIC: {
    border: "border-red-500",
    text: "text-red-300",
    glow: "shadow-[0_0_22px_rgba(239,68,68,0.6)]",
    bg: "bg-black",
    accentBg: "bg-red-500",
    radial: "rgba(239,68,68,0.6)",
  },
};

