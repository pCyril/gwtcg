import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/session";
import { exchangeDuplicates, getExchangeOverview, isRarity } from "@/lib/game/exchange";
import { getImageCreditsByWikiPage } from "@/lib/game/artSubmission";

const STATUS_BY_ERROR: Record<string, number> = {
  INVALID_RARITY: 400,
  INVALID_EXCHANGE_SELECTION: 400,
  NOTHING_TO_DISCOVER: 400,
  DAILY_EXCHANGE_LIMIT: 429,
};

/** What the player can exchange right now: spares and undiscovered cards per rarity, and today's remaining exchanges. */
export async function GET() {
  const me = await getOrCreateUser();
  return NextResponse.json(await getExchangeOverview(me.id));
}

/** Give up 10 spare copies of one rarity for a random card of that rarity the player doesn't own. */
export async function POST(request: Request) {
  const me = await getOrCreateUser();
  const body = await request.json().catch(() => ({}));
  const cardInstanceIds = Array.isArray(body?.cardInstanceIds)
    ? body.cardInstanceIds.filter((x: unknown): x is string => typeof x === "string")
    : [];

  try {
    if (!isRarity(body?.rarity)) throw new Error("INVALID_RARITY");
    const { received, remainingToday } = await exchangeDuplicates(me.id, body.rarity, cardInstanceIds);
    const credits = await getImageCreditsByWikiPage([received.card.wikiPageId]);
    return NextResponse.json({
      card: {
        instanceId: received.id,
        cardId: received.cardId,
        wikiPageId: received.card.wikiPageId,
        rarity: received.card.rarity,
        family: received.card.family,
        campaign: received.card.campaign,
        profession: received.card.profession,
        title: received.card.wikiPage.title,
        extract: received.card.wikiPage.extract,
        url: received.card.wikiPage.url,
        imageUrls: received.card.wikiPage.imageUrls,
        imageCredits: credits.get(received.card.wikiPageId) ?? {},
        isNew: true,
      },
      remainingToday,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    return NextResponse.json({ error: message }, { status: STATUS_BY_ERROR[message] ?? 500 });
  }
}
