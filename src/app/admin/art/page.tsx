import type { Metadata } from "next";
import { pageTitle } from "@/lib/i18n/serverLocale";
import { AdminArtReviewClient } from "@/components/AdminArtReviewClient";

export async function generateMetadata(): Promise<Metadata> {
  return { title: await pageTitle("admin.title") };
}

export default function AdminArtPage() {
  return <AdminArtReviewClient />;
}
