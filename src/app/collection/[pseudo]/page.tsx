import { SharedCollectionClient } from "@/components/SharedCollectionClient";

export default async function SharedCollectionPage({ params }: PageProps<"/collection/[pseudo]">) {
  const { pseudo } = await params;
  return <SharedCollectionClient pseudo={pseudo} />;
}
