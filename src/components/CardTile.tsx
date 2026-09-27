"use client";

import { useState } from "react";
import { RARITY_STYLES, rarityLabelKey, familyLabelKey, type RarityKey } from "@/lib/game/rarityStyles";
import { FamilyIcon } from "@/components/FamilyIcon";
import { cardGradient } from "@/lib/game/cardArt";
import { useLocale } from "@/lib/i18n/LocaleContext";

export interface CardData {
  instanceId?: string;
  wikiPageId?: string;
  rarity: RarityKey;
  family: string;
  campaign?: string | null;
  profession?: string | null;
  title: string;
  extract: string;
  url: string;
  imageUrls?: string[];
  imageCredits?: Record<string, string>;
}

// Standard trading-card proportions (2.5in x 3.5in), so every card - grid
// thumbnail or spotlighted reveal - reads as the same physical object, just
// at a different size.
export function CardTile({ card, size = "sm" }: { card: CardData; size?: "sm" | "lg" }) {
  const { t } = useLocale();
  const style = RARITY_STYLES[card.rarity];
  const large = size === "lg";
  const images = card.imageUrls ?? [];
  const [variant, setVariant] = useState(0);
  const activeImage = images[Math.min(variant, images.length - 1)];
  const activeImageCredit = activeImage ? card.imageCredits?.[activeImage] : undefined;

  return (
    <div
      className={`relative flex aspect-[5/7] w-full flex-col overflow-hidden rounded-[10px] border-[3px] ${style.border} ${style.bg} ${style.glow}`}
    >
      {/* Title bar */}
      <div className="flex shrink-0 items-center border-b border-black/50 bg-neutral-900/80 px-2 py-1">
        <h3 className={`truncate font-bold text-neutral-50 ${large ? "text-base" : "text-[11px]"}`}>{card.title}</h3>
      </div>

      {/* Art window */}
      <div className="relative mx-[6%] mt-[3%] overflow-hidden rounded-[4px] border border-black/60" style={{ flex: "0 0 42%" }}>
        {activeImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary/original card art, not an optimizable local asset set
          <img
            src={activeImage}
            alt=""
            draggable={false}
            className="no-drag h-full w-full object-cover object-center"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ backgroundImage: cardGradient(card.title) }}
          >
            <FamilyIcon
              family={card.family}
              className={`${style.text} opacity-90 drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)] ${large ? "h-14 w-14" : "h-8 w-8"}`}
            />
          </div>
        )}

        {activeImageCredit && (
          <div className="absolute bottom-1 right-1 rounded bg-black/60 px-1 py-0.5 text-[7px] leading-none text-neutral-200">
            {activeImageCredit}
          </div>
        )}

        {images.length > 1 && (
          <div className="absolute inset-x-0 bottom-1 flex justify-center gap-1">
            {images.map((_, i) => (
              <button
                key={i}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setVariant(i);
                }}
                aria-label={t("card.illustration", { n: i + 1 })}
                className={`h-1.5 w-1.5 rounded-full border border-black/40 transition-colors ${
                  i === variant ? "bg-white" : "bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Type line: family / profession on the left, rarity gem on the right */}
      <div
        className={`mx-[6%] mt-[3%] flex shrink-0 items-center justify-between rounded-[3px] bg-neutral-900/80 px-2 uppercase tracking-wide text-neutral-300 ${
          large ? "py-1 text-[11px]" : "py-0.5 text-[8px]"
        }`}
      >
        <span className="truncate">
          {t(familyLabelKey(card.family))}
          {card.profession ? ` — ${card.profession}` : ""}
        </span>
        <span
          className={`shrink-0 rotate-45 border ${style.border} ${style.accentBg} ${large ? "h-3 w-3" : "h-2 w-2"}`}
          title={t(rarityLabelKey(card.rarity))}
        />
      </div>

      {/* Text box */}
      <div
        className={`relative mx-[6%] mb-[3%] mt-[3%] flex flex-1 flex-col gap-1 overflow-hidden rounded-[4px] bg-neutral-900/50 px-2 py-1.5 ${
          large ? "text-sm" : "text-[10px]"
        }`}
      >
        <p className={`flex-1 text-neutral-300 ${large ? "line-clamp-5" : "line-clamp-3"}`}>{card.extract}</p>
        <div className={`flex items-center justify-between text-neutral-500 ${large ? "text-xs" : "text-[8px]"}`}>
          <span className="truncate">{card.campaign}</span>
          <a
            href={card.url}
            target="_blank"
            rel="noreferrer noopener"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 underline hover:text-neutral-300"
          >
            {t("common.wikiLink")}
          </a>
        </div>
      </div>
    </div>
  );
}
