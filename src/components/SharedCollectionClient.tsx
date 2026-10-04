"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
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
const SORT_KEYS = ["recent", "family", "rarity", "dropRate", "copies"];

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

/** Read-only mirror of CollectionClient for viewing someone else's binder via a share link - same filters, no select/discard. */
export function SharedCollectionClient({ pseudo }: { pseudo: string }) {
  const { t } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [cards, setCards] = useState<CardData[] | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  // Defaults to true (hidden-until-confirmed) so a guest viewer never briefly
  // sees the "propose a trade" button flash before we know their real status.
  const [viewerIsGuest, setViewerIsGuest] = useState(true);
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

  useEffect(() => {
    fetch("/api/me")
      .then((res) => res.json())
      .then((data) => setViewerIsGuest(data.isGuest));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.family) params.set("family", filters.family);
    if (filters.rarity) params.set("rarity", filters.rarity);
    if (filters.sort && filters.sort !== "recent") params.set("sort", filters.sort);
    if (filters.family === "SKILL" && filters.professions.length) {
      params.set("professions", filters.professions.join(","));
    }
    if (filters.q) params.set("q", filters.q);
    params.set("page", String(filters.page));

    fetch(`/api/collection/shared/${encodeURIComponent(pseudo)}?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        setCards(data.cards);
        setProgress(data.progress);
        setHasMore(data.hasMore);
      })
      .finally(() => setLoadingMore(false));
  }, [pseudo, filters]);

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

  if (notFound) {
    return (
      <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-10">
        <p className="text-neutral-400">{t("collection.shared.notFound")}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("collection.shared.title", { pseudo })}</h1>
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

      {!cards ? (
        <p className="text-neutral-400">{t("common.loading")}</p>
      ) : cards.length === 0 ? (
        <p className="text-neutral-400">{t("collection.empty")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {cards.map((card, i) => (
            <div
              key={i}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedCard(card)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedCard(card);
                }
              }}
              className="cursor-pointer"
              aria-label={t("collection.viewIn3d", { title: card.title })}
            >
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
        <CardDetailModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          tradeWithPseudo={pseudo}
          viewerIsGuest={viewerIsGuest}
        />
      )}
    </main>
  );
}
