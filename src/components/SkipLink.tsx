"use client";

import { useLocale } from "@/lib/i18n/LocaleContext";
import { CONTENT_ID } from "@/lib/contentId";

/**
 * First focusable element of every page: jumps over the site navigation to the page content.
 * A plain <a href="#…"> (not next/link) so the browser moves focus to the target.
 */
export function SkipLink() {
  const { t } = useLocale();
  return (
    <a
      href={`#${CONTENT_ID}`}
      className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[100] focus:rounded focus:bg-neutral-100 focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-neutral-950 focus:underline"
    >
      {t("a11y.skipToContent")}
    </a>
  );
}
