import type { Metadata } from "next";
import { pageTitle } from "@/lib/i18n/serverLocale";
import { SitemapClient } from "./SitemapClient";

export async function generateMetadata(): Promise<Metadata> {
  return { title: await pageTitle("sitemap.title") };
}

export default function SitemapPage() {
  return <SitemapClient />;
}
