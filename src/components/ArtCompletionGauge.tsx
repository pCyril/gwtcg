"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { familyLabelKey } from "@/lib/game/rarityStyles";

interface FamilyStats {
  family: string;
  illustratedCards: number;
  totalCards: number;
  percent: number;
}

interface Stats {
  illustratedCards: number;
  totalCards: number;
  percent: number;
  byFamily: FamilyStats[];
}

export function ArtCompletionGauge() {
  const { t } = useLocale();
  const [stats, setStats] = useState<Stats | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch("/api/art-submissions/completion")
      .then((res) => res.json())
      .then(setStats);
  }, []);

  if (!stats) return null;

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
        aria-expanded={expanded}
      >
        <div>
          <h2 className="text-xl font-semibold">{t("completion.title")}</h2>
          <p className="text-sm text-neutral-400">{t("completion.subtitle")}</p>
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-neutral-500 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>
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

      {expanded && (
        <div className="flex flex-col gap-2 border-t border-neutral-800 pt-3">
          {stats.byFamily.map((f) => (
            <div key={f.family} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>{t(familyLabelKey(f.family))}</span>
                <span>
                  {t("completion.progress", {
                    illustrated: f.illustratedCards,
                    total: f.totalCards,
                    percent: f.percent,
                  })}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
                <div
                  className="h-full rounded-full bg-emerald-500/70"
                  style={{ width: `${Math.min(100, f.percent)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
