import { SellCardClient } from "@/components/SellCardClient";

export default async function SellPage({ params }: PageProps<"/market/sell/[instanceId]">) {
  const { instanceId } = await params;
  return <SellCardClient instanceId={instanceId} />;
}
