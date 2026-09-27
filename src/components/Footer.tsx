"use client";

import { useLocale } from "@/lib/i18n/LocaleContext";

export function Footer() {
  const { t } = useLocale();
  return (
    <footer className="border-t border-neutral-800 px-4 py-6 text-center text-xs text-neutral-500">
      <p>{t("footer.disclaimer")}</p>
      <p>{t("footer.license")}</p>
    </footer>
  );
}
