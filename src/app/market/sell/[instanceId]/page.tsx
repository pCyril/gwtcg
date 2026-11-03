import type { Metadata } from "next";
import { pageTitle } from "@/lib/i18n/serverLocale";
import { SellCardClient } from "@/components/SellCardClient";

export async function generateMetadata(): Promise<Metadata> {
  return { title: await pageTitle("sell.title") };
}

export default async function SellPage({ params }: PageProps<"/market/sell/[instanceId]">) {
  const { instanceId } = await params;
  return <SellCardClient instanceId={instanceId} />;
}
