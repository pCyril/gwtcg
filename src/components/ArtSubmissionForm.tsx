"use client";

import { useId, useRef, useState } from "react";
import { Copy, Check } from "lucide-react";
import type { CardData } from "@/components/CardTile";
import { buildArtPrompt, RECOMMENDED_ART_RATIO, RECOMMENDED_ART_RESOLUTION } from "@/lib/game/artPrompt";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { useWikiUrl } from "@/lib/useWikiUrl";
import { useFocusAfterRender } from "@/lib/useModalDialog";

export function ArtSubmissionForm({ card }: { card: CardData }) {
  const { t, tError, locale } = useLocale();
  const wikiUrl = useWikiUrl();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [certified, setCertified] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"pending" | "approved" | null>(null);
  const [copied, setCopied] = useState<"url" | "prompt" | null>(null);
  const headingId = useId();
  const fileId = useId();
  const fileHintId = useId();
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const doneRef = useRef<HTMLParagraphElement>(null);
  // Each toggle below replaces the focused control: move focus to what replaces it.
  const focusAfterRender = useFocusAfterRender();

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
    if (!file || !certified || pending) return;
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
      focusAfterRender(() => doneRef.current);
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button
        ref={openButtonRef}
        type="button"
        onClick={() => {
          setOpen(true);
          focusAfterRender(() => headingRef.current);
        }}
        className="rounded-lg border border-neutral-700 px-4 py-1.5 text-sm text-neutral-200 hover:border-neutral-500"
      >
        {t("art.proposeButton")}
      </button>
    );
  }

  if (done) {
    return (
      <p ref={doneRef} tabIndex={-1} role="status" className="max-w-xs text-center text-sm text-emerald-300">
        {done === "approved" ? t("art.submittedApproved") : t("art.submitted")}
      </p>
    );
  }

  return (
    <div
      role="group"
      aria-labelledby={headingId}
      className="flex w-full max-w-sm flex-col gap-3 rounded-lg border border-neutral-700 bg-neutral-900/80 p-4 text-left text-sm"
    >
      <h3 id={headingId} ref={headingRef} tabIndex={-1} className="font-semibold text-neutral-200">
        {t("art.formTitle", { title: card.title })}
      </h3>
      {/* "Copied!" is otherwise only a change of the copy button's text. */}
      <div role="status" className="sr-only">
        {copied ? t("art.copied") : ""}
      </div>

      <ol className="flex flex-col gap-2 text-xs text-neutral-400">
        <li>
          {t("art.step1")}{" "}
          <button onClick={() => copy(wikiUrl(card.url), "url")} className="inline-flex items-center gap-1 underline hover:text-neutral-200">
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

      <p className="text-[11px] text-neutral-400">{t("art.privacyNote")}</p>

      {/* Label and accepted formats come before the field, so they're known before choosing a file. */}
      <div className="flex flex-col gap-1">
        <label htmlFor={fileId} className="text-xs text-neutral-300">
          {t("art.fileLabel")}
        </label>
        <p id={fileHintId} className="text-[11px] text-neutral-400">
          {t("art.fileHint")}
        </p>
        <input
          id={fileId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          aria-describedby={fileHintId}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-xs text-neutral-300"
        />
      </div>

      <label className="flex items-start gap-2 text-xs text-neutral-400">
        <input
          type="checkbox"
          checked={certified}
          onChange={(e) => setCertified(e.target.checked)}
          required
          className="mt-0.5"
        />
        <span>
          {t("art.consentLabel")} {t("art.requiredMark")}
        </span>
      </label>

      {/* Persistent alert region (empty until an error): -mt-3/mt-3 keep the column's gap-3 unchanged. */}
      <div role="alert" className="-mt-3">
        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          aria-disabled={!file || !certified || pending || undefined}
          className="rounded bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 aria-disabled:opacity-50"
        >
          {t("art.submit")}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            focusAfterRender(() => openButtonRef.current);
          }}
          className="rounded border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:border-neutral-500"
        >
          {t("common.cancel")}
        </button>
      </div>
    </div>
  );
}
