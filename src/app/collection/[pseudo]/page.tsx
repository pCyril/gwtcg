import type { Metadata } from "next";
import { pageTitle } from "@/lib/i18n/serverLocale";
import { SharedCollectionClient } from "@/components/SharedCollectionClient";

export async function generateMetadata({ params }: PageProps<"/collection/[pseudo]">): Promise<Metadata> {
  const { pseudo } = await params;
  return { title: await pageTitle("collection.shared.title", { pseudo }) };
}

export default async function SharedCollectionPage({ params }: PageProps<"/collection/[pseudo]">) {
  const { pseudo } = await params;
  return <SharedCollectionClient pseudo={pseudo} />;
}
