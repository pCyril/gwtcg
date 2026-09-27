"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/i18n/LocaleContext";
import type { TranslationKey } from "@/lib/i18n/translations";

interface TradeSummary {
  id: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED";
  createdAt: string;
  counterparty: string;
  isInitiator: boolean;
}

export function TradeListClient() {
  const { t, tError } = useLocale();
  const router = useRouter();
  const [trades, setTrades] = useState<TradeSummary[] | null>(null);
  const [pseudo, setPseudo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function refresh() {
    fetch("/api/trade")
      .then((res) => res.json())
      .then((data) => setTrades(data.trades));
  }

  useEffect(refresh, []);

  async function createTrade() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientPseudo: pseudo.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(tError(data.error));
        return;
      }
      router.push(`/trade/${data.id}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t("tradeList.title")}</h1>
        <Link href="/" className="text-sm text-neutral-400 underline hover:text-neutral-200">
          {t("common.back")}
        </Link>
      </div>

      <section className="flex flex-col gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
        <h2 className="text-lg font-semibold">{t("tradeList.newTrade")}</h2>
        <div className="flex gap-2">
          <input
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            placeholder={t("tradeList.pseudoPlaceholder")}
            className="flex-1 rounded border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm"
          />
          <button
            onClick={createTrade}
            disabled={pending || !pseudo.trim()}
            className="rounded bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {t("tradeList.propose")}
          </button>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t("tradeList.myTrades")}</h2>
        {!trades ? (
          <p className="text-sm text-neutral-400">{t("common.loading")}</p>
        ) : trades.length === 0 ? (
          <p className="text-sm text-neutral-400">{t("tradeList.empty")}</p>
        ) : (
          <div className="flex flex-col divide-y divide-neutral-800 rounded-lg border border-neutral-800">
            {trades.map((trade) => (
              <Link
                key={trade.id}
                href={`/trade/${trade.id}`}
                className="flex items-center justify-between px-4 py-3 text-sm hover:bg-neutral-900/60"
              >
                <span>
                  {trade.isInitiator ? t("tradeList.to") : t("tradeList.from")}
                  <strong>{trade.counterparty}</strong>
                </span>
                <span className="text-neutral-400">{t(`trade.status.${trade.status}` as TranslationKey)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
