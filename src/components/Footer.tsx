"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleContext";

export function Footer() {
  const { t } = useLocale();
  return (
    <footer className="border-t border-neutral-800 px-4 py-6 text-center text-xs text-neutral-500">
      <p>{t("footer.disclaimer")}</p>
      <p>{t("footer.license")}</p>
      <p className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1">
        <Link href="/changelog" className="underline hover:text-neutral-300">
          {t("footer.changelog")}
        </Link>
        <Link href="/drops" className="underline hover:text-neutral-300">
          {t("footer.drops")}
        </Link>
        <Link href="/plan-du-site" className="underline hover:text-neutral-300">
          {t("footer.sitemap")}
        </Link>
        <a
          href="https://github.com/pCyril/gwtcg"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-neutral-300"
        >
          {t("footer.source")}
        </a>
      </p>
    </footer>
  );
}
