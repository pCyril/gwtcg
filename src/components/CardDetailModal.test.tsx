import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { CardDetailModal } from "@/components/CardDetailModal";
import type { CardData } from "@/components/CardTile";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const card: CardData = {
  instanceId: "inst-1",
  cardId: "card-1",
  rarity: "RARE",
  family: "SKILL",
  title: "Nevermore Flatbow",
  extract: "Weapon (Bow, piercing damage).",
  url: "https://wiki.example/Nevermore_Flatbow",
};

let discardResponse: { status: number; body: unknown } = { status: 200, body: {} };

beforeEach(() => {
  discardResponse = { status: 200, body: {} };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url === "/api/me") return new Response(JSON.stringify({ isAdmin: false }));
      if (url === "/api/collection/discard")
        return new Response(JSON.stringify(discardResponse.body), { status: discardResponse.status });
      if (url.includes("drop-stats")) return new Response(JSON.stringify({ copies: 0, total: 0 }));
      return new Response(JSON.stringify({}));
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function Harness(props: Partial<React.ComponentProps<typeof CardDetailModal>>) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Voir {card.title} en 3D
      </button>
      {open && <CardDetailModal card={card} onClose={() => setOpen(false)} {...props} />}
    </>
  );
}

describe("CardDetailModal (RGAA 7.1, 7.3, 7.5, 12.8)", () => {
  it("is a modal dialog named after the card, takes focus and gives it back to its trigger", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<Harness />);
    const trigger = screen.getByRole("button", { name: /en 3D/ });
    await user.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "Nevermore Flatbow" });
    expect(dialog.tagName).toBe("DIALOG");
    expect(dialog).toHaveAttribute("open");
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    expect(await axe(baseElement)).toHaveNoViolations();

    await user.click(screen.getByRole("button", { name: "Fermer" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it("closes on Escape (dialog cancel event) and restores focus", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: /en 3D/ });
    await user.click(trigger);
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it("announces « Lien copié ! » in a status region that exists before sharing", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: /en 3D/ }));
    const status = screen.getByRole("status");
    expect(status).toBeEmptyDOMElement();
    await user.click(screen.getByRole("button", { name: "Partager la carte" }));
    await waitFor(() => expect(status).toHaveTextContent("Lien copié !"));
  });

  it("renders the discard error inside a pre-existing alert region", async () => {
    const user = userEvent.setup();
    discardResponse = { status: 409, body: { error: "CARD_IN_TRADE" } };
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: /en 3D/ }));
    const alerts = screen.getAllByRole("alert");
    alerts.forEach((a) => expect(a).toBeEmptyDOMElement());
    await user.click(screen.getByRole("button", { name: "Défausser" }));
    await waitFor(() => expect(alerts.some((a) => /proposée dans un échange/.test(a.textContent ?? ""))).toBe(true));
  });

  it("moves focus into the register form when « Créer un compte » is pressed, and back on cancel", async () => {
    const user = userEvent.setup();
    render(<Harness tradeWithPseudo="Bob" viewerIsGuest />);
    await user.click(screen.getByRole("button", { name: /en 3D/ }));
    await user.click(screen.getByRole("button", { name: "Créer un compte" }));
    expect(document.activeElement?.tagName).toBe("INPUT");
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.getByRole("button", { name: "Créer un compte" })).toHaveFocus();
  });

  it("lets the action row wrap and no longer ties the card size to the viewport height (10.11, 10.4)", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: /en 3D/ }));
    const row = screen.getByRole("button", { name: "Fermer" }).parentElement!;
    expect(row).toHaveClass("flex-wrap");
    const dialog = screen.getByRole("dialog");
    expect(dialog.innerHTML).not.toContain("100dvh");
  });
});
