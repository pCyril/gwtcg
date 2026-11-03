import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import DocumentTitle from "@/components/DocumentTitle";

describe("DocumentTitle / useDocumentTitle", () => {
  it("sets a page-specific document title with the site suffix", () => {
    document.title = "GWTCG";
    render(<DocumentTitle title="Page introuvable" />);
    expect(document.title).toBe("Page introuvable - GWTCG");
  });
});
