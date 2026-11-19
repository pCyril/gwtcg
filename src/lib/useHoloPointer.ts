"use client";

import { useEffect, type RefObject } from "react";
import { prefersReducedEffects } from "@/lib/visualEffects";

/** Max hover tilt, in degrees, on each axis. */
const MAX_TILT = 9;

/** Light position as fractions of the card (0..1, 0.5 = centre). */
export interface HoloPointer {
  x: number;
  y: number;
}

/**
 * CSS custom properties read by the `.holo-card` styles in globals.css:
 * --px/--py the light position (0..1), --hyp its distance from the centre (0..1),
 * --rx/--ry the hover tilt.
 */
export function holoVars({ x, y }: HoloPointer, tilt = false): Record<string, string> {
  const px = Math.min(1, Math.max(0, x));
  const py = Math.min(1, Math.max(0, y));
  const hyp = Math.min(1, Math.hypot(px - 0.5, py - 0.5) / Math.SQRT1_2);
  return {
    "--px": px.toFixed(4),
    "--py": py.toFixed(4),
    "--hyp": hyp.toFixed(4),
    "--rx": `${tilt ? ((0.5 - py) * 2 * MAX_TILT).toFixed(2) : 0}deg`,
    "--ry": `${tilt ? ((px - 0.5) * 2 * MAX_TILT).toFixed(2) : 0}deg`,
  };
}

/**
 * Makes a `.holo-card` catch the light under the pointer: tracks the pointer
 * over the card's parent (grids lay a sibling button over the card, so the
 * card itself never receives the events), writes the CSS variables straight
 * on the element once per frame (no React re-render) and toggles `is-active`.
 * Does nothing for users who ask for reduced motion or turned visual effects off.
 */
export function useHoloPointer(ref: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const card = ref.current;
    const area = card?.parentElement;
    if (!enabled || !card || !area) return;

    let frame = 0;
    let last: { x: number; y: number } | null = null;
    // Measured once per hover: the card's own tilt would otherwise skew the
    // next measurement and make the light wobble.
    let rect: DOMRect | null = null;

    const reset = () => {
      last = null;
      rect = null;
      card.classList.remove("is-active");
      for (const [k, v] of Object.entries(holoVars({ x: 0.5, y: 0.5 }))) card.style.setProperty(k, v);
    };

    const apply = () => {
      frame = 0;
      if (!last) return;
      rect ??= card.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const x = (last.x - rect.left) / rect.width;
      const y = (last.y - rect.top) / rect.height;
      if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1) {
        reset();
        return;
      }
      card.classList.add("is-active");
      for (const [k, v] of Object.entries(holoVars({ x, y }, true))) card.style.setProperty(k, v);
    };

    const onMove = (e: PointerEvent) => {
      // Checked on each move (not once) so the footer switch applies without a reload.
      if (prefersReducedEffects()) return;
      last = { x: e.clientX, y: e.clientY };
      if (frame) return;
      if (typeof requestAnimationFrame === "function") frame = requestAnimationFrame(apply);
      else apply();
    };
    const onLeave = () => {
      if (frame && typeof cancelAnimationFrame === "function") cancelAnimationFrame(frame);
      frame = 0;
      reset();
    };
    const onTouchEnd = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") onLeave();
    };
    const onScroll = () => {
      rect = null;
    };

    area.addEventListener("pointermove", onMove);
    area.addEventListener("pointerleave", onLeave);
    area.addEventListener("pointercancel", onLeave);
    area.addEventListener("pointerup", onTouchEnd);
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => {
      if (frame && typeof cancelAnimationFrame === "function") cancelAnimationFrame(frame);
      area.removeEventListener("pointermove", onMove);
      area.removeEventListener("pointerleave", onLeave);
      area.removeEventListener("pointercancel", onLeave);
      area.removeEventListener("pointerup", onTouchEnd);
      window.removeEventListener("scroll", onScroll, { capture: true });
    };
  }, [ref, enabled]);
}
