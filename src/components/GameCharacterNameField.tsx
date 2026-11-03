"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleContext";

export function GameCharacterNameField({
  value,
  onSaved,
}: {
  value: string | null;
  onSaved: () => void | Promise<void>;
}) {
  const { t, tError } = useLocale();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  // Set when leaving edit mode so focus goes back to the "edit"/"set" button instead of <body>.
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

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // aria-disabled (not disabled) keeps focus on the button while the request runs.
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameCharacterName: draft }),
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
      <p className="text-xs text-neutral-500">
        {t("gameChar.title")} {value ?? <span className="italic">{t("gameChar.notSet")}</span>}{" "}
        <button
          ref={editButtonRef}
          type="button"
          onClick={() => {
            setDraft(value ?? "");
            setError(null);
            setEditing(true);
          }}
          className="underline hover:text-neutral-300"
        >
          {value ? t("common.edit") : t("common.set")}
          <span className="sr-only"> {t("a11y.l3.gameCharTarget")}</span>
        </button>
      </p>
    );
  }

  return (
    <form onSubmit={save} noValidate className="flex flex-wrap items-center gap-2 text-xs">
      <label htmlFor={ids.input} className="text-neutral-500">
        {t("gameChar.title")}
      </label>
      <input
        ref={inputRef}
        id={ids.input}
        name="gameCharacterName"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={t("gameChar.placeholder")}
        maxLength={32}
        autoComplete="off"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${ids.help} ${ids.error}` : ids.help}
        className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-200"
      />
      <button
        type="submit"
        aria-disabled={pending || undefined}
        className="rounded bg-emerald-600 px-2 py-1 font-medium text-white hover:bg-emerald-500 aria-disabled:opacity-50"
      >
        {t("common.save")}
        <span className="sr-only"> {t("a11y.l3.gameCharTarget")}</span>
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
        <span className="sr-only"> {t("a11y.l3.gameCharCancelTarget")}</span>
      </button>
      <span id={ids.help} className="w-full text-neutral-500">
        {t("a11y.l3.gameCharHelp")}
      </span>
      {/* Always mounted so screen readers announce the message when it is filled in. */}
      <span id={ids.error} role="alert" className={error ? "w-full text-red-400" : "sr-only"}>
        {error}
      </span>
    </form>
  );
}
