import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/session";
import { openBooster, getBoosterAvailability, DAILY_BOOSTER_LIMIT } from "@/lib/game/booster";
import { getImageCreditsByWikiPage } from "@/lib/game/artSubmission";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const type = body?.type === "PROFESSION" ? "PROFESSION" : "STANDARD";

  const user = await getOrCreateUser();

  try {
    const { instances } = await openBooster(user.id, type);
    const credits = await getImageCreditsByWikiPage(instances.map((i) => i.card.wikiPageId));
    const { available, nextAvailableAt } = await getBoosterAvailability(user.id);

    return NextResponse.json({
      cards: instances.map((instance) => ({
        instanceId: instance.id,
        wikiPageId: instance.card.wikiPageId,
        rarity: instance.card.rarity,
        family: instance.card.family,
        campaign: instance.card.campaign,
        profession: instance.card.profession,
        title: instance.card.wikiPage.title,
        extract: instance.card.wikiPage.extract,
        url: instance.card.wikiPage.url,
        imageUrls: instance.card.wikiPage.imageUrls,
        imageCredits: credits.get(instance.card.wikiPageId) ?? {},
      })),
      boostersAvailable: available,
      dailyBoosterLimit: DAILY_BOOSTER_LIMIT,
      nextBoosterInMs: nextAvailableAt ? nextAvailableAt.getTime() - Date.now() : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    const status =
      message === "NO_BOOSTER_AVAILABLE" || message === "NO_STARTING_PROFESSION" ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
