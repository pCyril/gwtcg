import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { VisualEffectsToggle } from "@/components/VisualEffectsToggle";

afterEach(() => {
  document.documentElement.removeAttribute("data-reduce-effects");
  document.cookie = "gm_effects=; path=/; max-age=0";
});

describe("VisualEffectsToggle (RGAA 13.8)", () => {
  it("turns visual effects off and back on, with the keyboard, and remembers the choice", async () => {
    const user = userEvent.setup();
    const { container } = render(<VisualEffectsToggle initialReduced={false} />);
    const button = screen.getByRole("button", { name: /Effets visuels/ });
    expect(button).toHaveAttribute("aria-pressed", "true");

    button.focus();
    await user.keyboard("{Enter}");
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(document.documentElement).toHaveAttribute("data-reduce-effects");
    expect(document.cookie).toContain("gm_effects=reduced");

    await user.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement).not.toHaveAttribute("data-reduce-effects");
    expect(document.cookie).not.toContain("gm_effects=reduced");

    expect(await axe(container)).toHaveNoViolations();
  });

  it("starts from the server-read preference", () => {
    render(<VisualEffectsToggle initialReduced />);
    expect(screen.getByRole("button", { name: /Effets visuels/ })).toHaveAttribute("aria-pressed", "false");
  });
});
