"use client";

import { useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleContext";

export function RegisterForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel?: () => void }) {
  const { t, tError } = useLocale();
  const [form, setForm] = useState({ pseudo: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(tError(data.error));
        return;
      }
      onSuccess();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 text-sm">
      <input
        placeholder={t("auth.pseudoOptional")}
        value={form.pseudo}
        onChange={(e) => setForm((f) => ({ ...f, pseudo: e.target.value }))}
        className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1"
      />
      <input
        type="email"
        placeholder={t("auth.email")}
        value={form.email}
        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1"
      />
      <input
        type="password"
        placeholder={t("auth.password")}
        value={form.password}
        onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
        className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1"
      />

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={pending}
          className="rounded bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {t("auth.submitRegister")}
        </button>
        {onCancel && (
          <button onClick={onCancel} className="rounded border border-neutral-700 px-3 py-1.5 text-neutral-300 hover:border-neutral-500">
            {t("common.cancel")}
          </button>
        )}
      </div>
    </div>
  );
}
