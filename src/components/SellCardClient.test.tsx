import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { LocaleProvider } from "@/lib/i18n/LocaleContext";
import { SellCardClient } from "./SellCardClient";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }), usePathname: () => "/" }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
let marketEnabled: boolean | null = true;
vi.mock("@/lib/useMarketEnabled", () => ({ useMarketEnabled: () => marketEnabled }));

let resolvePost: (r: Response) => void = () => {};
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  marketEnabled = true;
  push.mockReset();
  fetchMock = vi.fn(() => new Promise<Response>((r) => (resolvePost = r)));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

function renderSell() {
  return render(
    <LocaleProvider initialLocale="fr">
      <SellCardClient instanceId="ci1" />
    </LocaleProvider>,
  );
}

describe("SellCardClient - accessibility", () => {
  it("announces the loading state in a status region (7.5)", () => {
    marketEnabled = null;
    renderSell();
    expect(screen.getByRole("status")).toHaveTextContent("Chargement...");
  });

  it("tells the seller how and until when the listing can be cancelled (11.12)", async () => {
    const { container } = renderSell();
    const submit = screen.getByRole("button", { name: "Mettre en vente" });
    expect(submit).toHaveAccessibleDescription(/annuler la vente .* tant qu'aucune enchère n'a été placée/);
    expect(screen.getByText(/tant qu'aucune enchère n'a été placée/)).toBeVisible();
    expect(await axe(container, { rules: { "color-contrast": { enabled: false } } })).toHaveNoViolations();
  });

  it("keeps focus on the button while sending and announces the error in a pre-existing alert (7.3, 7.5)", async () => {
    const user = userEvent.setup();
    renderSell();
    const alert = screen.getByRole("alert");
    expect(alert).toBeEmptyDOMElement();
    const submit = screen.getByRole("button", { name: "Mettre en vente" });

    await user.click(submit);
    await waitFor(() => expect(submit).toHaveAttribute("aria-disabled", "true"));
    expect(submit).not.toBeDisabled();
    expect(submit).toHaveFocus();
    // A second activation while pending sends nothing more.
    await user.click(submit);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/auctions");
    expect(JSON.parse(init.body as string)).toEqual({
      cardInstanceId: "ci1",
      startingPrice: 1,
      buyoutPrice: null,
      durationHours: 24,
    });

    resolvePost(new Response(JSON.stringify({ error: "INVALID_BUYOUT_PRICE" }), { status: 400 }));
    await waitFor(() => expect(alert).toHaveTextContent("Le prix d'achat immédiat doit être supérieur à la mise à prix."));
    expect(screen.getByRole("alert")).toBe(alert);
    expect(submit).toHaveFocus();
    expect(submit).not.toHaveAttribute("aria-disabled");
    const buyout = screen.getByRole("spinbutton", { name: "Achat immédiat (ecto, optionnel)" });
    expect(buyout).toHaveAttribute("aria-invalid", "true");
    expect(buyout).toHaveAccessibleDescription("Le prix d'achat immédiat doit être supérieur à la mise à prix.");
  });
});
