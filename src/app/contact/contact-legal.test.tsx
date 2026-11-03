import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";

const locale = vi.hoisted(() => ({ value: "fr" as "fr" | "en" }));
vi.mock("@/lib/i18n/serverLocale", async () => {
  const { t } = await import("@/lib/i18n/translations");
  return {
    getServerLocale: async () => locale.value,
    pageTitle: async (key: Parameters<typeof t>[1]) => t(locale.value, key),
  };
});

import ContactPage, { generateMetadata as contactMeta } from "./page";
import LegalNoticePage, { generateMetadata as legalMeta } from "../mentions-legales/page";
import StatementPage, { generateMetadata as statementMeta } from "../accessibilite/page";

describe("Contact page", () => {
  it("shows the contact address as a mailto link, with an accessibility section", async () => {
    locale.value = "fr";
    const { container } = render(await ContactPage());
    expect(screen.getByRole("heading", { level: 1, name: "Contact" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "perraud.cyril@gmail.com" })).toHaveAttribute(
      "href",
      "mailto:perraud.cyril@gmail.com",
    );
    expect(screen.getByRole("region", { name: "Accessibilité" })).toBeInTheDocument();
    expect(await contactMeta()).toEqual({ title: "Contact" });
    expect(await axe(container, { rules: { "color-contrast": { enabled: false } } })).toHaveNoViolations();
  });
});

describe("Legal notice page", () => {
  it.each([
    ["fr", "Mentions légales", ["Éditeur", "Hébergeur", "Données personnelles", "Cookies", "Propriété intellectuelle", "Accessibilité"]],
    ["en", "Legal notice", ["Publisher", "Hosting", "Personal data", "Cookies", "Intellectual property", "Accessibility"]],
  ] as const)("renders every section in %s", async (loc, title, sectionTitles) => {
    locale.value = loc;
    const { container } = render(await LegalNoticePage());
    expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument();
    for (const s of sectionTitles) expect(screen.getByRole("region", { name: s })).toBeInTheDocument();
    expect(screen.getByText(/OVH SAS, 2 rue Kellermann, 59100 Roubaix/)).toBeInTheDocument();
    expect(await legalMeta()).toEqual({ title });
    expect(await axe(container, { rules: { "color-contrast": { enabled: false } } })).toHaveNoViolations();
  });
});

describe("Accessibility statement page", () => {
  it.each([
    ["fr", "Déclaration d'accessibilité", "partiellement conforme", ["État de conformité", "Résultats des tests", "Contenus non accessibles", "Retour d'information et contact", "Voies de recours"]],
    ["en", "Accessibility statement", "partially compliant", ["Compliance status", "Test results", "Non-accessible content", "Feedback and contact", "Remedies"]],
  ] as const)("renders the statement in %s", async (loc, title, status, sectionTitles) => {
    locale.value = loc;
    const { container } = render(await StatementPage());
    expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByText(status)).toBeInTheDocument();
    for (const s of sectionTitles) expect(screen.getByRole("region", { name: s })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "perraud.cyril@gmail.com" })).toHaveAttribute("href", "mailto:perraud.cyril@gmail.com");
    expect(await statementMeta()).toEqual({ title });
    expect(await axe(container, { rules: { "color-contrast": { enabled: false } } })).toHaveNoViolations();
  });
});
