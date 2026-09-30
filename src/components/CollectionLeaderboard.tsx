"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleContext";

interface Entry {
  pseudo: string;
  owned: number;
  total: number;
  percent: number;
}

export function CollectionLeaderboard({ isGuest = false }: { isGuest?: boolean }) {
  const { t } = useLocale();
  const [entries, setEntries] = useState<Entry[] | null>(null);

  useEffect(() => {
    fetch("/api/collection/leaderboard")
      .then((res) => res.json())
      .then(setEntries);
  }, []);

  if (!entries || entries.length === 0) return null;

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
      <div>
        <h2 className="text-xl font-semibold">{t("collectionLeaderboard.title")}</h2>
        <p className="text-sm text-neutral-400">{t("collectionLeaderboard.subtitle")}</p>
        {isGuest && <p className="mt-2 text-sm text-emerald-300">{t("collectionLeaderboard.guestNote")}</p>}
      </div>
      <ol className="flex flex-col gap-1">
        {entries.map((e, i) => (
          <li key={e.pseudo} className="odd:bg-neutral-900/40">
            <Link
              href={`/collection/${encodeURIComponent(e.pseudo)}`}
              className="flex items-center justify-between rounded px-2 py-1 text-sm hover:bg-neutral-800/60"
            >
              <span className="text-neutral-300">
                <span className="mr-2 text-neutral-500">#{i + 1}</span>
                {e.pseudo}
              </span>
              <span className="font-semibold text-emerald-300">
                {t("collectionLeaderboard.progress", { owned: e.owned, total: e.total, percent: e.percent })}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
