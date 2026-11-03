import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { TiltableCard } from "@/components/TiltableCard";
import type { CardData } from "@/components/CardTile";

const card: CardData = {
  rarity: "COMMON",
  family: "SKILL",
  title: "Mistrust",
  extract: "Spell.",
  url: "https://wiki.example/Mistrust",
};

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({}))),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe("TiltableCard (RGAA 7.3, 13.10)", () => {
  it("offers named buttons that rotate and flip the card, usable with the keyboard", async () => {
    const user = userEvent.setup();
    const { container } = render(<TiltableCard card={card} className="w-64" />);
    const turning = () => (container.querySelector('[style*="rotateY"]') as HTMLElement).style.transform;
    expect(turning()).toBe("rotateX(10deg) rotateY(-18deg)");

    expect(screen.getByRole("group", { name: "Faire pivoter la carte" })).toBeInTheDocument();
    const right = screen.getByRole("button", { name: "Tourner à droite" });
    right.focus();
    await user.keyboard("{Enter}");
    expect(turning()).toBe("rotateX(10deg) rotateY(27deg)");

    await user.click(screen.getByRole("button", { name: "Tourner à gauche" }));
    expect(turning()).toBe("rotateX(10deg) rotateY(-18deg)");

    screen.getByRole("button", { name: "Retourner la carte" }).focus();
    await user.keyboard(" ");
    expect(turning()).toBe("rotateX(10deg) rotateY(162deg)");

    expect(await axe(container)).toHaveNoViolations();
  });
});
