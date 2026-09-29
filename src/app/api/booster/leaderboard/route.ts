import { NextResponse } from "next/server";
import { getBoosterLeaderboard } from "@/lib/game/booster";

export async function GET() {
  const leaderboard = await getBoosterLeaderboard();
  return NextResponse.json(leaderboard);
}
