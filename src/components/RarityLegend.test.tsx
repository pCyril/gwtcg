import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { axe } from "vitest-axe";
import { RarityLegend } from "./RarityLegend";
import { AXE_OPTIONS } from "@/test/l4-fixtures";

describe("RarityLegend (RGAA 9.3)", () => {
  it("is a list of the six rarities", async () => {
    const { container } = render(<RarityLegend />);
    const list = screen.getByRole("list");
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(6);
    expect(items[0]).toHaveTextContent("Commune");
    expect(items[0].querySelector("span")).toHaveAttribute("aria-hidden", "true");
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations();
  });
});
