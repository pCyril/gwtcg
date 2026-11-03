import type { Metadata } from "next";
import { pageTitle } from "@/lib/i18n/serverLocale";
import { getDropRates } from "@/lib/game/dropRates";
import { DropsClient } from "@/components/DropsClient";

// Reads the live card corpus - never prerender this at build time.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: await pageTitle("drops.title") };
}

export default async function DropsPage() {
  const rates = await getDropRates();
  return <DropsClient rates={rates} />;
}
