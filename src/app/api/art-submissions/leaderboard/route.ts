import { NextResponse } from "next/server";
import { getArtLeaderboard } from "@/lib/game/artSubmission";

export async function GET() {
  const leaderboard = await getArtLeaderboard();
  return NextResponse.json(leaderboard);
}
