import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
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

describe("CardTile holographic foil", () => {
  it("tags the card with its rarity and keeps the foil layers decorative", () => {
    const { container } = render(<CardTile card={makeCard(1, { rarity: "MYTHIC" })} />);
    const root = container.querySelector(".holo-card") as HTMLElement;
    expect(root).toHaveAttribute("data-rarity", "MYTHIC");
    for (const cls of [".holo-shine", ".holo-glare", ".holo-art"]) {
      expect(container.querySelector(cls)).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("lights up and tilts under the pointer, even when a sibling overlay catches the events", () => {
    const { container } = render(
      <div>
        <button type="button" aria-label="open" />
        <CardTile card={makeCard(1, { rarity: "RARE" })} underOverlay />
      </div>,
    );
    const root = container.querySelector(".holo-card") as HTMLElement;
    root.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 140 }) as DOMRect;
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });

    // jsdom's PointerEvent drops the coordinates: a MouseEvent of the same type carries them.
    fireEvent(
      screen.getByRole("button", { name: "open" }),
      new MouseEvent("pointermove", { bubbles: true, clientX: 75, clientY: 35 }),
    );
    expect(root).toHaveClass("is-active");
    expect(root.style.getPropertyValue("--px")).toBe("0.7500");
    expect(root.style.getPropertyValue("--py")).toBe("0.2500");
    expect(root.style.getPropertyValue("--ry")).toBe("4.50deg");

    fireEvent.pointerLeave(root.parentElement!);
    expect(root).not.toHaveClass("is-active");
    expect(root.style.getPropertyValue("--ry")).toBe("0deg");
  });

  it("uses a given light position without tracking the pointer", () => {
    const { container } = render(<CardTile card={makeCard(1)} holoPointer={{ x: 0, y: 1 }} />);
    const root = container.querySelector(".holo-card") as HTMLElement;
    expect(root).toHaveClass("is-active");
    expect(root.style.getPropertyValue("--px")).toBe("0.0000");
    expect(root.style.getPropertyValue("--rx")).toBe("0deg");
  });
});

describe("CardTile with visual effects turned off", () => {
  afterEach(() => document.documentElement.removeAttribute("data-reduce-effects"));

  it("ignores the pointer", () => {
    document.documentElement.setAttribute("data-reduce-effects", "");
    const { container } = render(<CardTile card={makeCard(1, { rarity: "MYTHIC" })} />);
    const root = container.querySelector(".holo-card") as HTMLElement;
    root.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 140 }) as DOMRect;
    fireEvent(root, new MouseEvent("pointermove", { bubbles: true, clientX: 75, clientY: 35 }));
    expect(root).not.toHaveClass("is-active");
  });

  it("freezes an animated GIF illustration, and only that", () => {
    const gif = makeCard(1, { imageUrls: ["/uploads/card-art/a.gif"] });
    const { container, unmount } = render(<CardTile card={gif} />);
    expect(container.querySelector('img[src="/uploads/card-art/a.gif"]')).toBeInTheDocument();
    unmount();

    document.documentElement.setAttribute("data-reduce-effects", "");
    const frozen = render(<CardTile card={gif} />);
    expect(frozen.container.querySelector("canvas[data-frozen-art]")).toBeInTheDocument();
    expect(frozen.container.querySelector('img[src="/uploads/card-art/a.gif"]')).not.toBeInTheDocument();
    frozen.unmount();

    const still = render(<CardTile card={makeCard(1, { imageUrls: ["/uploads/card-art/a.webp"] })} />);
    expect(still.container.querySelector('img[src="/uploads/card-art/a.webp"]')).toBeInTheDocument();
  });
});
