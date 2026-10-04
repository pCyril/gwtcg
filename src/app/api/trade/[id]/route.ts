import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/session";
import { getTradeDetail } from "@/lib/game/trade";
import { getImageCreditsByWikiPage } from "@/lib/game/artSubmission";

function serializeTrade(
  trade: Awaited<ReturnType<typeof getTradeDetail>>,
  meId: string,
  credits: Map<string, Record<string, string>>,
) {
  const cardOf = (item: (typeof trade.items)[number]) => ({
    instanceId: item.cardInstance.id,
    cardId: item.cardInstance.cardId,
    wikiPageId: item.cardInstance.card.wikiPageId,
    rarity: item.cardInstance.card.rarity,
    family: item.cardInstance.card.family,
    campaign: item.cardInstance.card.campaign,
    profession: item.cardInstance.card.profession,
    title: item.cardInstance.card.wikiPage.title,
    extract: item.cardInstance.card.wikiPage.extract,
    url: item.cardInstance.card.wikiPage.url,
    imageUrls: item.cardInstance.card.wikiPage.imageUrls,
    imageCredits: credits.get(item.cardInstance.card.wikiPageId) ?? {},
  });

  return {
    id: trade.id,
    status: trade.status,
    isInitiator: trade.initiatorId === meId,
    initiator: {
      pseudo: trade.initiator.pseudo,
      confirmed: trade.initiatorConfirmed,
      cards: trade.items.filter((i) => i.side === "INITIATOR").map(cardOf),
    },
    recipient: {
      pseudo: trade.recipient.pseudo,
      confirmed: trade.recipientConfirmed,
      cards: trade.items.filter((i) => i.side === "RECIPIENT").map(cardOf),
    },
  };
}

export async function GET(_request: Request, ctx: RouteContext<"/api/trade/[id]">) {
  const me = await getOrCreateUser();
  const { id } = await ctx.params;

  try {
    const trade = await getTradeDetail(id, me.id);
    const credits = await getImageCreditsByWikiPage(trade.items.map((i) => i.cardInstance.card.wikiPageId));
    return NextResponse.json(serializeTrade(trade, me.id, credits));
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    const status = message === "TRADE_NOT_FOUND" ? 404 : message === "NOT_A_PARTICIPANT" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
