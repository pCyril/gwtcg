import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { CardTile } from "./CardTile";
import { AXE_OPTIONS, makeCard, routeFetch } from "@/test/l4-fixtures";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(routeFetch({ "/api/config": {} })));
});

describe("CardTile (RGAA 8.7, 10.2)", () => {
  it("marks the English wiki extract with lang=en", () => {
    render(<CardTile card={makeCard(1)} />);
    const extract = screen.getByText(/Bow Attack\. Fast-moving arrow/);
    expect(extract).toHaveAttribute("lang", "en");
  });

  it("keeps the rarity as text, not only as the CSS-drawn gem", () => {
    const { container } = render(<CardTile card={makeCard(1, { rarity: "EPIC" })} />);
    // Text present in the DOM (so it survives CSS being turned off) and exposed to assistive tech.
    expect(screen.getByText("Rareté : Épique")).toBeInTheDocument();
    // The decorative gem itself is hidden from assistive tech.
    const gem = container.querySelector("span.rotate-45");
    expect(gem).toHaveAttribute("aria-hidden", "true");
  });

  it("raises its own controls only when a sibling overlay is used", () => {
    const { rerender } = render(<CardTile card={makeCard(1)} />);
    expect(screen.getByRole("link", { name: "wiki (GFDL)" }).className).not.toContain("z-30");
    rerender(<CardTile card={makeCard(1)} underOverlay />);
    expect(screen.getByRole("link", { name: "wiki (GFDL)" }).className).toContain("z-30");
  });

  it("has no axe violations", async () => {
    const { container } = render(<CardTile card={makeCard(1, { imageUrls: ["/a.png", "/b.png"] })} />);
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations();
  });
});
