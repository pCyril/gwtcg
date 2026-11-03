"use client";

import { useEffect, useId, useRef, useState } from "react";
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
  // Screen-reader-only confirmation of a successful action (RGAA 7.5).
  const [notice, setNotice] = useState("");
  // Bumped after each action: if the focused control disappeared, focus goes back to the heading (RGAA 7.3).
  const [focusCheck, setFocusCheck] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const bidInputId = useId();
  const bidHintId = useId();
  const errorId = useId();
  const historyHeadingId = useId();

  function refresh(): Promise<AuctionDetail | null> {
    return fetch(`/api/auctions/${auctionId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return null;
        }
        setAuction(data);
        return data as AuctionDetail;
      });
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auctionId]);

  useEffect(() => {
    if (focusCheck === 0) return;
    const active = document.activeElement;
    if (!active || active === document.body || !active.isConnected) headingRef.current?.focus();
  }, [focusCheck]);

  if (!auction) {
    return (
      <main className="py-10 text-neutral-400">
        {error ? <p role="alert">{tError(error)}</p> : <p role="status">{t("common.loading")}</p>}
      </main>
    );
  }

  const topBid = auction.bids[0]?.amount ?? null;
  const isActive = auction.status === "ACTIVE";
  const isAwaitingHandoff = auction.status === "AWAITING_HANDOFF";
  const statusKey = `auction.status.${auction.status}` as TranslationKey;
  const minBid = topBid !== null ? topBid + 1 : auction.startingPrice;
  const bidError = error === "BID_TOO_LOW" || error === "INVALID_AMOUNT";
  const cardTitle = auction.card.title;

  function announceOutcome(updated: AuctionDetail | null, fallback: string) {
    setNotice("");
    const message =
      updated && updated.status !== "ACTIVE"
        ? t("auction.actionDone", { status: t(`auction.status.${updated.status}` as TranslationKey) })
        : fallback;
    window.setTimeout(() => setNotice(message), 100);
  }

  function onBidClick() {
    // aria-disabled instead of disabled keeps the focus on the button (RGAA 7.3): guard here.
    if (pending || bidAmount === "") return;
    const isBuyout = auction!.buyoutPrice !== null && bidAmount >= auction!.buyoutPrice;
    const message = isBuyout
      ? t("auction.buyoutConfirm", { amount: bidAmount, title: cardTitle })
      : t("auction.bidConfirm", { amount: bidAmount, title: cardTitle });
    if (!window.confirm(message)) return;
    bid(bidAmount);
  }

  function onBuyoutClick() {
    if (pending || auction!.buyoutPrice === null) return;
    if (!window.confirm(t("auction.buyoutConfirm", { amount: auction!.buyoutPrice, title: cardTitle }))) return;
    bid(auction!.buyoutPrice);
  }

  function onCancelClick(confirmKey: "auction.cancelAuctionConfirm" | "auction.cancelHandoffConfirm") {
    if (pending) return;
    if (!window.confirm(t(confirmKey))) return;
    cancel();
  }

  function onConfirmHandoffClick() {
    if (pending) return;
    if (!window.confirm(t("auction.confirmHandoffConfirm", { amount: topBid ?? 0 }))) return;
    confirmHandoff();
  }

  async function bid(amount: number) {
    setPending(true);
    setError(null);
    setNotice("");
    try {
      const res = await fetch(`/api/auctions/${auctionId}/bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        // Someone may have outbid us: reload so the suggested minimum is accurate (RGAA 11.11).
        if (data.error === "BID_TOO_LOW") await refresh();
        return;
      }
      setBidAmount("");
      const updated = await refresh();
      announceOutcome(updated, t("auction.bidPlaced", { amount }));
    } finally {
      setPending(false);
      setFocusCheck((n) => n + 1);
    }
  }

  async function cancel() {
    setPending(true);
    setError(null);
    setNotice("");
    try {
      const res = await fetch(`/api/auctions/${auctionId}/cancel`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "UNKNOWN");
      }
      const updated = await refresh();
      if (res.ok) announceOutcome(updated, "");
    } finally {
      setPending(false);
      setFocusCheck((n) => n + 1);
    }
  }

  async function confirmHandoff() {
    setPending(true);
    setError(null);
    setNotice("");
    try {
      const res = await fetch(`/api/auctions/${auctionId}/confirm`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) setError(data.error);
      const updated = await refresh();
      if (res.ok) announceOutcome(updated, "");
    } finally {
      setPending(false);
      setFocusCheck((n) => n + 1);
    }
  }

  const sellerWho = auction.winnerGameCharacterName
    ? interpolateJsx(t("auction.sellerHandoffWho"), "name", <strong>{auction.winnerGameCharacterName}</strong>)
    : t("auction.sellerHandoffWhoUnknown");

  const winnerWho = auction.sellerGameCharacterName
    ? interpolateJsx(t("auction.winnerHandoffWhoKnown"), "name", <strong>{auction.sellerGameCharacterName}</strong>)
    : interpolateJsx(t("auction.winnerHandoffWhoUnknown"), "pseudo", <strong>{auction.sellerPseudo}</strong>);

  return (
    <main className="flex max-w-md flex-col gap-6 py-10">
      <div className="flex items-center justify-between">
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold tracking-tight">
          {t("auction.title")}
        </h1>
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
          <h2 id={historyHeadingId} className="font-semibold text-neutral-300">
            {t("auction.history")}
          </h2>
          {/* role="list": Safari drops list semantics when list-style is none (Tailwind preflight). */}
          <ol role="list" aria-labelledby={historyHeadingId} className="flex flex-col gap-1">
            {auction.bids.map((b, i) => (
              <li key={i}>
                {b.pseudo} — {b.amount} ecto
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Persistent live regions (RGAA 7.5): mounted empty, only their text changes. Out of the flex flow while empty. */}
      <p id={errorId} role="alert" className={error ? "text-sm text-red-400" : "sr-only"}>
        {error ? tError(error) : null}
        {bidError ? ` ${t("auction.bidErrorHint", { amount: minBid })}` : null}
      </p>
      <p role="status" className="sr-only">
        {notice}
      </p>

      {isActive && !auction.isSeller && (
        <div className="flex flex-col gap-2">
          <label htmlFor={bidInputId} className="text-sm">
            {t("auction.bidLabel")}
          </label>
          <div className="flex gap-2">
            <input
              id={bidInputId}
              type="number"
              min={minBid}
              step={1}
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value === "" ? "" : Number(e.target.value))}
              aria-describedby={bidError ? `${bidHintId} ${errorId}` : bidHintId}
              aria-invalid={bidError || undefined}
              className="flex-1 rounded border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={onBidClick}
              aria-disabled={pending || bidAmount === "" || undefined}
              className="rounded bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 aria-disabled:opacity-50"
            >
              {t("auction.bid")}
            </button>
          </div>
          <p id={bidHintId} className="text-xs text-neutral-400">
            {t("auction.bidMinHint", { amount: minBid })}
          </p>
          {auction.buyoutPrice && (
            <button
              type="button"
              onClick={onBuyoutClick}
              aria-disabled={pending || undefined}
              className="rounded border border-amber-600 px-4 py-1.5 text-sm font-medium text-amber-300 hover:border-amber-400 aria-disabled:opacity-50"
            >
              {t("auction.buyoutButton", { amount: auction.buyoutPrice })}
            </button>
          )}
        </div>
      )}

      {isActive && auction.isSeller && auction.bids.length === 0 && (
        <button
          type="button"
          onClick={() => onCancelClick("auction.cancelAuctionConfirm")}
          aria-disabled={pending || undefined}
          className="rounded border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:border-red-400 hover:text-red-400 aria-disabled:opacity-50"
        >
          {t("auction.cancelAuction")}
        </button>
      )}

      {isAwaitingHandoff && auction.isSeller && (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onConfirmHandoffClick}
            aria-disabled={pending || undefined}
            className="rounded bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-500 aria-disabled:opacity-50"
          >
            {t("auction.confirmHandoff")}
          </button>
          <button
            type="button"
            onClick={() => onCancelClick("auction.cancelHandoffConfirm")}
            aria-disabled={pending || undefined}
            className="rounded border border-neutral-700 px-5 py-2 text-sm text-neutral-300 hover:border-red-400 hover:text-red-400 aria-disabled:opacity-50"
          >
            {t("auction.cancelHandoff")}
          </button>
        </div>
      )}
    </main>
  );
}
