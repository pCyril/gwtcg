"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { setReducedEffects } from "@/lib/visualEffects";

/**
 * Footer switch that turns the holographic foil and decorative animations off
 * (RGAA 13.8 / WCAG 2.3.3). `initialReduced` comes from the server-read cookie so
 * the first render matches the <html> attribute.
 */
export function VisualEffectsToggle({ initialReduced }: { initialReduced: boolean }) {
  const { t } = useLocale();
  const [reduced, setReduced] = useState(initialReduced);

  function toggle() {
    const next = !reduced;
    setReduced(next);
    setReducedEffects(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={!reduced}
      className="inline-flex items-center gap-1.5 rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300 hover:border-neutral-500 hover:text-neutral-100"
    >
      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
      <span>
        {t("effects.toggle")}
        {/* The state is conveyed by aria-pressed; the visible text just mirrors it. */}
        <span aria-hidden="true">{reduced ? t("effects.off") : t("effects.on")}</span>
      </span>
    </button>
  );
}
