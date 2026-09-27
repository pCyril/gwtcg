"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CardTile, type CardData } from "@/components/CardTile";
import { useLocale } from "@/lib/i18n/LocaleContext";

const MAX_TRADE_ITEMS = 7;

interface TradeSide {
  pseudo: string;
  confirmed: boolean;
  cards: CardData[];
}

interface TradeDetail {
  id: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED";
  isInitiator: boolean;
  initiator: TradeSide;
  recipient: TradeSide;
}

export function TradeDetailClient({ tradeId }: { tradeId: string }) {
  const { t, tError } = useLocale();
  const [trade, setTrade] = useState<TradeDetail | null>(null);
  const [myCollection, setMyCollection] = useState<CardData[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [seededFor, setSeededFor] = useState<string | null>(null);

  function refreshTrade() {
    return fetch(`/api/trade/${tradeId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setTrade(data);
      });
  }

  useEffect(() => {
    refreshTrade();
    fetch("/api/collection")
      .then((res) => res.json())
      .then((data) => setMyCollection(data.cards));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradeId]);

  // Seed the editable draft from my current offer, once per trade load. Adjusting
  // state during render (rather than in an effect) is the React-sanctioned way to
  // respond to a prop/data change without an extra commit-then-effect round trip.
  if (trade && seededFor !== trade.id) {
    const mine = trade.isInitiator ? trade.initiator : trade.recipient;
    setSelected(new Set(mine.cards.map((c) => c.instanceId!)));
    setSeededFor(trade.id);
  }

  if (!trade) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 text-neutral-400">
        {error ? tError(error) : t("common.loading")}
      </main>
    );
  }

  const mine = trade.isInitiator ? trade.initiator : trade.recipient;
  const theirs = trade.isInitiator ? trade.recipient : trade.initiator;
  const isPending = trade.status === "PENDING";

  function toggleCard(instanceId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(instanceId)) {
        next.delete(instanceId);
      } else if (next.size < MAX_TRADE_ITEMS) {
        next.add(instanceId);
      }
      return next;
    });
  }

  async function updateOffer() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/trade/${tradeId}/offer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardInstanceIds: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      await refreshTrade();
    } finally {
      setPending(false);
    }
  }

  async function confirm() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/trade/${tradeId}/confirm`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
      }
      await refreshTrade();
    } finally {
      setPending(false);
    }
  }

  async function cancel() {
    setPending(true);
    try {
      await fetch(`/api/trade/${tradeId}/cancel`, { method: "POST" });
      await refreshTrade();
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t("trade.title", { pseudo: theirs.pseudo })}</h1>
        <Link href="/trade" className="text-sm text-neutral-400 underline hover:text-neutral-200">
          {t("trade.backToList")}
        </Link>
      </div>

      {trade.status !== "PENDING" && (
        <p className="rounded-lg border border-neutral-800 bg-neutral-900/50 px-4 py-2 text-sm text-neutral-300">
          {
            {
              ACCEPTED: t("trade.accepted"),
              DECLINED: t("trade.declined"),
              CANCELLED: t("trade.cancelled"),
            }[trade.status]
          }
        </p>
      )}
      {error && <p className="text-sm text-red-400">{tError(error)}</p>}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* My side */}
        <section className="flex flex-col gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{t("trade.yourOffer")}</h2>
            <span className={mine.confirmed ? "text-emerald-400" : "text-neutral-500"}>
              {mine.confirmed ? t("common.confirmed") : t("common.pending")}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {mine.cards.map((card) => (
              <CardTile key={card.instanceId} card={card} />
            ))}
            {mine.cards.length === 0 && <p className="text-sm text-neutral-500">{t("trade.nothingYet")}</p>}
          </div>

          {isPending && (
            <>
              <p className="text-xs text-neutral-500">
                {t("trade.selectedCount", { count: selected.size, max: MAX_TRADE_ITEMS })}
              </p>
              <div className="max-h-72 overflow-y-auto rounded border border-neutral-800 p-2">
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {myCollection?.map((card) => (
                    <div
                      key={card.instanceId}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleCard(card.instanceId!)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleCard(card.instanceId!);
                        }
                      }}
                      className={`cursor-pointer rounded-lg transition ${
                        selected.has(card.instanceId!) ? "opacity-100 ring-2 ring-emerald-400" : "opacity-60 hover:opacity-90"
                      }`}
                    >
                      <CardTile card={card} />
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={updateOffer}
                disabled={pending}
                className="rounded border border-neutral-700 px-3 py-1.5 text-sm hover:border-emerald-400 disabled:opacity-50"
              >
                {t("trade.updateOffer")}
              </button>
            </>
          )}
        </section>

        {/* Their side */}
        <section className="flex flex-col gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{t("trade.theirOffer", { pseudo: theirs.pseudo })}</h2>
            <span className={theirs.confirmed ? "text-emerald-400" : "text-neutral-500"}>
              {theirs.confirmed ? t("common.confirmed") : t("common.pending")}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {theirs.cards.map((card) => (
              <CardTile key={card.instanceId} card={card} />
            ))}
            {theirs.cards.length === 0 && <p className="text-sm text-neutral-500">{t("trade.nothingYet")}</p>}
          </div>
        </section>
      </div>

      {isPending && (
        <div className="flex gap-3">
          <button
            onClick={confirm}
            disabled={pending}
            className="rounded bg-emerald-600 px-5 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {t("trade.confirm")}
          </button>
          <button
            onClick={cancel}
            disabled={pending}
            className="rounded border border-neutral-700 px-5 py-2 text-neutral-300 hover:border-red-400 hover:text-red-400 disabled:opacity-50"
          >
            {t("trade.cancel")}
          </button>
        </div>
      )}
    </main>
  );
}
