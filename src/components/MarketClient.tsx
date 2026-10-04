"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CardTile, type CardData } from "@/components/CardTile";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { interpolateJsx } from "@/lib/i18n/interpolateJsx";
import type { Locale } from "@/lib/i18n/translations";
import { t as translate } from "@/lib/i18n/translations";
import { useMarketEnabled } from "@/lib/useMarketEnabled";

interface AuctionSummary {
  id: string;
  sellerPseudo: string;
  sellerCompletedSales: number;
  sellerFallenThroughHandoffs: number;
  startingPrice: number;
  buyoutPrice: number | null;
  topBid: number | null;
  endsAt: string;
  card: CardData;
}

function timeLeft(locale: Locale, endsAt: string): string {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return translate(locale, "market.timeLeftEnded");
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return hours > 0
    ? translate(locale, "market.timeLeftHours", { hours, minutes })
    : translate(locale, "market.timeLeftMinutes", { minutes });
}

export function MarketClient() {
  const { t, tError, locale } = useLocale();
  const [auctions, setAuctions] = useState<AuctionSummary[] | null>(null);
  const marketEnabled = useMarketEnabled();

  useEffect(() => {
    if (!marketEnabled) return;
    fetch("/api/auctions")
      .then((res) => res.json())
      .then((data) => setAuctions(data.auctions));
  }, [marketEnabled]);

  if (!marketEnabled) {
    return (
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">{t("market.title")}</h1>
        </div>
        <p className="text-neutral-400">{marketEnabled === null ? t("common.loading") : tError("MARKET_DISABLED")}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t("market.title")}</h1>
        <div className="flex gap-4 text-sm">
          <Link href="/market/mine" className="text-neutral-400 underline hover:text-neutral-200">
            {t("market.myAuctions")}
          </Link>
        </div>
      </div>
      <p className="text-sm text-neutral-400">
        {interpolateJsx(
          t("market.intro"),
          "link",
          <Link href="/collection" className="underline hover:text-neutral-200">
            {t("market.introLink")}
          </Link>,
        )}
      </p>

      {!auctions ? (
        <p className="text-neutral-400">{t("common.loading")}</p>
      ) : auctions.length === 0 ? (
        <p className="text-neutral-400">{t("market.empty")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {auctions.map((a) => (
            <Link key={a.id} href={`/market/${a.id}`} className="flex flex-col gap-2">
              <CardTile card={a.card} />
              <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 px-3 py-2 text-xs text-neutral-300">
                <p>
                  {a.topBid !== null
                    ? t("market.currentBid", { amount: a.topBid })
                    : t("market.startingPrice", { amount: a.startingPrice })}
                </p>
                {a.buyoutPrice && (
                  <p className="text-neutral-500">{t("market.buyoutPrice", { amount: a.buyoutPrice })}</p>
                )}
                <p className="text-neutral-500">
                  {a.sellerPseudo}
                  {a.sellerCompletedSales > 0 && (
                    <span className="text-emerald-400/80">
                      {" "}
                      · {t("market.completedSales", { count: a.sellerCompletedSales, plural: a.sellerCompletedSales > 1 ? "s" : "" })}
                    </span>
                  )}
                  {a.sellerFallenThroughHandoffs > 0 && (
                    <span className="text-amber-400/80">
                      {" "}
                      ·{" "}
                      {t("market.fallenThrough", {
                        count: a.sellerFallenThroughHandoffs,
                        plural: a.sellerFallenThroughHandoffs > 1 ? "s" : "",
                      })}
                    </span>
                  )}{" "}
                  · {timeLeft(locale, a.endsAt)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
