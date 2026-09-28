"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleContext";

export function Footer() {
  const { t } = useLocale();
  return (
    <footer className="border-t border-neutral-800 px-4 py-6 text-center text-xs text-neutral-500">
      <p>{t("footer.disclaimer")}</p>
      <p>{t("footer.license")}</p>
      <p className="mt-2">
        <Link href="/changelog" className="underline hover:text-neutral-300">
          {t("footer.changelog")}
        </Link>
      </p>
    </footer>
  );
}
