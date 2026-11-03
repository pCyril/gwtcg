"use client";

import { useEffect, useId, useRef, useState, type SyntheticEvent } from "react";
import { CardTile, type CardData } from "@/components/CardTile";
import { RarityLegend } from "@/components/RarityLegend";
import { RARITY_STYLES, rarityLabelKey, type RarityKey } from "@/lib/game/rarityStyles";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { RegisterForm } from "@/components/RegisterForm";
import { firstFocusable, useFocusAfterRender, useModalDialog } from "@/lib/useModalDialog";

const DRAMATIC_RARITIES: RarityKey[] = ["EPIC", "LEGENDARY", "MYTHIC"];

// Rarer pulls hold the spotlight a little longer before auto-advancing.
const REVEAL_DELAY_MS: Record<RarityKey, number> = {
  COMMON: 900,
  UNCOMMON: 1000,
  RARE: 1200,
  EPIC: 1500,
  LEGENDARY: 1900,
  MYTHIC: 2400,
};

const BURST_DURATION_MS = 450;

/** Users who asked the system for less motion get the final hand straight away (no shake, flip or pulse). */
function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}

/**
 * The closed, unopened booster pack object - what you click to open.
 * A <span> (display: block) so it's valid phrasing content inside the <button> that opens a pack.
 */
export function PackVisual() {
  return (
    <span className="block h-full w-full overflow-hidden rounded-2xl border-2 border-amber-400/60 shadow-[0_0_30px_rgba(217,180,80,0.25)]">
      {/* eslint-disable-next-line @next/next/no-img-element -- shared illustration, not an optimizable local asset set */}
      <img src="/card-art/pack-wrapper.webp" alt="" draggable={false} className="no-drag h-full w-full object-cover" />
    </span>
  );
}

/** The face-down side of an individual card, shown mid-flip before it reveals. */
export function CardBackVisual() {
  return (
    <div className="h-full w-full overflow-hidden rounded-2xl border-2 border-amber-400/60 shadow-[0_0_30px_rgba(217,180,80,0.25)]">
      {/* eslint-disable-next-line @next/next/no-img-element -- shared illustration, not an optimizable local asset set */}
      <img src="/card-art/card-back.jpg" alt="" draggable={false} className="no-drag h-full w-full object-cover" />
    </div>
  );
}

export function BoosterOverlay({
  pending,
  cards,
  label,
  onClose,
  isGuest = false,
  onAuthChange,
}: {
  pending: boolean;
  cards: CardData[] | null;
  label: string;
  onClose: () => void;
  isGuest?: boolean;
  onAuthChange?: () => void;
}) {
  const { t } = useLocale();
  const titleId = useId();
  const skipRef = useRef<HTMLButtonElement>(null);
  const doneHeadingRef = useRef<HTMLHeadingElement>(null);
  const registerButtonRef = useRef<HTMLButtonElement>(null);
  const registerFormRef = useRef<HTMLDivElement>(null);
  const focusAfterRender = useFocusAfterRender();
  const [revealStarted, setRevealStarted] = useState(false);
  const [revealIndex, setRevealIndex] = useState(0);
  // "Reveal all" (or Escape) - also the default for users who prefer reduced motion.
  const [skipped, setSkipped] = useState(prefersReducedMotion);
  const [showRegister, setShowRegister] = useState(false);
  const [registered, setRegistered] = useState(false);

  const resolved = !pending && cards !== null && cards.length > 0;
  const done = resolved && cards !== null && (skipped || (revealStarted && revealIndex >= cards.length));
  const revealing = resolved && revealStarted && !done;

  // Native modal dialog: the home page behind is inert, so focus can't wander under the veil.
  // Focus starts on "Reveal all" so the reveal can be stopped right away. Focus is given
  // back to the pack by HomeClient (the pack button may be disabled by then).
  const { ref: dialogRef, isStaleClose } = useModalDialog({
    initialFocus: (dialog) => skipRef.current ?? doneHeadingRef.current ?? firstFocusable(dialog),
    restoreFocus: false,
  });

  // Lock background scroll while the overlay is open so only the modal itself scrolls.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Hold the burst beat for BURST_DURATION_MS before starting the one-by-one reveal.
  useEffect(() => {
    if (!resolved || skipped) return;
    const t = setTimeout(() => setRevealStarted(true), BURST_DURATION_MS);
    return () => clearTimeout(t);
  }, [resolved, skipped]);

  // Auto-advance through the hand, pausing longer on rarer pulls.
  useEffect(() => {
    if (!revealing || !cards) return;
    const rarity = cards[revealIndex]?.rarity ?? "COMMON";
    const t = setTimeout(() => setRevealIndex((i) => i + 1), REVEAL_DELAY_MS[rarity]);
    return () => clearTimeout(t);
  }, [revealing, revealIndex, cards]);

  // "Reveal all" disappears with the reveal: move focus to the results heading instead of losing it.
  useEffect(() => {
    if (done) doneHeadingRef.current?.focus();
  }, [done]);

  // Escape stops the reveal; once the hand is shown, it closes the overlay (like "Close").
  function onCancel(e: SyntheticEvent<HTMLDialogElement>) {
    e.preventDefault();
    if (done) onClose();
    else setSkipped(true);
  }

  // The browser may close the dialog anyway (repeated Escape, Android back): treat it the same way.
  function onNativeClose() {
    if (isStaleClose()) return;
    if (done) {
      onClose();
      return;
    }
    setSkipped(true);
    dialogRef.current?.showModal();
  }

  let status: string;
  if (done && cards) {
    status = t("booster.a11y.done", { count: cards.length });
  } else if (revealing && cards && cards[revealIndex]) {
    const card = cards[revealIndex];
    status = t("booster.a11y.progress", {
      n: revealIndex + 1,
      total: cards.length,
      title: card.title,
      rarity: t(rarityLabelKey(card.rarity)),
    });
  } else {
    status = t("booster.a11y.opening");
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={onCancel}
      onClose={onNativeClose}
      className="fixed inset-0 z-50 m-0 h-full max-h-none w-full max-w-none overflow-y-auto border-0 bg-black/80 p-4 text-inherit backdrop-blur-sm backdrop:bg-transparent"
    >
      {/* Dialog name: the pack while it opens, then the results heading. */}
      <span id={titleId} hidden>
        {done ? t("booster.cardsObtained") : label}
      </span>
      {/* One polite message per step (opening, each card, result) - never per animation frame. */}
      <div role="status" className="sr-only">
        {status}
      </div>
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center justify-center gap-6 py-8">
        {!done && (
          <div className="flex flex-col items-center gap-5">
            {!resolved && (
              <div className="flex flex-col items-center gap-4">
                <span className="text-sm font-semibold uppercase tracking-widest text-amber-300">{label}</span>
                <div className="aspect-[5/7] w-56">
                  {/* Shaking stops as soon as "Reveal all" is pressed, even before the server answers. */}
                  <div className={`${skipped ? "" : "pack-shake "}h-full w-full`}>
                    <PackVisual />
                  </div>
                </div>
              </div>
            )}

            {resolved && !revealStarted && (
              <div className="flex flex-col items-center gap-4">
                <span className="text-sm font-semibold uppercase tracking-widest text-amber-300">{label}</span>
                <div className="relative aspect-[5/7] w-56">
                  <div className="pack-burst h-full w-full">
                    <PackVisual />
                  </div>
                  <div className="burst-flash absolute inset-0 rounded-2xl bg-white" />
                </div>
              </div>
            )}

            {revealing && cards && (
              <RevealingCard key={revealIndex} card={cards[revealIndex]} index={revealIndex} total={cards.length} />
            )}

            {/* Outside RevealingCard (which remounts for every card) so it keeps the focus until pressed. */}
            <button
              ref={skipRef}
              type="button"
              onClick={() => setSkipped(true)}
              className="text-sm text-neutral-500 underline hover:text-neutral-300"
            >
              {t("booster.revealAll")}
            </button>
          </div>
        )}

        {done && cards && (
          <div className="flex w-full flex-col items-center gap-6">
            <h2 ref={doneHeadingRef} tabIndex={-1} className="text-xl font-semibold text-neutral-100">
              {t("booster.cardsObtained")}
            </h2>
            <RarityLegend className="justify-center" />
            <div className="grid w-full grid-cols-2 gap-4 md:grid-cols-3">
              {cards.map((card, i) => (
                <div key={card.instanceId ?? i} className="card-reveal" style={{ animationDelay: `${i * 90}ms` }}>
                  <CardTile card={card} />
                </div>
              ))}
            </div>
            {isGuest && !registered && (
              <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-lg border border-emerald-800/60 bg-emerald-950/20 p-4 text-center">
                <p className="text-sm text-emerald-200">{t("booster.guestCta")}</p>
                {!showRegister ? (
                  <button
                    ref={registerButtonRef}
                    type="button"
                    onClick={() => {
                      setShowRegister(true);
                      focusAfterRender(() =>
                        registerFormRef.current ? firstFocusable(registerFormRef.current) : null,
                      );
                    }}
                    className="rounded bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
                  >
                    {t("auth.register")}
                  </button>
                ) : (
                  <div ref={registerFormRef} className="w-full max-w-xs text-left">
                    <RegisterForm
                      onSuccess={() => {
                        setRegistered(true);
                        setShowRegister(false);
                        onAuthChange?.();
                        focusAfterRender(() => doneHeadingRef.current);
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

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-700 px-5 py-2 text-sm text-neutral-200 hover:border-neutral-500"
            >
              {t("common.close")}
            </button>
          </div>
        )}
      </div>
    </dialog>
  );
}

/**
 * One spotlighted card: mounts face-down, flips a beat later. Keyed by index so each new card gets a fresh mount
 * (which is why "Reveal all" lives in the parent, not here).
 */
function RevealingCard({ card, index, total }: { card: CardData; index: number; total: number }) {
  const [flipped, setFlipped] = useState(false);
  const style = RARITY_STYLES[card.rarity];
  const dramatic = DRAMATIC_RARITIES.includes(card.rarity);

  useEffect(() => {
    const t = setTimeout(() => setFlipped(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative aspect-[5/7] w-72">
        {dramatic && flipped && (
          <div
            className="rarity-burst absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: `radial-gradient(circle, ${style.radial} 0%, transparent 70%)` }}
          />
        )}
        <div className="flip-scene h-full w-full">
          <div className={`flip-card h-full w-full ${flipped ? "is-flipped" : ""}`}>
            <div className="flip-face">
              <CardBackVisual />
            </div>
            <div className={`flip-face flip-face-back ${dramatic && flipped ? "glow-pulse" : ""}`}>
              <CardTile card={card} size="lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Visual progress only: the overlay's status message says "Card n of total". */}
      <div className="flex items-center gap-2" aria-hidden="true">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full ${i === index ? "bg-neutral-200" : "bg-neutral-700"}`}
          />
        ))}
      </div>
    </div>
  );
}
