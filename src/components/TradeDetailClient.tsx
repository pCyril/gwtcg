"use client";

import { useEffect, useRef, useState } from "react";
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
  const [search, setSearch] = useState("");
  const [collectionPage, setCollectionPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  // Editable draft of my offer (full card data so it can be shown and removed from right here).
  const [offer, setOffer] = useState<CardData[]>([]);
  const offerRef = useRef<CardData[]>([]);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const dirtyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [seededFor, setSeededFor] = useState<string | null>(null);

  function refreshTrade(): Promise<TradeDetail | null> {
    return fetch(`/api/trade/${tradeId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return null;
        }
        setTrade(data);
        return data as TradeDetail;
      });
  }

  useEffect(() => {
    refreshTrade();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradeId]);

  // Server-side name search (the collection endpoint only returns the first
  // 100 cards per page, so filtering client-side would miss most of it).
  // Debounced so typing doesn't fire a request per keystroke; the "load more"
  // button bumps the page, which re-returns everything through that page.
  useEffect(() => {
    let ignore = false;
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ page: String(collectionPage) });
      if (search.trim()) params.set("q", search.trim());
      fetch(`/api/collection?${params.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          if (ignore) return;
          setMyCollection(data.cards);
          setHasMore(Boolean(data.hasMore));
        });
    }, 250);
    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [search, collectionPage]);

  // Mirror the draft into a ref so the save loop always sends the latest one.
  useEffect(() => {
    offerRef.current = offer;
  }, [offer]);

  // Seed the editable draft from my current offer, once per trade load. Adjusting
  // state during render (rather than in an effect) is the React-sanctioned way to
  // respond to a prop/data change without an extra commit-then-effect round trip.
  if (trade && seededFor !== trade.id) {
    const mine = trade.isInitiator ? trade.initiator : trade.recipient;
    setOffer(mine.cards);
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

  // Every change to the offer is saved right away - no "update" button. Saves
  // are serialized: while one is in flight, further edits just mark the draft
  // dirty and are sent as a single follow-up with the latest draft.
  async function flushOffer() {
    if (savingRef.current) {
      dirtyRef.current = true;
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      do {
        dirtyRef.current = false;
        const res = await fetch(`/api/trade/${tradeId}/offer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cardInstanceIds: offerRef.current.map((c) => c.instanceId!) }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "UNKNOWN_ERROR");
          // Roll the draft back to what the server actually has.
          const fresh = await refreshTrade();
          if (fresh) {
            const serverMine = (fresh.isInitiator ? fresh.initiator : fresh.recipient).cards;
            offerRef.current = serverMine;
            setOffer(serverMine);
          }
          dirtyRef.current = false;
          return;
        }
      } while (dirtyRef.current);
      setError(null);
      await refreshTrade();
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  function changeOffer(next: CardData[]) {
    offerRef.current = next;
    setOffer(next);
    void flushOffer();
  }

  // Cards are matched by card id, not instance id: the picker shows one
  // representative copy per card, which may differ from the copy already in
  // the offer - matching instances left such a card impossible to take back.
  // Both read the ref (always the latest draft) so rapid clicks before a re-render don't overwrite each other.
  function toggleCard(card: CardData) {
    const current = offerRef.current;
    if (current.some((c) => c.cardId === card.cardId)) {
      changeOffer(current.filter((c) => c.cardId !== card.cardId));
    } else if (current.length < MAX_TRADE_ITEMS) {
      changeOffer([...current, card]);
    }
  }

  function removeFromOffer(instanceId: string) {
    changeOffer(offerRef.current.filter((c) => c.instanceId !== instanceId));
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
            {(isPending ? offer : mine.cards).map((card) => (
              <div key={card.instanceId} className="relative">
                <CardTile card={card} />
                {isPending && (
                  <button
                    onClick={() => removeFromOffer(card.instanceId!)}
                    aria-label={t("trade.removeCard", { title: card.title })}
                    title={t("trade.removeCard", { title: card.title })}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-700 text-sm font-bold text-white shadow hover:bg-red-600"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            {(isPending ? offer : mine.cards).length === 0 && (
              <p className="text-sm text-neutral-500">{t("trade.nothingYet")}</p>
            )}
          </div>

          {isPending && (
            <>
              <p className="text-xs text-neutral-500">
                {t("trade.selectedCount", { count: offer.length, max: MAX_TRADE_ITEMS })}
                {saving && <span className="ml-2 text-emerald-400">{t("trade.saving")}</span>}
              </p>
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCollectionPage(1);
                }}
                placeholder={t("trade.searchPlaceholder")}
                className="rounded border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm"
              />
              <div className="max-h-72 overflow-y-auto rounded border border-neutral-800 p-2">
                {myCollection?.length === 0 && <p className="text-sm text-neutral-500">{t("trade.noResults")}</p>}
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {myCollection?.map((card) => (
                    <div
                      key={card.instanceId}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleCard(card)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleCard(card);
                        }
                      }}
                      className={`cursor-pointer rounded-lg transition ${
                        offer.some((c) => c.cardId === card.cardId) ? "opacity-100 ring-2 ring-emerald-400" : "opacity-60 hover:opacity-90"
                      }`}
                    >
                      <CardTile card={card} />
                    </div>
                  ))}
                </div>
                {hasMore && (
                  <button
                    onClick={() => setCollectionPage((p) => p + 1)}
                    className="mt-2 w-full rounded border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:border-emerald-400"
                  >
                    {t("trade.loadMore")}
                  </button>
                )}
              </div>
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
            disabled={pending || saving}
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
