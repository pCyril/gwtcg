"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CardTile, type CardData } from "@/components/CardTile";
import { CardBackVisual } from "@/components/BoosterOverlay";
import { ArtSubmissionForm } from "@/components/ArtSubmissionForm";
import { RegisterForm } from "@/components/RegisterForm";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { useMarketEnabled } from "@/lib/useMarketEnabled";

const ROTATION_X_LIMIT = 60;

export function CardDetailModal({
  card,
  onClose,
  onDiscarded,
  tradeWithPseudo,
  viewerIsGuest,
}: {
  card: CardData;
  onClose: () => void;
  onDiscarded?: () => void;
  /** When set (viewing someone else's shared collection), shows a "Propose a trade" button that starts a new trade with them. */
  tradeWithPseudo?: string;
  /** Guests can't create trades server-side - shows a "create an account" prompt instead of the trade button. */
  viewerIsGuest?: boolean;
}) {
  const { t, tError, locale } = useLocale();
  const numberLocale = locale === "fr" ? "fr-FR" : "en-US";
  const router = useRouter();
  const marketEnabled = useMarketEnabled();
  const [dropStats, setDropStats] = useState<{ copies: number; total: number } | null>(null);
  // Starts at a slight showcase angle so it's obvious the card can be turned.
  const [rotation, setRotation] = useState({ x: 10, y: -18 });
  const [dragging, setDragging] = useState(false);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const activePointer = useRef<number | null>(null);
  const [discardPending, setDiscardPending] = useState(false);
  const [discardError, setDiscardError] = useState<string | null>(null);
  const [tradePending, setTradePending] = useState(false);
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [justRegistered, setJustRegistered] = useState(false);
  const stillGuest = viewerIsGuest && !justRegistered;

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

  // The active drag lives in a ref (not state) so every pointermove sees it
  // immediately, and it remembers which pointer started it so a second finger
  // or a stray pointer can't hijack the rotation.
  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (activePointer.current !== null) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Capture can fail for a pointer that already ended - the drag still works without it.
    }
    activePointer.current = e.pointerId;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    setDragging(true);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (activePointer.current !== e.pointerId || !lastPointer.current) return;
    const dx = e.clientX - lastPointer.current.x;
    const dy = e.clientY - lastPointer.current.y;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    setRotation((r) => ({
      x: Math.max(-ROTATION_X_LIMIT, Math.min(ROTATION_X_LIMIT, r.x - dy * 0.4)),
      y: r.y + dx * 0.5,
    }));
  }

  // Also wired to pointercancel and lostpointercapture: on touch devices the
  // browser can cancel a gesture (long-press, native image drag, system
  // gesture) without ever sending pointerup, which used to leave the card
  // stuck to an invisible finger.
  function endDrag(e: ReactPointerEvent<HTMLDivElement>) {
    if (activePointer.current !== e.pointerId) return;
    activePointer.current = null;
    lastPointer.current = null;
    setDragging(false);
  }

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

  // Sheen follows the tilt so the card catches the light as you turn it.
  const sheenAngle = 115 + rotation.y * 0.6;
  const sheenStrength = 0.12 + Math.min(Math.abs(rotation.x) + Math.abs(rotation.y), 40) / 250;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex min-h-full flex-col items-center justify-center gap-4 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ perspective: "1400px" }}>
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onLostPointerCapture={endDrag}
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
            className={`relative aspect-[5/7] w-[min(28rem,78vw)] touch-none select-none [-webkit-touch-callout:none] [&_img]:pointer-events-none ${
              dragging ? "cursor-grabbing" : "cursor-grab"
            }`}
            style={{
              transformStyle: "preserve-3d",
              transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
              transition: dragging ? "none" : "transform 0.5s cubic-bezier(0.22, 0.9, 0.24, 1)",
            }}
          >
            <div className="absolute inset-0" style={{ backfaceVisibility: "hidden" }}>
              <CardTile card={card} size="lg" />
              <div
                className="pointer-events-none absolute inset-0 rounded-[10px]"
                style={{
                  background: `linear-gradient(${sheenAngle}deg, transparent 35%, rgba(255,255,255,${sheenStrength}) 50%, transparent 65%)`,
                  mixBlendMode: "overlay",
                }}
              />
            </div>
            <div
              className="absolute inset-0"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              <CardBackVisual />
            </div>
          </div>
        </div>

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
        <p className="text-xs text-neutral-500">{t("cardDetail.dragHint")}</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-neutral-700 px-4 py-1.5 text-sm text-neutral-200 hover:border-neutral-500"
          >
            {t("common.close")}
          </button>
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
