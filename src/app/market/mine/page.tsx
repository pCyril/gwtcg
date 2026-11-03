import type { Metadata } from "next";
import { pageTitle } from "@/lib/i18n/serverLocale";
import { MyAuctionsClient } from "@/components/MyAuctionsClient";

export async function generateMetadata(): Promise<Metadata> {
  return { title: await pageTitle("myAuctions.title") };
}

export default function MyAuctionsPage() {
  return <MyAuctionsClient />;
}
