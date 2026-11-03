"use client";

import { useEffect, useId, useRef, useState, type SyntheticEvent } from "react";
import { CardTile, type CardData } from "@/components/CardTile";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { RARITY_STYLES, rarityLabelKey, type RarityKey } from "@/lib/game/rarityStyles";
import { useFocusAfterRender, useModalDialog } from "@/lib/useModalDialog";

interface RarityOption {
  rarity: RarityKey;
  spares: number;
  undiscovered: number;
  given: { cardId: string; title: string; count: number; instanceIds: string[] }[] | null;
}

interface Overview {
  cost: number;
  dailyLimit: number;
  remainingToday: number;
  rarities: RarityOption[];
}

type Step = { kind: "list" } | { kind: "confirm"; option: RarityOption } | { kind: "result"; card: CardData };

/**
 * Duplicate exchange: give up 10 spare copies of one rarity for a random card of
 * that rarity the player doesn't own (5 per day). Native modal <dialog>, three
 * steps (choose a rarity, review what will be given, see the card received);
 * focus moves to each step's heading so screen reader users hear the change.
 */
export function ExchangeDialog({ onClose, onExchanged }: { onClose: () => void; onExchanged: () => void }) {
  const { t, tError } = useLocale();
  const titleId = useId();
  const { ref: dialogRef, isStaleClose } = useModalDialog();
  const focusAfterRender = useFocusAfterRender();
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [step, setStep] = useState<Step>({ kind: "list" });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  function load() {
    return fetch("/api/collection/exchange")
      .then((res) => res.json())
      .then((data: Overview) => setOverview(data))
      .catch(() => setError(t("common.unknownError")));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function goTo(next: Step) {
    setStep(next);
    setError(null);
    focusAfterRender(() => stepHeadingRef.current);
  }

  function onCancel(e: SyntheticEvent<HTMLDialogElement>) {
    e.preventDefault();
    onClose();
  }

  function onNativeClose() {
    if (!isStaleClose()) onClose();
  }

  async function confirm(option: RarityOption) {
    if (pending || !option.given) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/collection/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rarity: option.rarity, cardInstanceIds: option.given.flatMap((g) => g.instanceIds) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(tError(data.error));
        await load();
        return;
      }
      onExchanged();
      setAnnouncement(t("exchange.received", { title: data.card.title }));
      goTo({ kind: "result", card: data.card });
      await load();
    } finally {
      setPending(false);
    }
  }

  const limitReached = overview !== null && overview.remainingToday <= 0;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={onCancel}
      onClose={onNativeClose}
      className="m-auto max-h-[calc(100%-2rem)] w-[min(40rem,calc(100%-2rem))] overflow-y-auto rounded-lg border border-neutral-700 bg-neutral-900 p-5 text-neutral-100 backdrop:bg-black/80"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-xl font-bold">
            {t("exchange.title")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded border border-neutral-600 px-3 py-1 text-sm text-neutral-200 hover:border-neutral-400"
          >
            {t("exchange.close")}
          </button>
        </div>

        <div role="status" className="sr-only">
          {announcement}
        </div>

        {!overview ? (
          <p role="status" className="text-neutral-300">
            {t("common.loading")}
          </p>
        ) : (
          <>
            <p className="text-sm text-neutral-300">{t("exchange.intro", { cost: overview.cost })}</p>
            <p className="text-sm font-medium text-neutral-100">
              {limitReached
                ? t("exchange.limitReached", { limit: overview.dailyLimit })
                : t("exchange.remaining", { remaining: overview.remainingToday, limit: overview.dailyLimit })}
            </p>

            {step.kind === "list" && (
              <ExchangeList
                overview={overview}
                limitReached={limitReached}
                onChoose={(option) => goTo({ kind: "confirm", option })}
              />
            )}

            {step.kind === "confirm" && (
              <section aria-labelledby="exchange-confirm-title" className="flex flex-col gap-3">
                <h3 id="exchange-confirm-title" ref={stepHeadingRef} tabIndex={-1} className="font-semibold outline-none">
                  {t("exchange.confirmTitle", { cost: overview.cost, rarity: t(rarityLabelKey(step.option.rarity)) })}
                </h3>
                <ul className="ml-5 list-disc text-sm text-neutral-200">
                  {step.option.given?.map((g) => (
                    <li key={g.cardId}>
                      {g.title} ×{g.count}
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-neutral-300">{t("exchange.confirmNote")}</p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => confirm(step.option)}
                    aria-disabled={pending || limitReached || undefined}
                    className="rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 aria-disabled:opacity-50"
                  >
                    {pending ? t("exchange.pending") : t("exchange.confirm")}
                  </button>
                  <button
                    type="button"
                    onClick={() => goTo({ kind: "list" })}
                    className="rounded border border-neutral-600 px-4 py-2 text-sm text-neutral-200 hover:border-neutral-400"
                  >
                    {t("exchange.back")}
                  </button>
                </div>
              </section>
            )}

            {step.kind === "result" && (
              <section aria-labelledby="exchange-result-title" className="flex flex-col items-center gap-3">
                <h3 id="exchange-result-title" ref={stepHeadingRef} tabIndex={-1} className="font-semibold outline-none">
                  {t("exchange.received", { title: step.card.title })}
                </h3>
                <div className="w-[min(16rem,70vw)]">
                  <CardTile card={step.card} size="lg" />
                </div>
                {!limitReached && (
                  <button
                    type="button"
                    onClick={() => goTo({ kind: "list" })}
                    className="rounded border border-neutral-600 px-4 py-2 text-sm text-neutral-200 hover:border-neutral-400"
                  >
                    {t("exchange.again")}
                  </button>
                )}
              </section>
            )}
          </>
        )}

        {/* Mounted up front so the alert region exists before an error is written into it. */}
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      </div>
    </dialog>
  );
}

function ExchangeList({
  overview,
  limitReached,
  onChoose,
}: {
  overview: Overview;
  limitReached: boolean;
  onChoose: (option: RarityOption) => void;
}) {
  const { t } = useLocale();
  const baseId = useId();
  return (
    <ul className="flex flex-col gap-2">
      {overview.rarities.map((option) => {
        const label = t(rarityLabelKey(option.rarity));
        const reason =
          option.undiscovered === 0
            ? t("exchange.nothingToDiscover")
            : !option.given
              ? t("exchange.notEnough", { cost: overview.cost })
              : null;
        const unavailable = limitReached || reason !== null;
        const reasonId = `${baseId}-${option.rarity}`;
        return (
          <li
            key={option.rarity}
            className={`flex flex-wrap items-center justify-between gap-2 rounded border-l-4 bg-neutral-800/60 px-3 py-2 ${RARITY_STYLES[option.rarity].border}`}
          >
            <div className="min-w-0">
              <h3 className="font-semibold">{label}</h3>
              <p className="text-xs text-neutral-300">
                {t("exchange.rarityStats", { spares: option.spares, undiscovered: option.undiscovered })}
              </p>
              {reason && (
                <p id={reasonId} className="text-xs text-neutral-400">
                  {reason}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => !unavailable && onChoose(option)}
              aria-disabled={unavailable || undefined}
              aria-describedby={reason ? reasonId : undefined}
              className="rounded bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
            >
              {t("exchange.action", { cost: overview.cost, rarity: label })}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
