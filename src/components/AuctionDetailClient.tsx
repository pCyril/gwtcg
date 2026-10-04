"use client";

import { useEffect, useState } from "react";
import { CardTile, type CardData } from "@/components/CardTile";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { interpolateJsx } from "@/lib/i18n/interpolateJsx";
import type { TranslationKey } from "@/lib/i18n/translations";

interface AuctionDetail {
  id: string;
  status: "ACTIVE" | "AWAITING_HANDOFF" | "COMPLETED" | "EXPIRED" | "CANCELLED";
  isSeller: boolean;
  isWinningBidder: boolean;
  sellerPseudo: string;
  sellerCompletedSales: number;
  sellerFallenThroughHandoffs: number;
  sellerGameCharacterName: string | null;
  winnerGameCharacterName: string | null;
  startingPrice: number;
  buyoutPrice: number | null;
  endsAt: string;
  card: CardData;
  bids: { pseudo: string; amount: number; createdAt: string }[];
}

export function AuctionDetailClient({ auctionId }: { auctionId: string }) {
  const { t, tError, locale } = useLocale();
  const [auction, setAuction] = useState<AuctionDetail | null>(null);
  const [bidAmount, setBidAmount] = useState<number | "">("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function refresh() {
    return fetch(`/api/auctions/${auctionId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setAuction(data);
      });
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auctionId]);

  if (!auction) {
    return <main className="mx-auto max-w-2xl px-4 py-10 text-neutral-400">{error ? tError(error) : t("common.loading")}</main>;
  }

  const topBid = auction.bids[0]?.amount ?? null;
  const isActive = auction.status === "ACTIVE";
  const isAwaitingHandoff = auction.status === "AWAITING_HANDOFF";
  const statusKey = `auction.status.${auction.status}` as TranslationKey;

  async function bid(amount: number) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/auctions/${auctionId}/bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setBidAmount("");
      await refresh();
    } finally {
      setPending(false);
    }
  }

  async function cancel() {
    setPending(true);
    try {
      await fetch(`/api/auctions/${auctionId}/cancel`, { method: "POST" });
      await refresh();
    } finally {
      setPending(false);
    }
  }

  async function confirmHandoff() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/auctions/${auctionId}/confirm`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) setError(data.error);
      await refresh();
    } finally {
      setPending(false);
    }
  }

  const sellerWho = auction.winnerGameCharacterName
    ? interpolateJsx(t("auction.sellerHandoffWho"), "name", <strong>{auction.winnerGameCharacterName}</strong>)
    : t("auction.sellerHandoffWhoUnknown");

  const winnerWho = auction.sellerGameCharacterName
    ? interpolateJsx(t("auction.winnerHandoffWhoKnown"), "name", <strong>{auction.sellerGameCharacterName}</strong>)
    : interpolateJsx(t("auction.winnerHandoffWhoUnknown"), "pseudo", <strong>{auction.sellerPseudo}</strong>);

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t("auction.title")}</h1>
      </div>

      <p className="text-sm text-neutral-400">
        {interpolateJsx(t("auction.soldBy"), "pseudo", <strong>{auction.sellerPseudo}</strong>)}
        {auction.sellerCompletedSales > 0 && (
          <span className="text-emerald-400/80">
            {" "}
            (
            {t("market.completedSales", {
              count: auction.sellerCompletedSales,
              plural: auction.sellerCompletedSales > 1 ? "s" : "",
            })}
            )
          </span>
        )}
        {auction.sellerFallenThroughHandoffs > 0 && (
          <span className="text-amber-400/80">
            {" "}
            (
            {t("market.fallenThrough", {
              count: auction.sellerFallenThroughHandoffs,
              plural: auction.sellerFallenThroughHandoffs > 1 ? "s" : "",
            })}
            )
          </span>
        )}{" "}
        · {t(statusKey)}
      </p>

      <CardTile card={auction.card} size="lg" />

      <div className="flex flex-col gap-2 rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 text-sm">
        <p>{t("auction.startingPriceLabel", { amount: auction.startingPrice })}</p>
        {auction.buyoutPrice && <p>{t("auction.buyoutPriceLabel", { amount: auction.buyoutPrice })}</p>}
        <p>{t("auction.currentBidLabel", { amount: topBid !== null ? `${topBid} ecto` : t("auction.currentBidNone") })}</p>
        {isActive && (
          <p className="text-neutral-500">
            {t("auction.endsAtLabel", { date: new Date(auction.endsAt).toLocaleString(locale === "fr" ? "fr-FR" : "en-US") })}
          </p>
        )}
      </div>

      {isAwaitingHandoff && (
        <div className="rounded-lg border border-amber-700 bg-amber-950/30 p-4 text-sm text-amber-200">
          {auction.isSeller && (
            <p>{interpolateJsx(t("auction.sellerHandoffMsg", { amount: topBid ?? 0 }), "who", sellerWho)}</p>
          )}
          {auction.isSeller && <p className="mt-2 text-xs text-amber-300/80">{t("auction.sellerSecurityTip")}</p>}
          {auction.isWinningBidder && !auction.isSeller && (
            <p>{interpolateJsx(t("auction.winnerHandoffMsg", { amount: topBid ?? 0 }), "who", winnerWho)}</p>
          )}
          {auction.isWinningBidder && !auction.isSeller && (
            <p className="mt-2 text-xs text-amber-300/80">{t("auction.winnerSecurityTip")}</p>
          )}
          {!auction.isSeller && !auction.isWinningBidder && <p>{t("auction.bystanderMsg")}</p>}
        </div>
      )}

      {auction.bids.length > 0 && (
        <div className="flex flex-col gap-1 text-xs text-neutral-400">
          <p className="font-semibold text-neutral-300">{t("auction.history")}</p>
          {auction.bids.map((b, i) => (
            <p key={i}>
              {b.pseudo} — {b.amount} ecto
            </p>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-400">{tError(error)}</p>}

      {isActive && !auction.isSeller && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              type="number"
              min={(topBid ?? auction.startingPrice - 1) + 1}
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder={`${(topBid ?? auction.startingPrice - 1) + 1}+`}
              className="flex-1 rounded border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm"
            />
            <button
              onClick={() => bidAmount !== "" && bid(bidAmount)}
              disabled={pending || bidAmount === ""}
              className="rounded bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {t("auction.bid")}
            </button>
          </div>
          {auction.buyoutPrice && (
            <button
              onClick={() => bid(auction.buyoutPrice!)}
              disabled={pending}
              className="rounded border border-amber-600 px-4 py-1.5 text-sm font-medium text-amber-300 hover:border-amber-400 disabled:opacity-50"
            >
              {t("auction.buyoutButton", { amount: auction.buyoutPrice })}
            </button>
          )}
        </div>
      )}

      {isActive && auction.isSeller && auction.bids.length === 0 && (
        <button
          onClick={cancel}
          disabled={pending}
          className="rounded border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:border-red-400 hover:text-red-400 disabled:opacity-50"
        >
          {t("auction.cancelAuction")}
        </button>
      )}

      {isAwaitingHandoff && auction.isSeller && (
        <div className="flex gap-3">
          <button
            onClick={confirmHandoff}
            disabled={pending}
            className="rounded bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {t("auction.confirmHandoff")}
          </button>
          <button
            onClick={cancel}
            disabled={pending}
            className="rounded border border-neutral-700 px-5 py-2 text-sm text-neutral-300 hover:border-red-400 hover:text-red-400 disabled:opacity-50"
          >
            {t("auction.cancelHandoff")}
          </button>
        </div>
      )}
    </main>
  );
}
