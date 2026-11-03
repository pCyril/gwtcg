import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { ArtSubmissionForm } from "@/components/ArtSubmissionForm";
import type { CardData } from "@/components/CardTile";

const card: CardData = {
  wikiPageId: "123",
  rarity: "COMMON",
  family: "SKILL",
  title: "Mistrust",
  extract: "Spell.",
  url: "https://wiki.example/Mistrust",
};

let submitResponse: { status: number; body: unknown } = { status: 200, body: { status: "PENDING" } };

beforeEach(() => {
  submitResponse = { status: 200, body: { status: "PENDING" } };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      url === "/api/art-submissions"
        ? new Response(JSON.stringify(submitResponse.body), { status: submitResponse.status })
        : new Response(JSON.stringify({})),
    ),
  );
});
afterEach(() => vi.unstubAllGlobals());

async function openForm() {
  const user = userEvent.setup();
  render(<ArtSubmissionForm card={card} />);
  await user.click(screen.getByRole("button", { name: "Proposer une illustration" }));
  return user;
}

describe("ArtSubmissionForm (RGAA 7.3, 7.5, 9.1, 11.1, 11.10)", () => {
  it("opens on a focused heading, with a labelled, described and required file field", async () => {
    await openForm();
    const heading = screen.getByRole("heading", { level: 3, name: "Proposer une illustration pour « Mistrust »" });
    expect(heading).toHaveFocus();
    expect(screen.getByRole("group", { name: "Proposer une illustration pour « Mistrust »" })).toBeInTheDocument();

    const file = screen.getByLabelText("Illustration à envoyer (obligatoire)");
    expect(file).toHaveAttribute("type", "file");
    expect(file).toBeRequired();
    expect(file).toHaveAccessibleDescription("Formats acceptés : JPEG, PNG ou WebP, 8 Mo maximum.");
    // Instructions come before the field.
    const hint = screen.getByText(/Formats acceptés/);
    expect(hint.compareDocumentPosition(file) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const consent = screen.getByRole("checkbox", { name: /Je certifie.*\(obligatoire\)/ });
    expect(consent).toBeRequired();

    // The component alone (the page landmarks belong to the layout).
    expect(await axe(document.body.firstElementChild as HTMLElement)).toHaveNoViolations();
  });

  it("gives focus back to « Proposer une illustration » on cancel", async () => {
    const user = await openForm();
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.getByRole("button", { name: "Proposer une illustration" })).toHaveFocus();
  });

  it("announces « Copié ! » in a status region present before copying", async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const user = await openForm();
    const status = screen.getByRole("status");
    expect(status).toBeEmptyDOMElement();
    await user.click(screen.getByRole("button", { name: "Copier le prompt" }));
    await waitFor(() => expect(status).toHaveTextContent("Copié !"));
  });

  it("shows a server error inside a pre-existing alert region", async () => {
    submitResponse = { status: 400, body: { error: "INVALID_IMAGE" } };
    const user = await openForm();
    const alert = screen.getByRole("alert");
    expect(alert).toBeEmptyDOMElement();
    await user.upload(
      screen.getByLabelText("Illustration à envoyer (obligatoire)"),
      new File(["x"], "art.png", { type: "image/png" }),
    );
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Envoyer" }));
    await waitFor(() => expect(alert).not.toBeEmptyDOMElement());
  });

  it("moves focus to the confirmation (role=status) after a successful submission", async () => {
    const user = await openForm();
    await user.upload(
      screen.getByLabelText("Illustration à envoyer (obligatoire)"),
      new File(["x"], "art.png", { type: "image/png" }),
    );
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Envoyer" }));
    const done = await screen.findByText(/Proposition envoyée/);
    expect(done).toHaveAttribute("role", "status");
    expect(done).toHaveFocus();
  });
});
