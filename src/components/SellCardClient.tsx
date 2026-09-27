"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleContext";

export function SellCardClient({ instanceId }: { instanceId: string }) {
  const { t, tError } = useLocale();
  const router = useRouter();
  const [startingPrice, setStartingPrice] = useState(1);
  const [buyoutPrice, setBuyoutPrice] = useState<number | "">("");
  const [durationHours, setDurationHours] = useState(24);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auctions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardInstanceId: instanceId,
          startingPrice,
          buyoutPrice: buyoutPrice === "" ? null : buyoutPrice,
          durationHours,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(tError(data.error));
        return;
      }
      router.push(`/market/${data.id}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t("sell.title")}</h1>
        <Link href="/collection" className="text-sm text-neutral-400 underline hover:text-neutral-200">
          {t("sell.cancel")}
        </Link>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 text-sm">
        <label className="flex flex-col gap-1">
          {t("sell.startingPrice")}
          <input
            type="number"
            min={1}
            value={startingPrice}
            onChange={(e) => setStartingPrice(Math.max(1, Number(e.target.value)))}
            className="rounded border border-neutral-700 bg-neutral-950 px-3 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1">
          {t("sell.buyoutPrice")}
          <input
            type="number"
            min={startingPrice + 1}
            value={buyoutPrice}
            onChange={(e) => setBuyoutPrice(e.target.value === "" ? "" : Number(e.target.value))}
            className="rounded border border-neutral-700 bg-neutral-950 px-3 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1">
          {t("sell.duration")}
          <input
            type="number"
            min={1}
            max={72}
            value={durationHours}
            onChange={(e) => setDurationHours(Math.min(72, Math.max(1, Number(e.target.value))))}
            className="rounded border border-neutral-700 bg-neutral-950 px-3 py-1.5"
          />
        </label>

        <p className="text-xs text-neutral-500">{t("sell.noFeeNote")}</p>
        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          onClick={submit}
          disabled={pending}
          className="rounded bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {t("sell.submit")}
        </button>
      </div>
    </main>
  );
}
