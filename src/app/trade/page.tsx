import type { Metadata } from "next";
import { pageTitle } from "@/lib/i18n/serverLocale";
import { TradeListClient } from "@/components/TradeListClient";

export async function generateMetadata(): Promise<Metadata> {
  return { title: await pageTitle("tradeList.title") };
}

export default function TradePage() {
  return <TradeListClient />;
}
