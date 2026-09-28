"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import type { CardData } from "@/components/CardTile";
import { buildArtPrompt, RECOMMENDED_ART_RATIO, RECOMMENDED_ART_RESOLUTION } from "@/lib/game/artPrompt";
import { useLocale } from "@/lib/i18n/LocaleContext";

export function ArtSubmissionForm({ card }: { card: CardData }) {
  const { t, tError, locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [certified, setCertified] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"pending" | "approved" | null>(null);
  const [copied, setCopied] = useState<"url" | "prompt" | null>(null);

  if (!card.wikiPageId) return null;

  const prompt = buildArtPrompt(locale, card);

  async function copy(text: string, which: "url" | "prompt") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard API unavailable (permissions, insecure context) - silently ignore.
    }
  }

  async function submit() {
    if (!file || !certified) return;
    setPending(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("wikiPageId", card.wikiPageId!);
      form.set("file", file);
      form.set("certifiedOriginal", "true");
      const res = await fetch("/api/art-submissions", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(tError(data.error));
        return;
      }
      setDone(data.status === "APPROVED" ? "approved" : "pending");
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-neutral-700 px-4 py-1.5 text-sm text-neutral-200 hover:border-neutral-500"
      >
        {t("art.proposeButton")}
      </button>
    );
  }

  if (done) {
    return (
      <p className="max-w-xs text-center text-sm text-emerald-300">
        {done === "approved" ? t("art.submittedApproved") : t("art.submitted")}
      </p>
    );
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-3 rounded-lg border border-neutral-700 bg-neutral-900/80 p-4 text-left text-sm">
      <p className="font-semibold text-neutral-200">{t("art.formTitle", { title: card.title })}</p>

      <ol className="flex flex-col gap-2 text-xs text-neutral-400">
        <li>
          {t("art.step1")}{" "}
          <button onClick={() => copy(card.url, "url")} className="inline-flex items-center gap-1 underline hover:text-neutral-200">
            {copied === "url" ? <Check size={12} /> : <Copy size={12} />}
            {copied === "url" ? t("art.copied") : t("art.copyUrl")}
          </button>
        </li>
        <li>{t("art.step2")}</li>
        <li>
          {t("art.step3")}{" "}
          <button onClick={() => copy(prompt, "prompt")} className="inline-flex items-center gap-1 underline hover:text-neutral-200">
            {copied === "prompt" ? <Check size={12} /> : <Copy size={12} />}
            {copied === "prompt" ? t("art.copied") : t("art.copyPrompt")}
          </button>
        </li>
        <li>{t("art.step4", { ratio: RECOMMENDED_ART_RATIO, resolution: RECOMMENDED_ART_RESOLUTION })}</li>
      </ol>

      <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap rounded border border-neutral-800 bg-neutral-950 p-2 text-[11px] text-neutral-400">
        {prompt}
      </pre>

      <p className="text-[11px] text-neutral-500">{t("art.privacyNote")}</p>

      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="text-xs text-neutral-300"
      />

      <label className="flex items-start gap-2 text-xs text-neutral-400">
        <input
          type="checkbox"
          checked={certified}
          onChange={(e) => setCertified(e.target.checked)}
          className="mt-0.5"
        />
        {t("art.consentLabel")}
      </label>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={!file || !certified || pending}
          className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {t("art.submit")}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:border-neutral-500"
        >
          {t("common.cancel")}
        </button>
      </div>
    </div>
  );
}
