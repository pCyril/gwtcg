import { NextResponse } from "next/server";
import { isMarketEnabled, isWikiArchiveEnabled } from "@/lib/config";

export async function GET() {
  return NextResponse.json({ marketEnabled: isMarketEnabled(), wikiArchive: await isWikiArchiveEnabled() });
}
