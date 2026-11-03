import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { LocaleProvider } from "@/lib/i18n/LocaleContext";
import { CONTENT_ID } from "@/lib/contentId";
import { SkipLink } from "./SkipLink";
import { SiteNav } from "./SiteNav";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
}));
vi.stubGlobal("fetch", vi.fn(async () => ({ json: async () => ({}) })));

/** Same order as the root layout (src/app/layout.tsx), which can't be rendered in jsdom (<html>, next/font). */
function Shell({ locale = "fr" as const }: { locale?: "fr" | "en" }) {
  return (
    <LocaleProvider initialLocale={locale}>
      <SkipLink />
      <SiteNav />
      <div id={CONTENT_ID} tabIndex={-1}>
        <main>
          <h1>Contenu</h1>
        </main>
      </div>
    </LocaleProvider>
  );
}

describe("SkipLink", () => {
  it("12.7: is the first focusable element and targets the content wrapper", async () => {
    const user = userEvent.setup();
    render(<Shell />);
    await user.tab();
    const link = screen.getByRole("link", { name: "Aller au contenu" });
    expect(link).toHaveFocus();
    expect(link).toHaveAttribute("href", `#${CONTENT_ID}`);
    const target = document.getElementById(CONTENT_ID);
    expect(target).toHaveAttribute("tabindex", "-1");
    expect(target).toContainElement(screen.getByRole("main"));
  });

  it("12.7: is hidden until focused, then shown (sr-only + focus:not-sr-only)", () => {
    render(<Shell />);
    const link = screen.getByRole("link", { name: "Aller au contenu" });
    expect(link.className).toMatch(/(^| )sr-only( |$)/);
    expect(link.className).toMatch(/focus:not-sr-only/);
  });

  it("is translated", () => {
    render(<Shell locale="en" />);
    expect(screen.getByRole("link", { name: "Skip to content" })).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<Shell />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
