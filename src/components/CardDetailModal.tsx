"use client";

import { useEffect, useId, useRef, useState, type SyntheticEvent } from "react";
import Link from "next/link";
import { Share2, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { type CardData } from "@/components/CardTile";
import { TiltableCard } from "@/components/TiltableCard";
import { ArtSubmissionForm } from "@/components/ArtSubmissionForm";
import { RegisterForm } from "@/components/RegisterForm";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { useMarketEnabled } from "@/lib/useMarketEnabled";
import type { RarityKey } from "@/lib/game/rarityStyles";
import { rarityLabelKey } from "@/lib/game/rarityStyles";
import { firstFocusable, useFocusAfterRender, useModalDialog } from "@/lib/useModalDialog";

const RARITY_OPTIONS: RarityKey[] = ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"];

export function CardDetailModal({
  card,
  onClose,
  onDiscarded,
  onRarityChanged,
  tradeWithPseudo,
  viewerIsGuest,
}: {
  card: CardData;
  onClose: () => void;
  onDiscarded?: () => void;
  /** Called after an admin changes this card's rarity, so the parent can refresh its list. */
  onRarityChanged?: () => void;
  /** When set (viewing someone else's shared collection), shows a "Propose a trade" button that starts a new trade with them. */
  tradeWithPseudo?: string;
  /** Guests can't create trades server-side - shows a "create an account" prompt instead of the trade button. */
  viewerIsGuest?: boolean;
}) {
  const { t, tError, locale } = useLocale();
  const numberLocale = locale === "fr" ? "fr-FR" : "en-US";
  const router = useRouter();
  const marketEnabled = useMarketEnabled();
  const [shareCopied, setShareCopied] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rarity, setRarity] = useState<RarityKey>(card.rarity);
  const [rarityPending, setRarityPending] = useState(false);
  const [rarityError, setRarityError] = useState<string | null>(null);
  const [removedImages, setRemovedImages] = useState<string[]>([]);
  const [dropStats, setDropStats] = useState<{ copies: number; total: number } | null>(null);
  const [discardPending, setDiscardPending] = useState(false);
  const [discardError, setDiscardError] = useState<string | null>(null);
  const [tradePending, setTradePending] = useState(false);
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [justRegistered, setJustRegistered] = useState(false);
  const stillGuest = viewerIsGuest && !justRegistered;
  const titleId = useId();
  const registerButtonRef = useRef<HTMLButtonElement>(null);
  const registerFormRef = useRef<HTMLDivElement>(null);
  const tradeButtonRef = useRef<HTMLButtonElement>(null);
  const focusAfterRender = useFocusAfterRender();

  // Native modal dialog: background inert, focus moved inside on open and given back to the
  // card that opened it on close; Escape closes (via the "cancel" event).
  const { ref: dialogRef, isStaleClose } = useModalDialog();

  function onCancel(e: SyntheticEvent<HTMLDialogElement>) {
    e.preventDefault();
    onClose();
  }

  // The browser may close the dialog itself (e.g. repeated Escape): keep the parent in sync.
  function onNativeClose() {
    if (!isStaleClose()) onClose();
  }

  useEffect(() => {
    let ignore = false;
    fetch("/api/me")
      .then((res) => res.json())
      .then((data) => {
        if (!ignore) setIsAdmin(Boolean(data.isAdmin));
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!card.cardId) return;
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

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  async function discard() {
    if (!card.instanceId || discardPending) return;
    if (!window.confirm(t("collection.discardSingleConfirm", { title: card.title }))) return;
    setDiscardPending(true);
    setDiscardError(null);
    try {
      const res = await fetch("/api/collection/discard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardInstanceIds: [card.instanceId] }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDiscardError(tError(data.error));
        return;
      }
      onDiscarded?.();
      onClose();
    } finally {
      setDiscardPending(false);
    }
  }

  async function changeRarity(next: RarityKey) {
    if (!card.cardId || next === rarity) return;
    setRarityPending(true);
    setRarityError(null);
    try {
      const res = await fetch(`/api/admin/cards/${card.cardId}/rarity`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rarity: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRarityError(tError(data.error));
        return;
      }
      setRarity(next);
      onRarityChanged?.();
    } finally {
      setRarityPending(false);
    }
  }

  async function removeImage(imageUrl: string) {
    if (!card.cardId || !window.confirm(t("cardDetail.adminRemoveImageConfirm"))) return;
    setRarityError(null);
    const res = await fetch(`/api/admin/cards/${card.cardId}/image`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setRarityError(tError(data.error));
      return;
    }
    setRemovedImages((prev) => [...prev, imageUrl]);
    onRarityChanged?.();
  }

  // Native share sheet on phones, clipboard elsewhere (or if the sheet isn't available).
  async function shareCard() {
    if (!card.cardId) return;
    const url = `${window.location.origin}/card/${card.cardId}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: card.title, url });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      window.prompt(t("cardDetail.shareCopyManually"), url);
    }
  }

  async function proposeTrade() {
    if (!tradeWithPseudo || tradePending) return;
    setTradePending(true);
    setTradeError(null);
    try {
      const res = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientPseudo: tradeWithPseudo, requestedCardId: card.cardId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTradeError(tError(data.error));
        return;
      }
      router.push(`/trade/${data.id}`);
    } finally {
      setTradePending(false);
    }
  }

  const images = (card.imageUrls ?? []).filter((u) => !removedImages.includes(u));

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={onCancel}
      onClose={onNativeClose}
      className="fixed inset-0 z-50 m-0 h-full max-h-none w-full max-w-none overflow-y-auto overflow-x-hidden border-0 bg-black/80 p-0 text-inherit backdrop-blur-sm backdrop:bg-transparent"
      onClick={onClose}
    >
      {/* Dialog name. CardTile renders the visible title (h3) without an id, so it is mirrored here. */}
      <span id={titleId} hidden>
        {card.title}
      </span>
      {/* "Link copied" is otherwise only a change of the button's text. */}
      <div role="status" className="sr-only">
        {shareCopied ? t("collection.shareCopied") : ""}
      </div>
      <div
        className="flex min-h-full flex-col items-center justify-center gap-4 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <TiltableCard card={{ ...card, rarity, imageUrls: images }} className="w-[min(26rem,78vw)]" />

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
        {isAdmin && card.cardId && (
          <label className="flex items-center gap-2 text-xs text-amber-300">
            {t("cardDetail.adminRarity")}
            <select
              value={rarity}
              disabled={rarityPending}
              onChange={(e) => changeRarity(e.target.value as RarityKey)}
              className="rounded border border-amber-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-100 disabled:opacity-50"
            >
              {RARITY_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {t(rarityLabelKey(r))}
                </option>
              ))}
            </select>
          </label>
        )}
        {isAdmin && card.cardId && images.length > 0 && (
          <div className="flex flex-col items-center gap-1 text-xs text-amber-300">
            {t("cardDetail.adminRemoveImage")}
            <div className="flex gap-2">
              {images.map((url) => (
                <button
                  key={url}
                  onClick={() => removeImage(url)}
                  className="group relative h-12 w-12 overflow-hidden rounded border border-amber-700"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary card art */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-lg text-red-300 opacity-0 group-hover:opacity-100">
                    ✕
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
        {/* Persistent alert regions (empty until an error): -mt-4/mt-4 keep the column's gap-4 unchanged. */}
        <div role="alert" className="-mt-4">
          {rarityError && <p className="mt-4 text-xs text-red-400">{rarityError}</p>}
        </div>
        <p className="text-xs text-neutral-400">{t("cardDetail.dragHint")}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-neutral-700 px-4 py-1.5 text-sm text-neutral-200 hover:border-neutral-500"
          >
            {t("common.close")}
          </button>
          {card.cardId && (
            <button
              onClick={shareCard}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-700 px-4 py-1.5 text-sm text-neutral-200 hover:border-neutral-500"
            >
              {shareCopied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
              {shareCopied ? t("collection.shareCopied") : t("cardDetail.share")}
            </button>
          )}
          {card.instanceId && marketEnabled && (
            <Link
              href={`/market/sell/${card.instanceId}`}
              className="rounded-lg border border-emerald-700 px-4 py-1.5 text-sm text-emerald-300 hover:border-emerald-400"
            >
              {t("cardDetail.sellButton")}
            </Link>
          )}
          {card.instanceId && (
            <button
              onClick={discard}
              aria-disabled={discardPending || undefined}
              className="rounded-lg border border-red-800 px-4 py-1.5 text-sm text-red-400 hover:border-red-500 aria-disabled:opacity-50"
            >
              {t("cardDetail.discardButton")}
            </button>
          )}
          {tradeWithPseudo && !stillGuest && (
            <button
              ref={tradeButtonRef}
              onClick={proposeTrade}
              aria-disabled={tradePending || undefined}
              className="rounded-lg border border-emerald-700 px-4 py-1.5 text-sm text-emerald-300 hover:border-emerald-400 aria-disabled:opacity-50"
            >
              {t("collection.shared.proposeTrade")}
            </button>
          )}
        </div>

        <div role="alert" className="-mt-4 flex flex-col items-center">
          {discardError && <p className="mt-4 text-xs text-red-400">{discardError}</p>}
          {tradeError && <p className="mt-4 text-xs text-red-400">{tradeError}</p>}
        </div>

        {tradeWithPseudo && stillGuest && (
          <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-lg border border-emerald-800/60 bg-emerald-950/20 p-4 text-center">
            <p className="text-sm text-emerald-200">{t("error.GUEST_CANNOT_TRADE")}</p>
            {!showRegister ? (
              <button
                ref={registerButtonRef}
                onClick={() => {
                  setShowRegister(true);
                  // The button is replaced by the form: move focus to its first field.
                  focusAfterRender(() => (registerFormRef.current ? firstFocusable(registerFormRef.current) : null));
                }}
                className="rounded bg-emerald-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
              >
                {t("auth.register")}
              </button>
            ) : (
              <div ref={registerFormRef} className="w-full max-w-xs text-left">
                <RegisterForm
                  onSuccess={() => {
                    setJustRegistered(true);
                    setShowRegister(false);
                    // The guest prompt disappears and "Propose a trade" takes its place.
                    focusAfterRender(() => tradeButtonRef.current);
                  }}
                  onCancel={() => {
                    setShowRegister(false);
                    focusAfterRender(() => registerButtonRef.current);
                  }}
                />
              </div>
            )}
          </div>
        )}

        <ArtSubmissionForm card={card} />
      </div>
    </dialog>
  );
}
