"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { CardTile, CARD_TILE_OVERLAY_CLASS, type CardData } from "@/components/CardTile";
import { CardDetailModal } from "@/components/CardDetailModal";
import { RarityLegend } from "@/components/RarityLegend";
import { CollectionSearchInput } from "@/components/CollectionSearchInput";
import { FilterSelect, ProfessionFilter } from "@/components/CollectionFilters";
import { RARITY_STYLES, rarityLabelKey, familyLabelKey, type RarityKey } from "@/lib/game/rarityStyles";
import { useLocale } from "@/lib/i18n/LocaleContext";
import type { TranslationKey } from "@/lib/i18n/translations";

const FAMILY_KEYS = ["SKILL", "BOSS", "HERO_NPC", "LOCATION", "ITEM", "WEAPON", "LORE"];
const RARITY_KEYS = Object.keys(RARITY_STYLES) as RarityKey[];
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
  missing: boolean;
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
    missing: searchParams.get("missing") === "1",
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
    if (next.missing) params.set("missing", "1");
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
    if (filters.missing) params.set("missing", "1");
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
      <main className="flex flex-col gap-4 py-10">
        <p className="text-neutral-400">{t("collection.shared.notFound")}</p>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-6 py-10">
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
        <FilterSelect
          label={t("collection.filter.familyLabel")}
          value={filters.family}
          onChange={(family) =>
            updateFilters({
              ...filters,
              family,
              professions: family === "SKILL" ? filters.professions : [],
              page: 1,
            })
          }
        >
          <option value="">{t("collection.allFamilies")}</option>
          {FAMILY_KEYS.map((key) => (
            <option key={key} value={key}>
              {t(familyLabelKey(key))}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          label={t("collection.filter.rarityLabel")}
          value={filters.rarity}
          onChange={(rarity) => updateFilters({ ...filters, rarity, page: 1 })}
        >
          <option value="">{t("collection.allRarities")}</option>
          {RARITY_KEYS.map((key) => (
            <option key={key} value={key}>
              {t(rarityLabelKey(key))}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          label={t("collection.filter.sortLabel")}
          value={filters.sort}
          onChange={(sort) => updateFilters({ ...filters, sort, page: 1 })}
        >
          {SORT_KEYS.map((key) => (
            <option key={key} value={key}>
              {t(`collection.sort.${key}` as TranslationKey)}
            </option>
          ))}
        </FilterSelect>
        {/* Only meaningful when the API could compare against the viewer's own binder (they have a session). */}
        {(filters.missing || cards?.some((card) => card.viewerCopies !== undefined)) && (
          <label className="flex items-center gap-2 text-sm text-neutral-300">
            <input
              type="checkbox"
              checked={filters.missing}
              onChange={(e) => updateFilters({ ...filters, missing: e.target.checked, page: 1 })}
            />
            {t("collection.shared.onlyMissing")}
          </label>
        )}
      </div>

      {filters.family === "SKILL" && <ProfessionFilter selected={filters.professions} onToggle={toggleProfession} />}

      <RarityLegend />

      <CollectionSearchInput value={filters.q} onChange={(q) => updateFilters({ ...filters, q, page: 1 })} />

      {/* One flex slot for the status region and the grid, so the (usually empty) region adds no gap. */}
      <div>
        <div role="status">
          {!cards ? (
            <p className="text-neutral-400">{t("common.loading")}</p>
          ) : cards.length === 0 ? (
            <p className="text-neutral-400">{t("collection.empty")}</p>
          ) : null}
        </div>
        {cards && cards.length > 0 && (
          // role="list": Tailwind's list-style reset drops the list semantics in Safari/VoiceOver.
          <ul role="list" className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {cards.map((card, i) => (
              <li key={i} className="relative">
                {/* The tile's action is a real button laid over the card, beside (not around) CardTile's own links. */}
                <button
                  type="button"
                  onClick={() => setSelectedCard(card)}
                  aria-label={t("collection.viewIn3d", { title: card.title })}
                  className={CARD_TILE_OVERLAY_CLASS}
                />
                <CardTile card={card} underOverlay />
              </li>
            ))}
          </ul>
        )}
      </div>

      {cards && cards.length > 0 && (
        <div ref={sentinelRef} role="status" className="flex justify-center py-2">
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
