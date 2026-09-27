"use client";

import { useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleContext";

export function PseudoField({ value, onSaved }: { value: string; onSaved: () => void | Promise<void> }) {
  const { t, tError } = useLocale();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
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
      setEditing(false);
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
          onClick={() => {
            setDraft(value);
            setError(null);
            setEditing(true);
          }}
          className="text-xs underline hover:text-neutral-300"
        >
          {t("common.edit")}
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2 align-middle text-xs">
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        maxLength={24}
        className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-200"
      />
      <button
        onClick={save}
        disabled={pending}
        className="rounded bg-emerald-600 px-2 py-1 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {t("common.save")}
      </button>
      <button
        onClick={() => setEditing(false)}
        disabled={pending}
        className="rounded border border-neutral-700 px-2 py-1 text-neutral-300 hover:border-neutral-500"
      >
        {t("common.cancel")}
      </button>
      {error && <span className="basis-full text-red-400">{error}</span>}
    </span>
  );
}
