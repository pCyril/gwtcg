import type { Metadata } from "next";
import { pageTitle } from "@/lib/i18n/serverLocale";
import { MarketClient } from "@/components/MarketClient";

export async function generateMetadata(): Promise<Metadata> {
  return { title: await pageTitle("market.title") };
}

export default function MarketPage() {
  return <MarketClient />;
}
