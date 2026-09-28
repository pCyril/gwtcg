"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import { CardTile, type CardData } from "@/components/CardTile";
import { CardBackVisual } from "@/components/BoosterOverlay";
import { ArtSubmissionForm } from "@/components/ArtSubmissionForm";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { useMarketEnabled } from "@/lib/useMarketEnabled";

const ROTATION_X_LIMIT = 60;

export function CardDetailModal({
  card,
  onClose,
  onDiscarded,
}: {
  card: CardData;
  onClose: () => void;
  onDiscarded?: () => void;
}) {
  const { t, tError } = useLocale();
  const marketEnabled = useMarketEnabled();
  // Starts at a slight showcase angle so it's obvious the card can be turned.
  const [rotation, setRotation] = useState({ x: 10, y: -18 });
  const [dragging, setDragging] = useState(false);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const [discardPending, setDiscardPending] = useState(false);
  const [discardError, setDiscardError] = useState<string | null>(null);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    lastPointer.current = { x: e.clientX, y: e.clientY };
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging || !lastPointer.current) return;
    const dx = e.clientX - lastPointer.current.x;
    const dy = e.clientY - lastPointer.current.y;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    setRotation((r) => ({
      x: Math.max(-ROTATION_X_LIMIT, Math.min(ROTATION_X_LIMIT, r.x - dy * 0.4)),
      y: r.y + dx * 0.5,
    }));
  }

  function endDrag() {
    setDragging(false);
    lastPointer.current = null;
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
            onPointerLeave={endDrag}
            className={`relative aspect-[5/7] w-[min(28rem,78vw)] touch-none select-none ${
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
        </div>

        {discardError && <p className="text-xs text-red-400">{discardError}</p>}

        <ArtSubmissionForm card={card} />
      </div>
    </div>
  );
}
