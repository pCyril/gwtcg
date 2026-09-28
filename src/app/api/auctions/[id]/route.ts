import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/session";
import { getAuctionDetail, getSellerReputations } from "@/lib/game/auction";
import { getImageCreditsByWikiPage } from "@/lib/game/artSubmission";
import { isMarketEnabled } from "@/lib/config";

export async function GET(_request: Request, ctx: RouteContext<"/api/auctions/[id]">) {
  if (!isMarketEnabled()) return NextResponse.json({ error: "MARKET_DISABLED" }, { status: 503 });

  const me = await getOrCreateUser();
  const { id } = await ctx.params;

  try {
    const auction = await getAuctionDetail(id);
    const topBid = auction.bids[0] ?? null;
    const isSeller = auction.sellerId === me.id;
    const isWinningBidder = topBid?.bidderId === me.id;
    // Real GW1 character names are only relevant - and only shown - to the two
    // parties once there's an actual in-game handoff to arrange.
    const showCharacterNames =
      (auction.status === "AWAITING_HANDOFF" || auction.status === "COMPLETED") && (isSeller || isWinningBidder);
    const [credits, reputations] = await Promise.all([
      getImageCreditsByWikiPage([auction.cardInstance.card.wikiPageId]),
      getSellerReputations([auction.sellerId]),
    ]);
    const sellerReputation = reputations.get(auction.sellerId);

    return NextResponse.json({
      id: auction.id,
      status: auction.status,
      isSeller,
      isWinningBidder,
      sellerPseudo: auction.seller.pseudo,
      sellerCompletedSales: sellerReputation?.completedSales ?? 0,
      sellerFallenThroughHandoffs: sellerReputation?.fallenThroughHandoffs ?? 0,
      sellerGameCharacterName: showCharacterNames ? auction.seller.gameCharacterName : null,
      winnerGameCharacterName: showCharacterNames ? (topBid?.bidder.gameCharacterName ?? null) : null,
      startingPrice: auction.startingPrice,
      buyoutPrice: auction.buyoutPrice,
      endsAt: auction.endsAt,
      card: {
        instanceId: auction.cardInstance.id,
        wikiPageId: auction.cardInstance.card.wikiPageId,
        rarity: auction.cardInstance.card.rarity,
        family: auction.cardInstance.card.family,
        campaign: auction.cardInstance.card.campaign,
        profession: auction.cardInstance.card.profession,
        title: auction.cardInstance.card.wikiPage.title,
        extract: auction.cardInstance.card.wikiPage.extract,
        url: auction.cardInstance.card.wikiPage.url,
        imageUrls: auction.cardInstance.card.wikiPage.imageUrls,
        imageCredits: credits.get(auction.cardInstance.card.wikiPageId) ?? {},
      },
      bids: auction.bids.map((b) => ({ pseudo: b.bidder.pseudo, amount: b.amount, createdAt: b.createdAt })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    return NextResponse.json({ error: message }, { status: message === "AUCTION_NOT_FOUND" ? 404 : 500 });
  }
}
