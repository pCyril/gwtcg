import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { LocaleProvider } from "@/lib/i18n/LocaleContext";
import type { DropRates } from "@/lib/game/dropRates";
import { DropsClient } from "./DropsClient";

const rates = {
  boosterSize: 5,
  totalCards: 1000,
  boostersPerBatch: 3,
  refillMinutes: 60,
  rarities: [{ rarity: "COMMON", share: 70, cards: 700, perCard: 0.1 }],
  families: [{ family: "SKILL", cards: 400, dropShare: 40 }],
} as unknown as DropRates;

describe("DropsClient - accessibility", () => {
  it("names each data table after its section heading (5.4)", async () => {
    const { container } = render(
      <LocaleProvider initialLocale="fr">
        <DropsClient rates={rates} />
      </LocaleProvider>,
    );
    const tables = screen.getAllByRole("table");
    expect(tables).toHaveLength(2);
    expect(tables[0]).toHaveAccessibleName("Les chances par rareté");
    expect(tables[1]).toHaveAccessibleName("Pourquoi certaines familles sortent plus que d'autres");
    expect(await axe(container, { rules: { "color-contrast": { enabled: false } } })).toHaveNoViolations();
  });
});
