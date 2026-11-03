import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import {
  EXCHANGE_COST,
  exchangeDayWindow,
  proposeGiven,
  spareInstancesByCard,
  validateGiven,
  type OwnedInstance,
} from "./exchange";

let seq = 0;
function copies(cardId: string, n: number, extra: Partial<OwnedInstance> = {}): OwnedInstance[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${cardId}-${seq++}`,
    cardId,
    title: cardId,
    rarity: "RARE" as const,
    obtainedAt: new Date(2026, 0, 1 + i),
    locked: false,
    ...extra,
  }));
}

describe("spareInstancesByCard", () => {
  it("keeps one copy of each card and offers the newest ones", () => {
    const a = copies("a", 3);
    const spares = spareInstancesByCard([...a, ...copies("b", 1)]);
    expect(spares.has("b")).toBe(false);
    expect(spares.get("a")!.map((i) => i.id)).toEqual([a[2].id, a[1].id]);
  });

  it("never offers a locked copy, but counts it as the kept one", () => {
    const [locked] = copies("a", 1, { locked: true });
    const free = copies("a", 2);
    const spares = spareInstancesByCard([locked, ...free]);
    expect(spares.get("a")!.map((i) => i.id).sort()).toEqual(free.map((i) => i.id).sort());
    expect(spareInstancesByCard([...copies("b", 2, { locked: true }), ...copies("b", 1)]).get("b")).toHaveLength(1);
  });
});

describe("proposeGiven / validateGiven", () => {
  it("takes 10 spares of the rarity, most-duplicated cards first", () => {
    const spares = spareInstancesByCard([
      ...copies("few", 3),
      ...copies("many", 9),
      ...copies("epic", 20, { rarity: "EPIC" }),
    ]);
    const given = proposeGiven(spares, "RARE")!;
    expect(given).toHaveLength(EXCHANGE_COST);
    expect(given.filter((i) => i.cardId === "many")).toHaveLength(8);
    expect(given.every((i) => i.rarity === "RARE")).toBe(true);
    expect(() => validateGiven(spares, "RARE", given.map((i) => i.id))).not.toThrow();
  });

  it("returns null when there are fewer than 10 spares", () => {
    expect(proposeGiven(spareInstancesByCard(copies("a", 10)), "RARE")).toBeNull();
  });

  it("rejects a selection that isn't exactly 10 spares of that rarity", () => {
    const rare = copies("r", 12);
    const epic = copies("e", 3, { rarity: "EPIC" });
    const spares = spareInstancesByCard([...rare, ...epic]);
    const ok = spares.get("r")!.slice(0, 10).map((i) => i.id);
    expect(() => validateGiven(spares, "RARE", ok.slice(0, 9))).toThrow("INVALID_EXCHANGE_SELECTION");
    expect(() => validateGiven(spares, "RARE", [...ok.slice(0, 9), ok[0]])).toThrow("INVALID_EXCHANGE_SELECTION");
    expect(() => validateGiven(spares, "RARE", [...ok.slice(0, 9), spares.get("e")![0].id])).toThrow();
    // The kept (oldest) copy is never a spare.
    const kept = rare.find((i) => !spares.get("r")!.includes(i))!;
    expect(() => validateGiven(spares, "RARE", [...ok.slice(0, 9), kept.id])).toThrow();
  });
});

describe("exchangeDayWindow", () => {
  it("runs from midnight to midnight, Paris time (winter, UTC+1)", () => {
    const { start, end } = exchangeDayWindow(new Date("2026-11-03T10:00:00Z"));
    expect(start.toISOString()).toBe("2026-11-02T23:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-03T23:00:00.000Z");
  });

  it("handles summer time and the late evening (UTC+2)", () => {
    const { start, end } = exchangeDayWindow(new Date("2026-07-14T22:30:00Z"));
    expect(start.toISOString()).toBe("2026-07-14T22:00:00.000Z");
    expect(end.toISOString()).toBe("2026-07-15T22:00:00.000Z");
  });

  it("handles the day the clocks go back (25-hour day)", () => {
    const { start, end } = exchangeDayWindow(new Date("2026-10-25T12:00:00Z"));
    expect(start.toISOString()).toBe("2026-10-24T22:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-25T23:00:00.000Z");
  });
});
