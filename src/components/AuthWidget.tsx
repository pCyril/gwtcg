"use client";

import { useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleContext";

interface AuthWidgetProps {
  isGuest: boolean;
  email: string | null;
  onAuthChange: () => void;
}

type Mode = "closed" | "login" | "register";

export function AuthWidget({ isGuest, email, onAuthChange }: AuthWidgetProps) {
  const { t, tError } = useLocale();
  const [mode, setMode] = useState<Mode>("closed");
  const [form, setForm] = useState({ pseudo: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!isGuest) {
    return (
      <div className="flex items-center gap-3 text-sm text-neutral-400">
        <span>{t("auth.connectedAs", { email: email ?? "" })}</span>
        <button
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            onAuthChange();
          }}
          className="underline hover:text-neutral-200"
        >
          {t("auth.logout")}
        </button>
      </div>
    );
  }

  if (mode === "closed") {
    return (
      <div className="flex gap-3 text-sm">
        <button onClick={() => setMode("login")} className="text-neutral-400 underline hover:text-neutral-200">
          {t("auth.login")}
        </button>
        <button onClick={() => setMode("register")} className="text-emerald-400 underline hover:text-emerald-300">
          {t("auth.register")}
        </button>
      </div>
    );
  }

  async function submit() {
    setPending(true);
    setError(null);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(tError(data.error));
        return;
      }
      setMode("closed");
      onAuthChange();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-neutral-800 bg-neutral-900/50 p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-neutral-200">
          {mode === "login" ? t("auth.loginTitle") : t("auth.registerTitle")}
        </span>
        <button onClick={() => setMode("closed")} className="text-neutral-500 hover:text-neutral-300">
          ✕
        </button>
      </div>

      {mode === "register" && (
        <input
          placeholder={t("auth.pseudoOptional")}
          value={form.pseudo}
          onChange={(e) => setForm((f) => ({ ...f, pseudo: e.target.value }))}
          className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1"
        />
      )}
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

      <button
        onClick={submit}
        disabled={pending}
        className="rounded bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {mode === "login" ? t("auth.submitLogin") : t("auth.submitRegister")}
      </button>
    </div>
  );
}
