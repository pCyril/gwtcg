"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Share2, Check } from "lucide-react";
import { CardTile, type CardData } from "@/components/CardTile";
import { CardDetailModal } from "@/components/CardDetailModal";
import { RarityLegend } from "@/components/RarityLegend";
import { CollectionSearchInput } from "@/components/CollectionSearchInput";
import { RARITY_STYLES, rarityLabelKey, familyLabelKey, type RarityKey } from "@/lib/game/rarityStyles";
import { useLocale } from "@/lib/i18n/LocaleContext";
import type { TranslationKey } from "@/lib/i18n/translations";

const FAMILY_KEYS = ["SKILL", "BOSS", "HERO_NPC", "LOCATION", "ITEM", "WEAPON", "LORE"];
const RARITY_KEYS = Object.keys(RARITY_STYLES) as RarityKey[];
const PROFESSIONS = [
  "Warrior",
  "Ranger",
  "Monk",
  "Necromancer",
  "Mesmer",
  "Elementalist",
  "Assassin",
  "Ritualist",
  "Paragon",
  "Dervish",
];

interface Progress {
  uniqueOwned: number;
  corpusSize: number;
  percent: number;
}

interface Filters {
  family: string;
  rarity: string;
  sort: string;
  professions: string[];
  q: string;
  page: number;
}

const SORT_KEYS = ["recent", "family", "rarity", "dropRate", "copies"];

export function CollectionClient() {
  const { t } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [cards, setCards] = useState<CardData[] | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [pseudo, setPseudo] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [filters, setFilters] = useState<Filters>({
    family: searchParams.get("family") ?? "",
    rarity: searchParams.get("rarity") ?? "",
    sort: searchParams.get("sort") ?? "recent",
    professions: searchParams.get("professions")?.split(",").filter(Boolean) ?? [],
    q: searchParams.get("q") ?? "",
    page: Math.max(1, Number(searchParams.get("page")) || 1),
  });

  // Keep the URL in sync so filters survive a refresh/back-button and can be
  // shared as a link, without cluttering browser history per filter change.
  function updateFilters(next: Filters) {
    setFilters(next);
    const params = new URLSearchParams();
    if (next.family) params.set("family", next.family);
    if (next.rarity) params.set("rarity", next.rarity);
    if (next.sort && next.sort !== "recent") params.set("sort", next.sort);
    if (next.family === "SKILL" && next.professions.length) params.set("professions", next.professions.join(","));
    if (next.q) params.set("q", next.q);
    if (next.page > 1) params.set("page", String(next.page));
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function toggleProfession(profession: string) {
    const selected = filters.professions.includes(profession)
      ? filters.professions.filter((p) => p !== profession)
      : [...filters.professions, profession];
    updateFilters({ ...filters, professions: selected, page: 1 });
  }

  function loadMore() {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    updateFilters({ ...filters, page: filters.page + 1 });
  }
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPending, setBulkPending] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const DISCARD_ERROR_MESSAGES: Record<string, string> = {
    CARD_IN_TRADE: t("error.CARD_IN_TRADE"),
    CARD_IN_AUCTION: t("error.CARD_IN_AUCTION"),
    INVALID_CARD_SELECTION: t("error.INVALID_CARD_SELECTION"),
  };

  function refresh() {
    const params = new URLSearchParams();
    if (filters.family) params.set("family", filters.family);
    if (filters.rarity) params.set("rarity", filters.rarity);
    if (filters.sort && filters.sort !== "recent") params.set("sort", filters.sort);
    if (filters.family === "SKILL" && filters.professions.length) {
      params.set("professions", filters.professions.join(","));
    }
    if (filters.q) params.set("q", filters.q);
    params.set("page", String(filters.page));

    return fetch(`/api/collection?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setCards(data.cards);
        setProgress(data.progress);
        setPseudo(data.pseudo);
        setHasMore(data.hasMore);
      })
      .finally(() => setLoadingMore(false));
  }

  async function share() {
    if (!pseudo) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/collection/${pseudo}`);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (permissions, insecure context) - silently ignore.
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Infinite scroll: bump the page (and the URL) once the sentinel below the
  // grid comes into view, as long as there's more to load and nothing is
  // already in flight.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "400px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loadingMore, filters]);

  function toggleSelectMode() {
    setSelectMode((v) => !v);
    setSelectedIds(new Set());
    setBulkError(null);
  }

  function toggleSelected(instanceId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(instanceId)) next.delete(instanceId);
      else next.add(instanceId);
      return next;
    });
  }

  async function discardSelected() {
    if (selectedIds.size === 0) return;
    if (!window.confirm(t("collection.discardConfirm", { count: selectedIds.size }))) return;
    setBulkPending(true);
    setBulkError(null);
    try {
      const res = await fetch("/api/collection/discard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardInstanceIds: [...selectedIds] }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBulkError(DISCARD_ERROR_MESSAGES[data.error] ?? t("common.unknownError"));
        return;
      }
      setSelectedIds(new Set());
      setSelectMode(false);
      await refresh();
    } finally {
      setBulkPending(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("collection.title")}</h1>
          {progress && (
            <p className="text-sm text-neutral-400">
              {t("collection.progress", {
                owned: progress.uniqueOwned,
                total: progress.corpusSize,
                percent: progress.percent,
              })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={share}
            disabled={!pseudo}
            className="flex items-center gap-1.5 text-sm text-neutral-400 underline hover:text-neutral-200 disabled:opacity-50"
          >
            {shareCopied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
            {shareCopied ? t("collection.shareCopied") : t("collection.share")}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={filters.family}
          onChange={(e) =>
            updateFilters({
              ...filters,
              family: e.target.value,
              professions: e.target.value === "SKILL" ? filters.professions : [],
              page: 1,
            })
          }
          className="rounded border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm"
        >
          <option value="">{t("collection.allFamilies")}</option>
          {FAMILY_KEYS.map((key) => (
            <option key={key} value={key}>
              {t(familyLabelKey(key))}
            </option>
          ))}
        </select>
        <select
          value={filters.rarity}
          onChange={(e) => updateFilters({ ...filters, rarity: e.target.value, page: 1 })}
          className="rounded border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm"
        >
          <option value="">{t("collection.allRarities")}</option>
          {RARITY_KEYS.map((key) => (
            <option key={key} value={key}>
              {t(rarityLabelKey(key))}
            </option>
          ))}
        </select>
        <select
          value={filters.sort}
          onChange={(e) => updateFilters({ ...filters, sort: e.target.value, page: 1 })}
          className="rounded border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm"
        >
          {SORT_KEYS.map((key) => (
            <option key={key} value={key}>
              {t(`collection.sort.${key}` as TranslationKey)}
            </option>
          ))}
        </select>
        <button
          onClick={toggleSelectMode}
          className={`ml-auto rounded border px-3 py-1.5 text-sm ${
            selectMode
              ? "border-red-700 text-red-300 hover:border-red-500"
              : "border-neutral-700 text-neutral-300 hover:border-neutral-500"
          }`}
        >
          {selectMode ? t("collection.cancelSelectMode") : t("collection.selectMode")}
        </button>
      </div>

      {filters.family === "SKILL" && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-neutral-500">
            {t("collection.filterByProfession")}
          </span>
          {PROFESSIONS.map((profession) => {
            const active = filters.professions.includes(profession);
            return (
              <button
                key={profession}
                onClick={() => toggleProfession(profession)}
                className={`rounded-full border px-3 py-1 text-sm ${
                  active
                    ? "border-emerald-400 bg-emerald-950/40 text-emerald-300"
                    : "border-neutral-700 text-neutral-300 hover:border-neutral-500"
                }`}
              >
                {profession}
              </button>
            );
          })}
        </div>
      )}

      <RarityLegend />

      <CollectionSearchInput value={filters.q} onChange={(q) => updateFilters({ ...filters, q, page: 1 })} />

      {selectMode && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-red-900/60 bg-red-950/20 px-4 py-2 text-sm">
          <span>{t("collection.selectedCount", { count: selectedIds.size })}</span>
          <button
            onClick={discardSelected}
            disabled={selectedIds.size === 0 || bulkPending}
            className="rounded bg-red-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
          >
            {t("collection.discardSelected")}
          </button>
          {bulkError && <span className="text-xs text-red-400">{bulkError}</span>}
        </div>
      )}

      {!cards ? (
        <p className="text-neutral-400">{t("common.loading")}</p>
      ) : cards.length === 0 ? (
        <p className="text-neutral-400">{t("collection.empty")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {cards.map((card) => (
            <div
              key={card.instanceId}
              role="button"
              tabIndex={0}
              onClick={() =>
                selectMode ? card.instanceId && toggleSelected(card.instanceId) : setSelectedCard(card)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (selectMode) {
                    if (card.instanceId) toggleSelected(card.instanceId);
                  } else {
                    setSelectedCard(card);
                  }
                }
              }}
              className="relative cursor-pointer"
              aria-label={
                selectMode
                  ? t("collection.selectCard", { title: card.title })
                  : t("collection.viewIn3d", { title: card.title })
              }
            >
              {selectMode && (
                <div
                  className={`absolute left-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded border-2 ${
                    card.instanceId && selectedIds.has(card.instanceId)
                      ? "border-red-500 bg-red-600"
                      : "border-neutral-400 bg-neutral-900/80"
                  }`}
                >
                  {card.instanceId && selectedIds.has(card.instanceId) && (
                    <span className="text-xs text-white">✓</span>
                  )}
                </div>
              )}
              <CardTile card={card} />
            </div>
          ))}
        </div>
      )}

      {cards && cards.length > 0 && (
        <div ref={sentinelRef} className="flex justify-center py-2">
          {loadingMore && <p className="text-sm text-neutral-500">{t("common.loading")}</p>}
        </div>
      )}

      {selectedCard && (
        <CardDetailModal card={selectedCard} onClose={() => setSelectedCard(null)} onDiscarded={refresh} onRarityChanged={refresh} />
      )}
    </main>
  );
}
