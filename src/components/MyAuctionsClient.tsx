"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleContext";
import type { TranslationKey } from "@/lib/i18n/translations";
import { useMarketEnabled } from "@/lib/useMarketEnabled";

interface AuctionRow {
  id: string;
  status: string;
  startingPrice: number;
  endsAt: string;
}

function AuctionList({ rows }: { rows: AuctionRow[] }) {
  const { t } = useLocale();
  if (rows.length === 0) return <p className="text-sm text-neutral-500">{t("myAuctions.empty")}</p>;
  return (
    <div className="flex flex-col divide-y divide-neutral-800 rounded-lg border border-neutral-800">
      {rows.map((a) => (
        <Link key={a.id} href={`/market/${a.id}`} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-neutral-900/60">
          <span>{t("myAuctions.startingPrice", { amount: a.startingPrice })}</span>
          <span className="text-neutral-400">{t(`auction.status.${a.status}` as TranslationKey)}</span>
        </Link>
      ))}
    </div>
  );
}

export function MyAuctionsClient() {
  const { t, tError } = useLocale();
  const marketEnabled = useMarketEnabled();
  const [data, setData] = useState<{ selling: AuctionRow[]; bidOn: AuctionRow[] } | null>(null);

  useEffect(() => {
    if (!marketEnabled) return;
    fetch("/api/auctions/mine")
      .then((res) => res.json())
      .then(setData);
  }, [marketEnabled]);

  if (!marketEnabled) {
    return (
      <main className="flex flex-col gap-6 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">{t("myAuctions.title")}</h1>
        </div>
        <p className="text-neutral-400">{marketEnabled === null ? t("common.loading") : tError("MARKET_DISABLED")}</p>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t("myAuctions.title")}</h1>
      </div>

      {!data ? (
        <p className="text-neutral-400">{t("common.loading")}</p>
      ) : (
        <>
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">{t("myAuctions.selling")}</h2>
            <AuctionList rows={data.selling} />
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">{t("myAuctions.bidOn")}</h2>
            <AuctionList rows={data.bidOn} />
          </section>
        </>
      )}
    </main>
  );
}
