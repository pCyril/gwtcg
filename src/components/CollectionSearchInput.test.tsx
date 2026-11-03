import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { CollectionSearchInput } from "./CollectionSearchInput";
import { AXE_OPTIONS } from "@/test/l4-fixtures";

describe("CollectionSearchInput (RGAA 11.1)", () => {
  it("has a visible label associated with the field", async () => {
    const { container } = render(<CollectionSearchInput value="" onChange={vi.fn()} />);
    const label = screen.getByText("Rechercher une carte");
    expect(label.tagName).toBe("LABEL");
    const input = screen.getByRole("searchbox", { name: "Rechercher une carte" });
    expect(input).not.toHaveAttribute("aria-label");
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations();
  });
});
