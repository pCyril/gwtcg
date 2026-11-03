import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }), usePathname: () => "/trade" }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { TradeListClient } from "./TradeListClient";

type Handler = (url: string, init?: RequestInit) => { status: number; body: unknown };

function stubFetch(handler: Handler) {
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    const { status, body } = handler(url, init);
    return { ok: status < 400, status, json: async () => body };
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

const trades = [
  { id: "t1", status: "PENDING", createdAt: "", counterparty: "Bob", isInitiator: true },
  { id: "t2", status: "ACCEPTED", createdAt: "", counterparty: "Eve", isInitiator: false },
];

describe("TradeListClient (RGAA 11.1, 9.3, 7.3, 7.5, 10.11)", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("registered: labelled field, list of trades, error announced, focus kept, same body", async () => {
    const fetchMock = stubFetch((url, init) => {
      if (url === "/api/me") return { status: 200, body: { isGuest: false } };
      if (init?.method === "POST") return { status: 404, body: { error: "USER_NOT_FOUND" } };
      return { status: 200, body: { trades } };
    });
    const user = userEvent.setup();
    const { container } = render(<TradeListClient />);
    expect(screen.getByRole("status")).toHaveTextContent("Chargement...");
    const input = await screen.findByLabelText("Pseudo du joueur");
    expect(input).toHaveClass("min-w-0");
    const list = await screen.findByRole("list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();

    const alert = screen.getByRole("alert");
    await user.type(input, " nobody {Enter}");
    await waitFor(() => expect(alert).toHaveTextContent("Aucun joueur avec ce pseudo."));
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Aucun joueur avec ce pseudo.");
    expect(fetchMock).toHaveBeenCalledWith("/api/trade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientPseudo: "nobody" }),
    });
    const propose = screen.getByRole("button", { name: "Proposer" });
    propose.focus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    expect(propose).toHaveFocus();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("empty submission explains what to enter instead of silently doing nothing", async () => {
    const fetchMock = stubFetch((url) =>
      url === "/api/me" ? { status: 200, body: { isGuest: false } } : { status: 200, body: { trades: [] } },
    );
    const user = userEvent.setup();
    render(<TradeListClient />);
    await user.click(await screen.findByRole("button", { name: "Proposer" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Saisis le pseudo du joueur.");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("guest: register form gets focus, Cancel returns focus to the opener", async () => {
    stubFetch((url) =>
      url === "/api/me" ? { status: 200, body: { isGuest: true } } : { status: 200, body: { trades: [] } },
    );
    const user = userEvent.setup();
    render(<TradeListClient />);
    await user.click(await screen.findByRole("button", { name: "Créer un compte" }));
    expect(screen.getByLabelText("Pseudo (optionnel)")).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.getByRole("button", { name: "Créer un compte" })).toHaveFocus();
  });
});
