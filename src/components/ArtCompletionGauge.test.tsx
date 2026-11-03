import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { ArtCompletionGauge } from "./ArtCompletionGauge";

const stats = {
  illustratedCards: 10,
  totalCards: 100,
  percent: 10,
  byFamily: [
    { family: "SKILL", illustratedCards: 5, totalCards: 50, percent: 10 },
    { family: "ITEM", illustratedCards: 5, totalCards: 50, percent: 10 },
  ],
};

describe("ArtCompletionGauge (RGAA 8.2, 9.3)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => stats })));
  });

  it("heading contains the disclosure button; breakdown is a list", async () => {
    const user = userEvent.setup();
    const { container } = render(<ArtCompletionGauge />);
    const heading = await screen.findByRole("heading", { level: 2, name: "Illustrations de la communauté" });
    const button = within(heading).getByRole("button", { name: "Illustrations de la communauté" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button.querySelector("div, p, h2")).toBeNull();
    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    const list = screen.getByRole("list");
    expect(button).toHaveAttribute("aria-controls", list.id);
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(await axe(container)).toHaveNoViolations();
  });
});
