"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleContext";

interface Entry {
  pseudo: string;
  count: number;
}

function Board({
  entries,
  emptyKey,
}: {
  entries: Entry[];
  emptyKey: "boosterLeaderboard.emptyAllTime" | "boosterLeaderboard.empty24h";
}) {
  const { t } = useLocale();
  if (entries.length === 0) return <p className="text-sm text-neutral-500">{t(emptyKey)}</p>;
  return (
    <ol className="flex flex-col gap-1">
      {entries.map((e, i) => (
        <li key={e.pseudo} className="flex items-center justify-between rounded px-2 py-1 text-sm odd:bg-neutral-900/40">
          <span className="text-neutral-300">
            <span className="mr-2 text-neutral-500">#{i + 1}</span>
            {e.pseudo}
          </span>
          <span className="font-semibold text-emerald-300">
            {t("boosterLeaderboard.count", { count: e.count, plural: e.count > 1 ? "s" : "" })}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function BoosterLeaderboard() {
  const { t } = useLocale();
  const [data, setData] = useState<{ allTime: Entry[]; last24h: Entry[] } | null>(null);

  useEffect(() => {
    fetch("/api/booster/leaderboard")
      .then((res) => res.json())
      .then(setData);
  }, []);

  if (!data || (data.allTime.length === 0 && data.last24h.length === 0)) return null;

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
      <div>
        <h2 className="text-xl font-semibold">{t("boosterLeaderboard.title")}</h2>
        <p className="text-sm text-neutral-400">{t("boosterLeaderboard.subtitle")}</p>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{t("leaderboard.allTime")}</h3>
          <Board entries={data.allTime} emptyKey="boosterLeaderboard.emptyAllTime" />
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{t("leaderboard.last24h")}</h3>
          <Board entries={data.last24h} emptyKey="boosterLeaderboard.empty24h" />
        </div>
      </div>
    </section>
  );
}
