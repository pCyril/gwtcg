import type { Metadata } from "next";
import { pageTitle } from "@/lib/i18n/serverLocale";
import { TradeDetailClient } from "@/components/TradeDetailClient";

export async function generateMetadata(): Promise<Metadata> {
  return { title: await pageTitle("a11y.title.tradeDetail") };
}

export default async function TradeDetailPage({ params }: PageProps<"/trade/[id]">) {
  const { id } = await params;
  return <TradeDetailClient tradeId={id} />;
}
