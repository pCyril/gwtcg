import { randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { RARITY_TARGET_SHARES } from "@/lib/game/rarity";
import type { BoosterType, CardFamily, Rarity } from "@prisma/client";

export const DAILY_BOOSTER_LIMIT = 5;
export const BOOSTER_WINDOW_MS = 60 * 60 * 1000;
const STANDARD_BOOSTER_SIZE = 5;
const NON_COMMON_RARITIES: Rarity[] = ["UNCOMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"];

export interface BoosterAvailability {
  available: number;
  /** When all 5 boosters refill at once - null if at least one is available right now. */
  nextAvailableAt: Date | null;
}

/**
 * Batch refill anchored to the *last* opening: every new opening resets the
 * BOOSTER_WINDOW_MS countdown, and once that time passes without a new one,
 * all 5 come back at once (never one at a time). So "used in the current
 * batch" is however many openings chain back-to-back from the most recent
 * one with no gap between consecutive opens reaching the window - that
 * streak can never exceed 5 since openBooster blocks once available hits 0.
 */
function computeBoosterAvailability(recentOpeningsDesc: { openedAt: Date }[]): BoosterAvailability {
  if (recentOpeningsDesc.length === 0) {
    return { available: DAILY_BOOSTER_LIMIT, nextAvailableAt: null };
  }

  const lastOpenedAt = recentOpeningsDesc[0].openedAt;
  if (Date.now() - lastOpenedAt.getTime() >= BOOSTER_WINDOW_MS) {
    return { available: DAILY_BOOSTER_LIMIT, nextAvailableAt: null };
  }

  let used = 1;
  for (let i = 1; i < recentOpeningsDesc.length; i++) {
    const gap = recentOpeningsDesc[i - 1].openedAt.getTime() - recentOpeningsDesc[i].openedAt.getTime();
    if (gap >= BOOSTER_WINDOW_MS) break;
    used++;
  }

  return {
    available: Math.max(0, DAILY_BOOSTER_LIMIT - used),
    nextAvailableAt: new Date(lastOpenedAt.getTime() + BOOSTER_WINDOW_MS),
  };
}

export async function getBoosterAvailability(userId: string): Promise<BoosterAvailability> {
  const recentOpenings = await prisma.boosterOpening.findMany({
    where: { userId, type: "STANDARD" },
    orderBy: { openedAt: "desc" },
    take: DAILY_BOOSTER_LIMIT,
    select: { openedAt: true },
  });

  return computeBoosterAvailability(recentOpenings);
}

/** Pick one random row matching `where` using a crypto RNG offset (server-side only). */
async function pickRandomCard(where: Record<string, unknown>, excludeIds: string[] = []) {
  const fullWhere = excludeIds.length ? { ...where, id: { notIn: excludeIds } } : where;
  const count = await prisma.card.count({ where: fullWhere });
  if (count === 0) return null;
  const offset = randomInt(0, count);
  const [card] = await prisma.card.findMany({
    where: fullWhere,
    orderBy: { id: "asc" },
    skip: offset,
    take: 1,
  });
  return card ?? null;
}

export interface DrawnCard {
  cardId: string;
  rarity: Rarity;
}

/** Weighted pick of a rarity tier per RARITY_TARGET_SHARES (e.g. ~45% chance of COMMON). */
function pickWeightedRarity(): Rarity {
  const roll = randomInt(0, 10_000) / 10_000;
  let cumulative = 0;
  for (const { rarity, share } of RARITY_TARGET_SHARES) {
    cumulative += share;
    if (roll < cumulative) return rarity;
  }
  return "COMMON";
}

async function drawStandardPool(size: number, families?: CardFamily[], profession?: string) {
  const where: Record<string, unknown> = {};
  if (families?.length) where.family = { in: families };
  if (profession) where.profession = profession;

  const drawn: DrawnCard[] = [];
  const excludeIds: string[] = [];
  for (let i = 0; i < size; i++) {
    // Draw by target rarity share first (so commons actually drop most often,
    // regardless of how many distinct cards happen to exist at each tier),
    // falling back to any rarity if that specific tier has nothing left to give.
    const targetRarity = pickWeightedRarity();
    const card =
      (await pickRandomCard({ ...where, rarity: targetRarity }, excludeIds)) ??
      (await pickRandomCard(where, excludeIds));
    if (!card) break;
    drawn.push({ cardId: card.id, rarity: card.rarity });
    excludeIds.push(card.id);
  }

  // Guarantee at least one uncommon-or-better in a standard booster.
  if (drawn.length > 0 && drawn.every((c) => c.rarity === "COMMON")) {
    const upgrade = await pickRandomCard({ ...where, rarity: { in: NON_COMMON_RARITIES } });
    if (upgrade) {
      drawn[0] = { cardId: upgrade.id, rarity: upgrade.rarity };
    }
  }

  return drawn;
}

/**
 * Open a booster for a user: validates the daily limit, draws cards with a
 * crypto RNG, and persists everything atomically so a crash can never
 * duplicate or lose cards.
 */
export async function openBooster(
  userId: string,
  type: Extract<BoosterType, "STANDARD" | "PROFESSION">,
) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });

    if (type === "STANDARD") {
      const recentOpenings = await tx.boosterOpening.findMany({
        where: { userId, type: "STANDARD" },
        orderBy: { openedAt: "desc" },
        take: DAILY_BOOSTER_LIMIT,
        select: { openedAt: true },
      });
      if (computeBoosterAvailability(recentOpenings).available <= 0) {
        throw new Error("NO_BOOSTER_AVAILABLE");
      }
    } else if (type === "PROFESSION") {
      if (!user.startingProfession) {
        throw new Error("NO_STARTING_PROFESSION");
      }
    }

    const drawn =
      type === "STANDARD"
        ? await drawStandardPool(STANDARD_BOOSTER_SIZE, ["SKILL", "BOSS", "WEAPON"])
        : await drawStandardPool(STANDARD_BOOSTER_SIZE, ["SKILL"], user.startingProfession!);

    if (drawn.length === 0) {
      throw new Error("EMPTY_CARD_POOL");
    }

    const opening = await tx.boosterOpening.create({
      data: { userId, type },
    });

    const instances = await Promise.all(
      drawn.map((d) =>
        tx.cardInstance.create({
          data: {
            cardId: d.cardId,
            ownerId: userId,
            source: "BOOSTER",
            boosterOpeningId: opening.id,
          },
          include: { card: { include: { wikiPage: true } } },
        }),
      ),
    );

    return { opening, instances };
  });
}
