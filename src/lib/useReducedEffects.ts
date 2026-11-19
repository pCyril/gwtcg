"use client";

import { useSyncExternalStore } from "react";
import { prefersReducedEffects, REDUCE_EFFECTS_ATTR } from "@/lib/visualEffects";

function subscribeToReducedEffects(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: [REDUCE_EFFECTS_ATTR] });
  const media = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  media?.addEventListener("change", onChange);
  return () => {
    observer.disconnect();
    media?.removeEventListener("change", onChange);
  };
}

/** `prefersReducedEffects()` as live state, for what can't be switched off from CSS (animated GIFs). */
export function useReducedEffects(): boolean {
  return useSyncExternalStore(subscribeToReducedEffects, prefersReducedEffects, () => false);
}
