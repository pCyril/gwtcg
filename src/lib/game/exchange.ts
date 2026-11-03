import { randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { Prisma, Rarity } from "@prisma/client";

/** Duplicates given up per exchange. */
export const EXCHANGE_COST = 10;
/** Exchanges (= cards received) allowed per calendar day, Paris time. */
export const DAILY_EXCHANGE_LIMIT = 5;
export const EXCHANGE_TIME_ZONE = "Europe/Paris";

const RARITIES: Rarity[] = ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"];

export function isRarity(value: unknown): value is Rarity {
  return typeof value === "string" && (RARITIES as string[]).includes(value);
}

/** Offset of `timeZone` from UTC at `date`, in ms (positive east of Greenwich). */
function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Midnight (Paris time) of the day containing `now`, and the next midnight - the daily limit's window. */
export function exchangeDayWindow(now: Date = new Date()): { start: Date; end: Date } {
  const offset = timeZoneOffsetMs(now, EXCHANGE_TIME_ZONE);
  const local = new Date(now.getTime() + offset);
  const startGuess = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  // Re-read the offset at each midnight: it differs from `now`'s on DST change days.
  const start = startGuess - timeZoneOffsetMs(new Date(startGuess - offset), EXCHANGE_TIME_ZONE);
  const nextGuess = startGuess + 24 * 60 * 60 * 1000;
  const end = nextGuess - timeZoneOffsetMs(new Date(nextGuess - offset), EXCHANGE_TIME_ZONE);
  return { start: new Date(start), end: new Date(end) };
}

export interface OwnedInstance {
  id: string;
  cardId: string;
  title: string;
  rarity: Rarity;
  obtainedAt: Date;
  /** In a pending trade or a live auction: can't be given up, but still counts as a kept copy. */
  locked: boolean;
}

/**
 * The copies a player can give up without losing a card: for each card, every
 * free copy beyond the one they keep (locked copies count as kept). Newest
 * copies go first, so the oldest one stays in the collection.
 */
export function spareInstancesByCard(instances: OwnedInstance[]): Map<string, OwnedInstance[]> {
  const byCard = new Map<string, OwnedInstance[]>();
  for (const instance of instances) {
    const list = byCard.get(instance.cardId) ?? [];
    list.push(instance);
    byCard.set(instance.cardId, list);
  }
  const spares = new Map<string, OwnedInstance[]>();
  for (const [cardId, list] of byCard) {
    const free = list.filter((i) => !i.locked).sort((a, b) => b.obtainedAt.getTime() - a.obtainedAt.getTime());
    const count = Math.min(free.length, list.length - 1);
    if (count > 0) spares.set(cardId, free.slice(0, count));
  }
  return spares;
}

/**
 * The EXCHANGE_COST spares of `rarity` proposed by default: taken from the cards
 * with the most spare copies first (ties by title), so rare doubles are kept for
 * trades as long as possible. Null if there aren't enough.
 */
export function proposeGiven(spares: Map<string, OwnedInstance[]>, rarity: Rarity): OwnedInstance[] | null {
  const groups = [...spares.values()]
    .filter((list) => list[0].rarity === rarity)
    .sort((a, b) => b.length - a.length || a[0].title.localeCompare(b[0].title));
  const given = groups.flat().slice(0, EXCHANGE_COST);
  return given.length === EXCHANGE_COST ? given : null;
}

/** Throws unless `ids` are exactly EXCHANGE_COST distinct spares of `rarity`. */
export function validateGiven(spares: Map<string, OwnedInstance[]>, rarity: Rarity, ids: string[]) {
  const unique = new Set(ids);
  if (unique.size !== EXCHANGE_COST || ids.length !== EXCHANGE_COST) throw new Error("INVALID_EXCHANGE_SELECTION");
  const allowed = new Map<string, OwnedInstance>();
  for (const list of spares.values()) for (const i of list) allowed.set(i.id, i);
  for (const id of unique) {
    const instance = allowed.get(id);
    if (!instance || instance.rarity !== rarity) throw new Error("INVALID_EXCHANGE_SELECTION");
  }
}

type Tx = Prisma.TransactionClient;

async function loadOwned(db: Tx | typeof prisma, userId: string): Promise<OwnedInstance[]> {
  const rows = await db.cardInstance.findMany({
    where: { ownerId: userId, discardedAt: null },
    select: {
      id: true,
      cardId: true,
      obtainedAt: true,
      card: { select: { rarity: true, wikiPage: { select: { title: true } } } },
      tradeItems: { where: { trade: { status: "PENDING" } }, select: { id: true } },
      auctions: { where: { status: { in: ["ACTIVE", "AWAITING_HANDOFF"] } }, select: { id: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    cardId: r.cardId,
    title: r.card.wikiPage.title,
    rarity: r.card.rarity,
    obtainedAt: r.obtainedAt,
    locked: r.tradeItems.length > 0 || r.auctions.length > 0,
  }));
}

function undiscoveredWhere(userId: string, rarity: Rarity): Prisma.CardWhereInput {
  return { rarity, instances: { none: { ownerId: userId, discardedAt: null } } };
}

async function exchangesToday(db: Tx | typeof prisma, userId: string, now: Date) {
  const { start } = exchangeDayWindow(now);
  return db.cardExchange.count({ where: { userId, createdAt: { gte: start } } });
}

export interface ExchangeRarityOption {
  rarity: Rarity;
  spares: number;
  undiscovered: number;
  /** The duplicates that would be given, grouped by card - null when there aren't enough spares. */
  given: { cardId: string; title: string; count: number; instanceIds: string[] }[] | null;
}

export async function getExchangeOverview(userId: string, now: Date = new Date()) {
  const [owned, used, undiscovered] = await Promise.all([
    loadOwned(prisma, userId),
    exchangesToday(prisma, userId, now),
    Promise.all(RARITIES.map((rarity) => prisma.card.count({ where: undiscoveredWhere(userId, rarity) }))),
  ]);
  const spares = spareInstancesByCard(owned);
  const rarities: ExchangeRarityOption[] = RARITIES.map((rarity, i) => {
    const proposed = proposeGiven(spares, rarity);
    let given: ExchangeRarityOption["given"] = null;
    if (proposed) {
      const groups = new Map<string, { cardId: string; title: string; count: number; instanceIds: string[] }>();
      for (const instance of proposed) {
        const group = groups.get(instance.cardId) ?? { cardId: instance.cardId, title: instance.title, count: 0, instanceIds: [] };
        group.count++;
        group.instanceIds.push(instance.id);
        groups.set(instance.cardId, group);
      }
      given = [...groups.values()];
    }
    return {
      rarity,
      spares: [...spares.values()].filter((l) => l[0].rarity === rarity).reduce((n, l) => n + l.length, 0),
      undiscovered: undiscovered[i],
      given,
    };
  });
  return {
    cost: EXCHANGE_COST,
    dailyLimit: DAILY_EXCHANGE_LIMIT,
    remainingToday: Math.max(0, DAILY_EXCHANGE_LIMIT - used),
    resetsAt: exchangeDayWindow(now).end,
    rarities,
  };
}

/**
 * Gives up `givenIds` (EXCHANGE_COST spares of `rarity`) for one random card of
 * that rarity the player doesn't own. All checks run again inside the
 * transaction, with the player's row locked so two requests can't both pass
 * the daily limit.
 */
export async function exchangeDuplicates(userId: string, rarity: Rarity, givenIds: string[], now: Date = new Date()) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;

    if ((await exchangesToday(tx, userId, now)) >= DAILY_EXCHANGE_LIMIT) throw new Error("DAILY_EXCHANGE_LIMIT");

    validateGiven(spareInstancesByCard(await loadOwned(tx, userId)), rarity, givenIds);

    const where = undiscoveredWhere(userId, rarity);
    const count = await tx.card.count({ where });
    if (count === 0) throw new Error("NOTHING_TO_DISCOVER");
    const [card] = await tx.card.findMany({ where, orderBy: { id: "asc" }, skip: randomInt(0, count), take: 1 });
    if (!card) throw new Error("NOTHING_TO_DISCOVER");

    const received = await tx.cardInstance.create({
      data: { cardId: card.id, ownerId: userId, source: "EXCHANGE" },
      include: { card: { include: { wikiPage: true } } },
    });
    const exchange = await tx.cardExchange.create({
      data: { userId, rarity, receivedInstanceId: received.id },
    });
    const given = await tx.cardInstance.updateMany({
      where: { id: { in: givenIds }, ownerId: userId, discardedAt: null },
      data: { discardedAt: now, givenInExchangeId: exchange.id },
    });
    if (given.count !== EXCHANGE_COST) throw new Error("INVALID_EXCHANGE_SELECTION");

    return { received, remainingToday: Math.max(0, DAILY_EXCHANGE_LIMIT - (await exchangesToday(tx, userId, now))) };
  });
}
