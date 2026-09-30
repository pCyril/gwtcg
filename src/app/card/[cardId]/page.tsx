import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getSharedCard } from "@/lib/game/cardShare";
import { SharedCardClient } from "@/components/SharedCardClient";

// Reads the database per request - never prerender this at build time.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/card/[cardId]">): Promise<Metadata> {
  const { cardId } = await params;
  const card = await getSharedCard(cardId);
  if (!card) return { title: "GWTCG" };

  // Uploaded illustrations are stored as site-relative paths; link previews need absolute URLs.
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const image = card.imageUrls?.[0];
  const imageUrl = image && host ? new URL(image, `${proto}://${host}`).toString() : undefined;

  const description = card.extract.slice(0, 200);
  return {
    title: `${card.title} - GWTCG`,
    description,
    openGraph: { title: card.title, description, type: "website", ...(imageUrl ? { images: [imageUrl] } : {}) },
    twitter: { card: imageUrl ? "summary_large_image" : "summary", title: card.title, description },
  };
}

export default async function SharedCardPage({ params }: PageProps<"/card/[cardId]">) {
  const { cardId } = await params;
  const card = await getSharedCard(cardId);
  if (!card) notFound();
  return <SharedCardClient card={card} />;
}
