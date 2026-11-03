import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import NotFound from "./not-found";

let cookieLocale: string | undefined = "fr";
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name === "gm_locale" && cookieLocale ? { value: cookieLocale } : undefined) }),
}));

beforeEach(() => {
  cookieLocale = "fr";
});

describe("not-found (8.7, 9.2)", () => {
  it("renders a translated page inside <main> with a level-1 heading and a way home", async () => {
    render(await NotFound());
    const main = screen.getByRole("main");
    expect(main).toContainElement(screen.getByRole("heading", { level: 1, name: "Page introuvable" }));
    expect(screen.getByRole("link", { name: "Retour à l'accueil" })).toHaveAttribute("href", "/");
    expect(document.title).toBe("Page introuvable - GWTCG");
  });

  it("follows the gm_locale cookie", async () => {
    cookieLocale = "en";
    render(await NotFound());
    expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(await NotFound());
    expect(await axe(container)).toHaveNoViolations();
  });
});
