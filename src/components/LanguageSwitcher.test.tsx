import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LocaleProvider } from "@/lib/i18n/LocaleContext";
import { LanguageSwitcher } from "./LanguageSwitcher";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh }),
  usePathname: () => "/",
}));

beforeEach(() => {
  refresh.mockClear();
  document.documentElement.lang = "fr";
});

describe("LanguageSwitcher + LocaleProvider", () => {
  it("8.4: switching language updates <html lang> right away (mouse and keyboard)", async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider initialLocale="fr">
        <LanguageSwitcher />
      </LocaleProvider>,
    );
    expect(document.documentElement.lang).toBe("fr");
    await user.click(screen.getByRole("button", { name: "en" }));
    expect(document.documentElement.lang).toBe("en");
    screen.getByRole("button", { name: "fr" }).focus();
    await user.keyboard(" ");
    expect(document.documentElement.lang).toBe("fr");
  });

  it("8.4: <html lang> follows the initial locale on mount", () => {
    render(
      <LocaleProvider initialLocale="en">
        <LanguageSwitcher />
      </LocaleProvider>,
    );
    expect(document.documentElement.lang).toBe("en");
  });

  it("8.6: switching language refreshes server-rendered parts (page title) with the new cookie", async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider initialLocale="fr">
        <LanguageSwitcher />
      </LocaleProvider>,
    );
    await user.click(screen.getByRole("button", { name: "en" }));
    expect(document.cookie).toContain("gm_locale=en");
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
