import { NextResponse } from "next/server";
import { getArtCompletionStats } from "@/lib/game/artSubmission";

export async function GET() {
  const stats = await getArtCompletionStats();
  return NextResponse.json(stats);
}
