"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { useMarketEnabled } from "@/lib/useMarketEnabled";
import type { TranslationKey } from "@/lib/i18n/translations";

interface SitemapEntry {
  href: string;
  label: TranslationKey;
  children?: SitemapEntry[];
}

/**
 * Public pages of the site (RGAA 12.1: second navigation system besides the main menu).
 * Pages reached from content (a card, an auction, a trade, someone's collection) are reachable from these.
 * Keep in sync with src/app/**\/page.tsx; admin pages are left out on purpose.
 */
function entries(marketEnabled: boolean): SitemapEntry[] {
  return [
    { href: "/", label: "sitemap.home" },
    { href: "/collection", label: "nav.collection" },
    { href: "/trade", label: "nav.trade" },
    ...(marketEnabled
      ? [{ href: "/market", label: "nav.market", children: [{ href: "/market/mine", label: "myAuctions.title" }] } as SitemapEntry]
      : []),
    { href: "/drops", label: "nav.drops" },
    { href: "/changelog", label: "nav.changelog" },
  ];
}

export function SitemapClient() {
  const { t } = useLocale();
  // Like the nav: the Kamadan is only listed once the config confirms it is enabled.
  const marketEnabled = useMarketEnabled() === true;

  const renderList = (items: SitemapEntry[], nested = false) => (
    <ul className={nested ? "ml-5 mt-1 flex list-disc flex-col gap-1" : "ml-5 flex list-disc flex-col gap-2"}>
      {items.map((item) => (
        <li key={item.href}>
          <Link href={item.href} className="underline hover:text-neutral-100">
            {t(item.label)}
          </Link>
          {item.children ? renderList(item.children, true) : null}
        </li>
      ))}
    </ul>
  );

  return (
    <main className="flex flex-col gap-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">{t("sitemap.title")}</h1>
      {renderList(entries(marketEnabled))}
    </main>
  );
}
