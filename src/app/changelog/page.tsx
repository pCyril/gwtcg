import type { Metadata } from "next";
import { pageTitle } from "@/lib/i18n/serverLocale";
import { ChangelogClient } from "@/components/ChangelogClient";

export async function generateMetadata(): Promise<Metadata> {
  return { title: await pageTitle("changelog.title") };
}

export default function ChangelogPage() {
  return <ChangelogClient />;
}
