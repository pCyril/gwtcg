"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { useMarketEnabled } from "@/lib/useMarketEnabled";

export function SellCardClient({ instanceId }: { instanceId: string }) {
  const { t, tError } = useLocale();
  const router = useRouter();
  const marketEnabled = useMarketEnabled();
  const [startingPrice, setStartingPrice] = useState(1);
  const [buyoutPrice, setBuyoutPrice] = useState<number | "">("");
  const [durationHours, setDurationHours] = useState(24);
  // Server error code (e.g. INVALID_BUYOUT_PRICE), translated at render time.
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const errorId = useId();
  const cancelInfoId = useId();
  const startingInvalid = error === "INVALID_STARTING_PRICE";
  const buyoutInvalid = error === "INVALID_BUYOUT_PRICE";
  const durationInvalid = error === "INVALID_DURATION";

  async function submit() {
    // aria-disabled instead of disabled keeps the focus on the button while sending (RGAA 7.3): guard here.
    if (pending) return;
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
        setError(data.error ?? "UNKNOWN");
        return;
      }
      router.push(`/market/${data.id}`);
    } finally {
      setPending(false);
    }
  }

  if (!marketEnabled) {
    return (
      <main className="flex max-w-md flex-col gap-6 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">{t("sell.title")}</h1>
          <Link href="/collection" className="text-sm text-neutral-400 underline hover:text-neutral-200">
            {t("sell.cancel")}
          </Link>
        </div>
        {marketEnabled === null ? (
          <p role="status" className="text-neutral-400">
            {t("common.loading")}
          </p>
        ) : (
          <p className="text-neutral-400">{tError("MARKET_DISABLED")}</p>
        )}
      </main>
    );
  }

  return (
    <main className="flex max-w-md flex-col gap-6 py-10">
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
            aria-invalid={startingInvalid || undefined}
            aria-describedby={startingInvalid ? errorId : undefined}
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
            aria-invalid={buyoutInvalid || undefined}
            aria-describedby={buyoutInvalid ? errorId : undefined}
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
            aria-invalid={durationInvalid || undefined}
            aria-describedby={durationInvalid ? errorId : undefined}
            className="rounded border border-neutral-700 bg-neutral-950 px-3 py-1.5"
          />
        </label>

        <p className="text-xs text-neutral-500">{t("sell.noFeeNote")}</p>
        <p id={cancelInfoId} className="text-xs text-neutral-400">
          {t("sell.cancelInfo")}
        </p>
        {/* Persistent alert region (RGAA 7.5): mounted empty, out of the flex flow until it has a message. */}
        <p id={errorId} role="alert" className={error ? "text-sm text-red-400" : "sr-only"}>
          {error ? tError(error) : null}
        </p>

        <button
          type="button"
          onClick={submit}
          aria-disabled={pending || undefined}
          aria-describedby={cancelInfoId}
          className="rounded bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500 aria-disabled:opacity-50"
        >
          {t("sell.submit")}
        </button>
      </div>
    </main>
  );
}
