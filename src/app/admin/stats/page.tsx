import type { Metadata } from "next";
import { pageTitle } from "@/lib/i18n/serverLocale";
import { AdminStatsClient } from "@/components/AdminStatsClient";

export async function generateMetadata(): Promise<Metadata> {
  return { title: await pageTitle("admin.statsTitle") };
}

export default function AdminStatsPage() {
  return <AdminStatsClient />;
}
