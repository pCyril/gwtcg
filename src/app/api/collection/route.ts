import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/session";
import { parseCollectionQuery, queryCollection } from "@/lib/game/collectionQuery";

export async function GET(request: Request) {
  const user = await getOrCreateUser();
  const { searchParams } = new URL(request.url);

  const result = await queryCollection(user.id, parseCollectionQuery(searchParams));

  return NextResponse.json({ pseudo: user.pseudo, ...result });
}
