"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { type CardData } from "@/components/CardTile";
import { TiltableCard } from "@/components/TiltableCard";
import { useLocale } from "@/lib/i18n/LocaleContext";

export function SharedCardClient({ card }: { card: CardData & { cardId: string } }) {
  const { t, locale } = useLocale();
  const [dropStats, setDropStats] = useState<{ copies: number; total: number } | null>(null);
  const numberLocale = locale === "fr" ? "fr-FR" : "en-US";

  useEffect(() => {
    let ignore = false;
    fetch(`/api/cards/${card.cardId}/drop-stats`)
      .then((res) => res.json())
      .then((data) => {
        if (!ignore) setDropStats(data);
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [card.cardId]);

  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-5 px-4 py-10">
      <TiltableCard card={card} className="w-[min(26rem,78vw,calc((100dvh_-_12rem)*5/7))]" />
      <p className="text-xs text-neutral-500">{t("cardDetail.dragHint")}</p>
      {dropStats && dropStats.total > 0 && (
        <p className="text-sm text-neutral-300">
          {t("cardDetail.dropRate", {
            copies: dropStats.copies.toLocaleString(numberLocale),
            plural: dropStats.copies > 1 ? "s" : "",
            total: dropStats.total.toLocaleString(numberLocale),
            percent: ((dropStats.copies / dropStats.total) * 100).toLocaleString(numberLocale, {
              maximumFractionDigits: 2,
            }),
          })}
        </p>
      )}
      <Link
        href="/"
        className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-500"
      >
        {t("sharedCard.cta")}
      </Link>
    </main>
  );
}
