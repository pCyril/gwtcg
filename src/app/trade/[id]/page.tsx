import { TradeDetailClient } from "@/components/TradeDetailClient";

export default async function TradeDetailPage({ params }: PageProps<"/trade/[id]">) {
  const { id } = await params;
  return <TradeDetailClient tradeId={id} />;
}
