/**
 * "Reduce visual effects" preference (accessibility): switched from the footer, stored
 * in the `gm_effects` cookie so the server can set `data-reduce-effects` on <html> on
 * the first render (no flash of effects). globals.css then
 * stops decorative animations, like it does for `prefers-reduced-motion`.
 */
export const EFFECTS_COOKIE = "gm_effects";
export const EFFECTS_REDUCED_VALUE = "reduced";
export const REDUCE_EFFECTS_ATTR = "data-reduce-effects";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Writes the preference (cookie + <html> attribute) - client only. */
export function setReducedEffects(reduced: boolean) {
  const root = document.documentElement;
  if (reduced) root.setAttribute(REDUCE_EFFECTS_ATTR, "");
  else root.removeAttribute(REDUCE_EFFECTS_ATTR);
  document.cookie = reduced
    ? `${EFFECTS_COOKIE}=${EFFECTS_REDUCED_VALUE}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`
    : `${EFFECTS_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

/**
 * True when motion and decorative effects should be skipped: the site setting is on,
 * or the system asks for reduced motion.
 */
export function prefersReducedEffects(): boolean {
  if (typeof window === "undefined") return false;
  if (document.documentElement.hasAttribute(REDUCE_EFFECTS_ATTR)) return true;
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
