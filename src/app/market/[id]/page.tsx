import { AuctionDetailClient } from "@/components/AuctionDetailClient";

export default async function AuctionPage({ params }: PageProps<"/market/[id]">) {
  const { id } = await params;
  return <AuctionDetailClient auctionId={id} />;
}
