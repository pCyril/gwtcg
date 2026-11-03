import type { Metadata } from "next";
import { pageTitle } from "@/lib/i18n/serverLocale";
import { CollectionClient } from "@/components/CollectionClient";

export async function generateMetadata(): Promise<Metadata> {
  return { title: await pageTitle("collection.title") };
}

export default function CollectionPage() {
  return <CollectionClient />;
}
