"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { CHANGELOG } from "@/lib/changelog";

export function ChangelogClient() {
  const { t, locale } = useLocale();
  const dateFormatter = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("changelog.title")}</h1>
          <p className="text-sm text-neutral-400">{t("changelog.subtitle")}</p>
        </div>
        <Link href="/" className="text-sm text-neutral-400 underline hover:text-neutral-200">
          {t("common.back")}
        </Link>
      </div>

      <div className="flex flex-col gap-8">
        {CHANGELOG.map((entry) => (
          <section key={entry.date} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-300">
              {dateFormatter.format(new Date(`${entry.date}T00:00:00`))}
            </h2>
            <ul className="flex flex-col gap-1.5 border-l border-neutral-800 pl-4">
              {(locale === "fr" ? entry.fr : entry.en).map((line, i) => (
                <li key={i} className="text-sm text-neutral-300">
                  {line}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
