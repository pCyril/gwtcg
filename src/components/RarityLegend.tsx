"use client";

import { RARITY_STYLES, rarityLabelKey, type RarityKey } from "@/lib/game/rarityStyles";
import { useLocale } from "@/lib/i18n/LocaleContext";

const ORDER: RarityKey[] = ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"];

// Matches the in-game item color convention: white / blue / purple / gold / green / black dye.
export function RarityLegend({ className = "" }: { className?: string }) {
  const { t } = useLocale();
  return (
    // role="list": Tailwind's list-style reset drops the list semantics in Safari/VoiceOver.
    <ul role="list" className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 ${className}`}>
      {ORDER.map((key) => {
        const style = RARITY_STYLES[key];
        return (
          <li key={key} className="flex items-center gap-1.5 text-xs text-neutral-400">
            <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rotate-45 border ${style.border} ${style.accentBg}`} />
            <span>{t(rarityLabelKey(key))}</span>
          </li>
        );
      })}
    </ul>
  );
}
