"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { RotateCcw, RotateCw, Repeat } from "lucide-react";
import { CardTile, type CardData } from "@/components/CardTile";
import { CardBackVisual } from "@/components/BoosterOverlay";
import { useLocale } from "@/lib/i18n/LocaleContext";

const ROTATION_X_LIMIT = 60;
/** Degrees turned by one press of the "rotate left/right" buttons. */
const ROTATION_STEP = 45;

/**
 * A card you can grab and turn in 3D (mouse or touch), with a light sheen that
 * follows the tilt and the card back on the reverse. `className` sets its size.
 * Buttons under the card offer the same rotation with a single tap or the
 * keyboard (RGAA 7.3 / 13.10: dragging is never the only way).
 */
export function TiltableCard({ card, className }: { card: CardData; className: string }) {
  const { t } = useLocale();
  // Starts at a slight showcase angle so it's obvious the card can be turned.
  const [rotation, setRotation] = useState({ x: 10, y: -18 });
  const [dragging, setDragging] = useState(false);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const activePointer = useRef<number | null>(null);

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

  // Sheen follows the tilt so the card catches the light as you turn it.
  const sheenAngle = 115 + rotation.y * 0.6;
  const sheenStrength = 0.12 + Math.min(Math.abs(rotation.x) + Math.abs(rotation.y), 40) / 250;

  function rotateBy(degrees: number) {
    setRotation((r) => ({ ...r, y: r.y + degrees }));
  }

  const controlClass =
    "flex items-center gap-1.5 rounded-lg border border-neutral-700 px-3 py-1 text-xs text-neutral-200 hover:border-neutral-500";

  return (
    <div className="flex flex-col items-center gap-3">
      <div style={{ perspective: "1400px" }}>
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- RGAA 13.10: pointer drag to tilt; the rotate/flip buttons below are the keyboard and single-pointer equivalent, test TiltableCard.test.tsx */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
          className={`relative aspect-[5/7] touch-none select-none [-webkit-touch-callout:none] [&_img]:pointer-events-none ${
            dragging ? "cursor-grabbing" : "cursor-grab"
          } ${className}`}
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
          <div className="absolute inset-0" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
            <CardBackVisual />
          </div>
        </div>
      </div>
      <div role="group" aria-label={t("tilt.controls")} className="flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => rotateBy(-ROTATION_STEP)} className={controlClass}>
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          {t("tilt.rotateLeft")}
        </button>
        <button type="button" onClick={() => rotateBy(180)} className={controlClass}>
          <Repeat className="h-3.5 w-3.5" aria-hidden="true" />
          {t("tilt.flip")}
        </button>
        <button type="button" onClick={() => rotateBy(ROTATION_STEP)} className={controlClass}>
          <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
          {t("tilt.rotateRight")}
        </button>
      </div>
    </div>
  );
}
