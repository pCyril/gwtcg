import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/session";
import { createAuction, getSellerReputations, listActiveAuctions, type SellerReputation } from "@/lib/game/auction";
import { getImageCreditsByWikiPage } from "@/lib/game/artSubmission";
import { isMarketEnabled } from "@/lib/config";

const STATUS_BY_ERROR: Record<string, number> = {
  INVALID_STARTING_PRICE: 400,
  INVALID_BUYOUT_PRICE: 400,
  INVALID_DURATION: 400,
  INVALID_CARD_SELECTION: 400,
  CARD_IN_AUCTION: 400,
  CARD_IN_TRADE: 400,
};

function serializeAuction(
  a: Awaited<ReturnType<typeof listActiveAuctions>>[number],
  credits: Map<string, Record<string, string>>,
  reputations: Map<string, SellerReputation>,
) {
  const reputation = reputations.get(a.sellerId);
  return {
    id: a.id,
    sellerPseudo: a.seller.pseudo,
    sellerCompletedSales: reputation?.completedSales ?? 0,
    sellerFallenThroughHandoffs: reputation?.fallenThroughHandoffs ?? 0,
    startingPrice: a.startingPrice,
    buyoutPrice: a.buyoutPrice,
    topBid: a.bids[0]?.amount ?? null,
    endsAt: a.endsAt,
    card: {
      instanceId: a.cardInstance.id,
      wikiPageId: a.cardInstance.card.wikiPageId,
      rarity: a.cardInstance.card.rarity,
      family: a.cardInstance.card.family,
      campaign: a.cardInstance.card.campaign,
      profession: a.cardInstance.card.profession,
      title: a.cardInstance.card.wikiPage.title,
      extract: a.cardInstance.card.wikiPage.extract,
      url: a.cardInstance.card.wikiPage.url,
      imageUrls: a.cardInstance.card.wikiPage.imageUrls,
      imageCredits: credits.get(a.cardInstance.card.wikiPageId) ?? {},
    },
  };
}

export async function GET() {
  if (!isMarketEnabled()) return NextResponse.json({ error: "MARKET_DISABLED" }, { status: 503 });

  const auctions = await listActiveAuctions();
  const [credits, reputations] = await Promise.all([
    getImageCreditsByWikiPage(auctions.map((a) => a.cardInstance.card.wikiPageId)),
    getSellerReputations(auctions.map((a) => a.sellerId)),
  ]);
  return NextResponse.json({ auctions: auctions.map((a) => serializeAuction(a, credits, reputations)) });
}

export async function POST(request: Request) {
  if (!isMarketEnabled()) return NextResponse.json({ error: "MARKET_DISABLED" }, { status: 503 });

  const me = await getOrCreateUser();
  const body = await request.json().catch(() => ({}));

  const cardInstanceId = typeof body?.cardInstanceId === "string" ? body.cardInstanceId : "";
  const startingPrice = Number.isFinite(body?.startingPrice) ? Math.trunc(body.startingPrice) : NaN;
  const buyoutPrice = Number.isFinite(body?.buyoutPrice) ? Math.trunc(body.buyoutPrice) : null;
  const durationHours = Number.isFinite(body?.durationHours) ? Math.trunc(body.durationHours) : NaN;

  if (!cardInstanceId) {
    return NextResponse.json({ error: "INVALID_CARD_SELECTION" }, { status: 400 });
  }

  try {
    const auction = await createAuction(me.id, cardInstanceId, startingPrice, buyoutPrice, durationHours);
    return NextResponse.json({ id: auction.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    return NextResponse.json({ error: message }, { status: STATUS_BY_ERROR[message] ?? 500 });
  }
}
