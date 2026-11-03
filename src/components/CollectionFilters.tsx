"use client";

import { useId, type ReactNode } from "react";
import { useLocale } from "@/lib/i18n/LocaleContext";

export const PROFESSIONS = [
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

/** A filter <select> with its visible, programmatically associated label (shared by both collection views). */
export function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex min-w-0 max-w-full items-center gap-2">
      <label htmlFor={id} className="text-sm text-neutral-400">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 max-w-full rounded border border-neutral-500 bg-neutral-900 px-3 py-1.5 text-sm"
      >
        {children}
      </select>
    </div>
  );
}

/**
 * Profession toggles shown with the "Skill" family. Each one is a toggle button
 * exposing its state through aria-pressed, with a check mark so the active state
 * isn't conveyed by color alone.
 */
export function ProfessionFilter({ selected, onToggle }: { selected: string[]; onToggle: (profession: string) => void }) {
  const { t } = useLocale();
  const labelId = useId();
  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-wrap items-center gap-2">
      <span id={labelId} className="text-xs uppercase tracking-wide text-neutral-400">
        {t("collection.filterByProfession")}
      </span>
      {PROFESSIONS.map((profession) => {
        const active = selected.includes(profession);
        return (
          <button
            key={profession}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(profession)}
            className={`rounded-full border px-3 py-1 text-sm ${
              active
                ? "border-emerald-400 bg-emerald-950/40 text-emerald-300"
                : "border-neutral-700 text-neutral-300 hover:border-neutral-500"
            }`}
          >
            {active && (
              <span aria-hidden="true" className="mr-1">
                ✓
              </span>
            )}
            {profession}
          </button>
        );
      })}
    </div>
  );
}
