"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { LOCALES } from "@/lib/i18n/translations";

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  const router = useRouter();

  function switchTo(next: typeof locale) {
    setLocale(next);
    // Re-render the server parts (page title, server-rendered text) with the new gm_locale cookie.
    router.refresh();
  }

  return (
    <div className="flex gap-1 rounded-full border border-neutral-800 bg-neutral-900/80 p-1 text-xs">
      {LOCALES.map((l) => (
        <button
          key={l}
          onClick={() => switchTo(l)}
          aria-current={locale === l}
          className={`rounded-full px-2 py-1 uppercase transition-colors ${
            locale === l ? "bg-emerald-700 text-white" : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
