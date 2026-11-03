import type { Metadata } from "next";
import { pageTitle } from "@/lib/i18n/serverLocale";
import { AuctionDetailClient } from "@/components/AuctionDetailClient";

export async function generateMetadata(): Promise<Metadata> {
  return { title: await pageTitle("auction.title") };
}

export default async function AuctionPage({ params }: PageProps<"/market/[id]">) {
  const { id } = await params;
  return <AuctionDetailClient auctionId={id} />;
}
