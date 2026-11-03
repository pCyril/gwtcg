import { describe, expect, it } from "vitest";
import { translations } from "./translations";

describe("translations", () => {
  it("has the same keys in fr and en", () => {
    expect(Object.keys(translations.en).sort()).toEqual(Object.keys(translations.fr).sort());
  });
});
