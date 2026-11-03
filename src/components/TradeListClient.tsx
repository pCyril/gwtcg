"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/i18n/LocaleContext";
import type { TranslationKey } from "@/lib/i18n/translations";
import { RegisterForm } from "@/components/RegisterForm";

interface TradeSummary {
  id: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED";
  createdAt: string;
  counterparty: string;
  isInitiator: boolean;
}

export function TradeListClient() {
  const { t, tError } = useLocale();
  const router = useRouter();
  const [trades, setTrades] = useState<TradeSummary[] | null>(null);
  const [pseudo, setPseudo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // Defaults to true (hidden-until-confirmed) so a guest never briefly sees
  // the trade form flash before we know their real status.
  const [isGuest, setIsGuest] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const registerButtonRef = useRef<HTMLButtonElement>(null);
  // Set when the register form is cancelled so focus goes back to "Create an account" instead of <body>.
  const restoreRegisterFocus = useRef(false);
  const id = useId();
  const ids = { pseudo: `${id}-pseudo`, error: `${id}-error` };

  useEffect(() => {
    if (!showRegister && restoreRegisterFocus.current) {
      registerButtonRef.current?.focus();
      restoreRegisterFocus.current = false;
    }
  }, [showRegister]);

  function refresh() {
    fetch("/api/trade")
      .then((res) => res.json())
      .then((data) => setTrades(data.trades));
  }

  function refreshMe() {
    fetch("/api/me")
      .then((res) => res.json())
      .then((data) => setIsGuest(data.isGuest));
  }

  useEffect(refresh, []);
  useEffect(refreshMe, []);

  async function createTrade(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // aria-disabled (not disabled) keeps focus on the button while the request runs.
    if (pending) return;
    if (!pseudo.trim()) {
      setError(t("a11y.l3.recipientEmpty"));
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientPseudo: pseudo.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(tError(data.error));
        return;
      }
      router.push(`/trade/${data.id}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex flex-col gap-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t("tradeList.title")}</h1>
      </div>

      <section className="flex flex-col gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
        <h2 className="text-lg font-semibold">{t("tradeList.newTrade")}</h2>
        {isGuest ? (
          !showRegister ? (
            <div className="flex flex-col items-start gap-2">
              <p className="text-sm text-neutral-400">{t("error.GUEST_CANNOT_TRADE")}</p>
              <button
                ref={registerButtonRef}
                type="button"
                onClick={() => setShowRegister(true)}
                className="rounded bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
              >
                {t("auth.register")}
              </button>
            </div>
          ) : (
            <div className="max-w-xs">
              <RegisterForm
                focusOnMount
                onSuccess={() => {
                  setShowRegister(false);
                  refreshMe();
                }}
                onCancel={() => {
                  restoreRegisterFocus.current = true;
                  setShowRegister(false);
                }}
              />
            </div>
          )
        ) : (
          <form onSubmit={createTrade} noValidate className="flex flex-col gap-1">
            <label htmlFor={ids.pseudo} className="text-sm">
              {t("tradeList.pseudoPlaceholder")}
            </label>
            <div className="flex gap-2">
              <input
                id={ids.pseudo}
                name="recipientPseudo"
                autoComplete="off"
                value={pseudo}
                onChange={(e) => setPseudo(e.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? ids.error : undefined}
                className="min-w-0 flex-1 rounded border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm"
              />
              <button
                type="submit"
                aria-disabled={pending || undefined}
                className="shrink-0 rounded bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 aria-disabled:opacity-50"
              >
                {t("tradeList.propose")}
              </button>
            </div>
          </form>
        )}
        {/* Always mounted so screen readers announce the message when it is filled in. */}
        <p id={ids.error} role="alert" className={error ? "text-sm text-red-400" : "sr-only"}>
          {error}
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t("tradeList.myTrades")}</h2>
        {/* Persistent status region: "Loading..." while the list is fetched, empty afterwards. */}
        <p role="status" className={!trades ? "text-sm text-neutral-400" : "sr-only"}>
          {!trades ? t("common.loading") : ""}
        </p>
        {!trades ? null : trades.length === 0 ? (
          <p className="text-sm text-neutral-400">{t("tradeList.empty")}</p>
        ) : (
          <ul role="list" className="flex flex-col divide-y divide-neutral-800 rounded-lg border border-neutral-800">
            {trades.map((trade) => (
              <li key={trade.id}>
                <Link
                  href={`/trade/${trade.id}`}
                  className="flex items-center justify-between px-4 py-3 text-sm hover:bg-neutral-900/60"
                >
                  <span>
                    {trade.isInitiator ? t("tradeList.to") : t("tradeList.from")}
                    <strong>{trade.counterparty}</strong>
                  </span>
                  <span className="text-neutral-400">{t(`trade.status.${trade.status}` as TranslationKey)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
