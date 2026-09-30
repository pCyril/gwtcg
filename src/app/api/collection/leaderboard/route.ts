import { NextResponse } from "next/server";
import { getCollectionLeaderboard } from "@/lib/game/collectionLeaderboard";

export async function GET() {
  return NextResponse.json(await getCollectionLeaderboard());
}
