"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleContext";

// Rendered inline inside the home page's welcome <p>: only phrasing content (span, label, input, button), no <form>.
export function PseudoField({ value, onSaved }: { value: string; onSaved: () => void | Promise<void> }) {
  const { t, tError } = useLocale();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  // Set when leaving edit mode so focus goes back to the "edit" button instead of <body>.
  const restoreFocus = useRef(false);

  const id = useId();
  const ids = { input: `${id}-input`, help: `${id}-help`, error: `${id}-error` };

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
    } else if (restoreFocus.current) {
      editButtonRef.current?.focus();
      restoreFocus.current = false;
    }
  }, [editing]);

  function stopEditing() {
    restoreFocus.current = true;
    setEditing(false);
  }

  async function save() {
    // aria-disabled (not disabled) keeps focus on the button while the request runs.
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pseudo: draft }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(tError(data.error));
        return;
      }
      stopEditing();
      await onSaved();
    } finally {
      setPending(false);
    }
  }

  if (!editing) {
    return (
      <span>
        {value}{" "}
        <button
          ref={editButtonRef}
          type="button"
          onClick={() => {
            setDraft(value);
            setError(null);
            setEditing(true);
          }}
          className="text-xs underline hover:text-neutral-300"
        >
          {t("common.edit")}
          <span className="sr-only"> {t("a11y.l3.pseudoTarget")}</span>
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2 align-middle text-xs">
      <label htmlFor={ids.input}>{t("a11y.l3.pseudoLabel")}</label>
      <input
        ref={inputRef}
        id={ids.input}
        name="pseudo"
        autoComplete="nickname"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void save();
          }
        }}
        maxLength={24}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${ids.help} ${ids.error}` : ids.help}
        className="rounded border border-neutral-500 bg-neutral-900 px-2 py-1 text-neutral-200"
      />
      <button
        type="button"
        onClick={save}
        aria-disabled={pending || undefined}
        className="rounded bg-emerald-700 px-2 py-1 font-medium text-white hover:bg-emerald-800 aria-disabled:opacity-50"
      >
        {t("common.save")}
        <span className="sr-only"> {t("a11y.l3.pseudoTarget")}</span>
      </button>
      <button
        type="button"
        onClick={() => {
          if (!pending) stopEditing();
        }}
        aria-disabled={pending || undefined}
        className="rounded border border-neutral-700 px-2 py-1 text-neutral-300 hover:border-neutral-500"
      >
        {t("common.cancel")}
        <span className="sr-only"> {t("a11y.l3.pseudoCancelTarget")}</span>
      </button>
      <span id={ids.help} className="basis-full text-neutral-400">
        {t("a11y.l3.pseudoHelp")}
      </span>
      {/* Always mounted so screen readers announce the message when it is filled in. */}
      <span id={ids.error} role="alert" className={error ? "basis-full text-red-400" : "sr-only"}>
        {error}
      </span>
    </span>
  );
}
