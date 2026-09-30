"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { CardTile, type CardData } from "@/components/CardTile";
import { CardBackVisual } from "@/components/BoosterOverlay";

const ROTATION_X_LIMIT = 60;

/**
 * A card you can grab and turn in 3D (mouse or touch), with a light sheen that
 * follows the tilt and the card back on the reverse. `className` sets its size.
 */
export function TiltableCard({ card, className }: { card: CardData; className: string }) {
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

  return (
    <div style={{ perspective: "1400px" }}>
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
  );
}
