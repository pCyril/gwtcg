"use client";

import { useEffect, useState } from "react";
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
  const [dropStats, setDropStats] = useState<{ copies: number; total: number } | null>(null);
  const [discardPending, setDiscardPending] = useState(false);
  const [discardError, setDiscardError] = useState<string | null>(null);
  const [tradePending, setTradePending] = useState(false);
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [justRegistered, setJustRegistered] = useState(false);
  const stillGuest = viewerIsGuest && !justRegistered;

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
    if (!card.instanceId) return;
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
    if (!tradeWithPseudo) return;
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

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex min-h-full flex-col items-center justify-center gap-4 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <TiltableCard
          card={{ ...card, rarity }}
          className="w-[min(26rem,78vw,calc((100dvh_-_14.5rem)*5/7))]"
        />

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
        {rarityError && <p className="text-xs text-red-400">{rarityError}</p>}
        <p className="text-xs text-neutral-500">{t("cardDetail.dragHint")}</p>
        <div className="flex gap-3">
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
              disabled={discardPending}
              className="rounded-lg border border-red-800 px-4 py-1.5 text-sm text-red-400 hover:border-red-500 disabled:opacity-50"
            >
              {t("cardDetail.discardButton")}
            </button>
          )}
          {tradeWithPseudo && !stillGuest && (
            <button
              onClick={proposeTrade}
              disabled={tradePending}
              className="rounded-lg border border-emerald-700 px-4 py-1.5 text-sm text-emerald-300 hover:border-emerald-400 disabled:opacity-50"
            >
              {t("collection.shared.proposeTrade")}
            </button>
          )}
        </div>

        {discardError && <p className="text-xs text-red-400">{discardError}</p>}
        {tradeError && <p className="text-xs text-red-400">{tradeError}</p>}

        {tradeWithPseudo && stillGuest && (
          <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-lg border border-emerald-800/60 bg-emerald-950/20 p-4 text-center">
            <p className="text-sm text-emerald-200">{t("error.GUEST_CANNOT_TRADE")}</p>
            {!showRegister ? (
              <button
                onClick={() => setShowRegister(true)}
                className="rounded bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
              >
                {t("auth.register")}
              </button>
            ) : (
              <div className="w-full max-w-xs text-left">
                <RegisterForm
                  onSuccess={() => {
                    setJustRegistered(true);
                    setShowRegister(false);
                  }}
                  onCancel={() => setShowRegister(false)}
                />
              </div>
            )}
          </div>
        )}

        <ArtSubmissionForm card={card} />
      </div>
    </div>
  );
}
