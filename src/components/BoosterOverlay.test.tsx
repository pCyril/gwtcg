import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { BoosterOverlay } from "@/components/BoosterOverlay";
import type { CardData } from "@/components/CardTile";

function makeCards(n: number): CardData[] {
  return Array.from({ length: n }, (_, i) => ({
    instanceId: `i${i}`,
    cardId: `c${i}`,
    rarity: "COMMON",
    family: "SKILL",
    title: `Carte ${i + 1}`,
    extract: "Texte.",
    url: `https://wiki.example/${i}`,
  }));
}

function cancel(dialog: HTMLElement) {
  // jsdom doesn't turn Escape into the dialog's "cancel" event: dispatch it like the browser does.
  fireEvent(dialog, new Event("cancel", { cancelable: true }));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({}), { status: 200 })),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("BoosterOverlay (RGAA 7.1, 7.5, 10.7, 12.8, 13.8)", () => {
  it("opens as a named modal dialog with focus on « Tout révéler » and an opening status", async () => {
    const { baseElement } = render(<BoosterOverlay pending cards={null} label="Booster standard" onClose={() => {}} />);
    const dialog = screen.getByRole("dialog", { name: "Booster standard" });
    expect(dialog.tagName).toBe("DIALOG");
    expect(dialog).toHaveAttribute("open");
    expect(screen.getByRole("button", { name: "Tout révéler" })).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent("Ouverture du booster…");
    vi.useRealTimers();
    expect(await axe(baseElement)).toHaveNoViolations();
  });

  it("keeps « Tout révéler » (same element, focused) while cards advance, announces each card, then focuses the results", () => {
    const cards = makeCards(5);
    const { rerender } = render(<BoosterOverlay pending cards={null} label="Booster standard" onClose={() => {}} />);
    const status = screen.getByRole("status");
    const skip = screen.getByRole("button", { name: "Tout révéler" });
    rerender(<BoosterOverlay pending={false} cards={cards} label="Booster standard" onClose={() => {}} />);

    act(() => vi.advanceTimersByTime(450)); // burst
    expect(status).toHaveTextContent("Carte 1 sur 5 : Carte 1, Commune");
    act(() => vi.advanceTimersByTime(900)); // next card
    expect(status).toHaveTextContent("Carte 2 sur 5 : Carte 2, Commune");
    expect(screen.getByRole("button", { name: "Tout révéler" })).toBe(skip);
    expect(skip).toHaveFocus();

    fireEvent.click(skip);
    const heading = screen.getByRole("heading", { level: 2, name: "Cartes obtenues" });
    expect(heading).toHaveFocus();
    expect(status).toHaveTextContent("5 cartes obtenues");
    expect(screen.getByRole("dialog", { name: "Cartes obtenues" })).toBeInTheDocument();
  });

  it("« Tout révéler » pressed while the server answers stops the shaking pack and skips the reveal", () => {
    const { container, rerender } = render(
      <BoosterOverlay pending cards={null} label="Booster standard" onClose={() => {}} />,
    );
    expect(container.ownerDocument.querySelector(".pack-shake")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Tout révéler" }));
    expect(container.ownerDocument.querySelector(".pack-shake")).toBeNull();
    rerender(<BoosterOverlay pending={false} cards={makeCards(5)} label="Booster standard" onClose={() => {}} />);
    expect(screen.getByRole("heading", { name: "Cartes obtenues" })).toHaveFocus();
  });

  it("Escape stops the reveal, then closes the overlay", () => {
    const onClose = vi.fn();
    render(<BoosterOverlay pending={false} cards={makeCards(5)} label="Booster standard" onClose={onClose} />);
    act(() => vi.advanceTimersByTime(450));
    const dialog = screen.getByRole("dialog");
    cancel(dialog);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Cartes obtenues" })).toHaveFocus();
    cancel(dialog);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows the final hand straight away when the user prefers reduced motion", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: query.includes("reduce"),
        media: query,
        addEventListener() {},
        removeEventListener() {},
      })),
    );
    render(<BoosterOverlay pending={false} cards={makeCards(5)} label="Booster standard" onClose={() => {}} />);
    expect(screen.getByRole("heading", { name: "Cartes obtenues" })).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Tout révéler" })).toBeNull();
  });

  it("moves focus into the register form and back to « Créer un compte » on cancel", () => {
    render(<BoosterOverlay pending={false} cards={makeCards(2)} label="Booster standard" onClose={() => {}} isGuest />);
    fireEvent.click(screen.getByRole("button", { name: "Tout révéler" }));
    fireEvent.click(screen.getByRole("button", { name: "Créer un compte" }));
    expect(document.activeElement?.tagName).toBe("INPUT");
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.getByRole("button", { name: "Créer un compte" })).toHaveFocus();
  });
});
