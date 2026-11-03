import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HomeClient } from "@/components/HomeClient";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
}));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
// Data widgets unrelated to the booster flow.
vi.mock("@/components/ArtLeaderboard", () => ({ ArtLeaderboard: () => null }));
vi.mock("@/components/CollectionLeaderboard", () => ({ CollectionLeaderboard: () => null }));
vi.mock("@/components/ArtCompletionGauge", () => ({ ArtCompletionGauge: () => null }));

const me = {
  pseudo: "Alice",
  email: null,
  isGuest: true,
  isAdmin: false,
  boostersAvailable: 1,
  dailyBoosterLimit: 2,
  startingProfession: "Ranger",
  gameCharacterName: null,
  nextBoosterInMs: null,
};

let resolveMe: (() => void) | null = null;
let openResponse: { status: number; body: unknown } = { status: 409, body: { error: "NO_BOOSTER_AVAILABLE" } };

beforeEach(() => {
  openResponse = { status: 409, body: { error: "NO_BOOSTER_AVAILABLE" } };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url === "/api/me") {
        if (resolveMe === null) return new Response(JSON.stringify(me));
        await new Promise<void>((r) => (resolveMe = r));
        return new Response(JSON.stringify(me));
      }
      if (url === "/api/booster/open")
        return new Response(JSON.stringify(openResponse.body), { status: openResponse.status });
      return new Response(JSON.stringify({}));
    }),
  );
});
afterEach(() => {
  resolveMe = null;
  vi.unstubAllGlobals();
});

describe("HomeClient (RGAA 7.1, 7.5, 8.2, 12.8)", () => {
  it("exposes the initial loading message as a status", () => {
    resolveMe = () => {};
    render(<HomeClient />);
    expect(screen.getByRole("status")).toHaveTextContent("Chargement...");
  });

  it("names the pack button and keeps only phrasing content inside it", async () => {
    render(<HomeClient />);
    const pack = await screen.findByRole("button", { name: "Ouvrir un booster standard" });
    expect(pack.querySelector("div")).toBeNull();
  });

  it("shows a booster error in a pre-existing alert region and puts focus back on the pack", async () => {
    const user = userEvent.setup();
    render(<HomeClient />);
    const pack = await screen.findByRole("button", { name: "Ouvrir un booster standard" });
    const alert = screen.getByRole("alert");
    expect(alert).toBeEmptyDOMElement();
    await user.click(pack);
    await waitFor(() => expect(alert).toHaveTextContent("Aucun booster disponible"));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(pack).toHaveFocus();
  });

  it("returns focus to the pack (or its heading if it's disabled) when the overlay is closed", async () => {
    openResponse = {
      status: 200,
      body: {
        cards: [{ instanceId: "a", rarity: "COMMON", family: "SKILL", title: "Mistrust", extract: "", url: "u" }],
      },
    };
    const user = userEvent.setup();
    render(<HomeClient />);
    const pack = await screen.findByRole("button", { name: "Ouvrir un booster standard" });
    await user.click(pack);
    const skip = await screen.findByRole("button", { name: "Tout révéler" });
    await user.click(skip);
    await act(async () => {});
    await user.click(screen.getByRole("button", { name: "Fermer" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    // /api/me still says 1 booster available in this mock, so the pack is enabled.
    expect(pack).toHaveFocus();
  });
});
