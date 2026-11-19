import { describe, expect, it } from "vitest";
import { buildArtPrompt } from "./artPrompt";

const base = { title: "Mistrust", extract: "Spell.", profession: "Mesmer" };

describe("buildArtPrompt", () => {
  it("asks for an animated GIF, when the AI can make one, on mythic skills only", () => {
    expect(buildArtPrompt("fr", { ...base, family: "SKILL", rarity: "MYTHIC" })).toMatch(/si tu es capable de générer un GIF animé/);
    expect(buildArtPrompt("en", { ...base, family: "SKILL", rarity: "MYTHIC" })).toMatch(/if you are able to generate an animated GIF/);
    expect(buildArtPrompt("fr", { ...base, family: "SKILL", rarity: "LEGENDARY" })).not.toMatch(/GIF/);
    expect(buildArtPrompt("fr", { ...base, family: "BOSS", rarity: "MYTHIC" })).not.toMatch(/GIF/);
  });
});
