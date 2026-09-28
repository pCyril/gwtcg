"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleContext";

interface Stats {
  illustratedCards: number;
  totalCards: number;
  percent: number;
}

export function ArtCompletionGauge() {
  const { t } = useLocale();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/art-submissions/completion")
      .then((res) => res.json())
      .then(setStats);
  }, []);

  if (!stats) return null;

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
      <div>
        <h2 className="text-xl font-semibold">{t("completion.title")}</h2>
        <p className="text-sm text-neutral-400">{t("completion.subtitle")}</p>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-neutral-800">
        <div
          className="h-full rounded-full bg-emerald-500 transition-[width]"
          style={{ width: `${Math.min(100, stats.percent)}%` }}
        />
      </div>
      <p className="text-sm text-neutral-400">
        {t("completion.progress", {
          illustrated: stats.illustratedCards,
          total: stats.totalCards,
          percent: stats.percent,
        })}
      </p>
    </section>
  );
}
