import { NextResponse } from "next/server";
import { isMarketEnabled } from "@/lib/config";

export async function GET() {
  return NextResponse.json({ marketEnabled: isMarketEnabled() });
}
