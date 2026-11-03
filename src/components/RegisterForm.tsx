"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleContext";

type Field = "pseudo" | "email" | "password";

// Server error codes that point at a specific field (so it can carry aria-invalid).
const ERROR_FIELD: Record<string, Field> = {
  INVALID_PSEUDO: "pseudo",
  PSEUDO_TAKEN: "pseudo",
  INVALID_EMAIL: "email",
  EMAIL_TAKEN: "email",
  PASSWORD_TOO_SHORT: "password",
};

export function RegisterForm({
  onSuccess,
  onCancel,
  focusOnMount = false,
}: {
  onSuccess: () => void;
  onCancel?: () => void;
  /** Moves focus to the first field when the form appears (use when it replaces the button that opened it). */
  focusOnMount?: boolean;
}) {
  const { t, tError } = useLocale();
  const [form, setForm] = useState({ pseudo: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<Field | null>(null);
  const [pending, setPending] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const id = useId();
  const ids = {
    pseudo: `${id}-pseudo`,
    pseudoHelp: `${id}-pseudo-help`,
    email: `${id}-email`,
    password: `${id}-password`,
    passwordHelp: `${id}-password-help`,
    error: `${id}-error`,
  };

  useEffect(() => {
    if (focusOnMount) firstFieldRef.current?.focus();
  }, [focusOnMount]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // aria-disabled (not disabled) keeps focus on the button while the request runs.
    if (pending) return;
    setPending(true);
    setError(null);
    setErrorField(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(tError(data.error));
        setErrorField(ERROR_FIELD[data.error] ?? null);
        return;
      }
      onSuccess();
    } finally {
      setPending(false);
    }
  }

  function describedBy(field: Field, help?: string) {
    const parts = [help, errorField === field ? ids.error : undefined].filter(Boolean);
    return parts.length ? parts.join(" ") : undefined;
  }

  const inputClass = "rounded border border-neutral-500 bg-neutral-950 px-2 py-1";
  const helpClass = "text-xs text-neutral-400";

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-2 text-sm">
      <div className="flex flex-col gap-1">
        <label htmlFor={ids.pseudo}>{t("auth.pseudoOptional")}</label>
        <input
          ref={firstFieldRef}
          id={ids.pseudo}
          name="pseudo"
          autoComplete="nickname"
          value={form.pseudo}
          onChange={(e) => setForm((f) => ({ ...f, pseudo: e.target.value }))}
          aria-invalid={errorField === "pseudo" || undefined}
          aria-describedby={describedBy("pseudo", ids.pseudoHelp)}
          className={inputClass}
        />
        <p id={ids.pseudoHelp} className={helpClass}>
          {t("a11y.l3.pseudoHelp")}
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={ids.email}>
          {t("auth.email")} {t("a11y.l3.required")}
        </label>
        <input
          id={ids.email}
          type="email"
          name="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          aria-invalid={errorField === "email" || undefined}
          aria-describedby={describedBy("email")}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={ids.password}>
          {t("auth.password")} {t("a11y.l3.required")}
        </label>
        <input
          id={ids.password}
          type="password"
          name="password"
          autoComplete="new-password"
          required
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          aria-invalid={errorField === "password" || undefined}
          aria-describedby={describedBy("password", ids.passwordHelp)}
          className={inputClass}
        />
        <p id={ids.passwordHelp} className={helpClass}>
          {t("a11y.l3.passwordHelp")}
        </p>
      </div>

      {/* Always mounted so screen readers announce the message when it is filled in. */}
      <p id={ids.error} role="alert" className={error ? "text-xs text-red-400" : "sr-only"}>
        {error}
      </p>

      <div className="flex gap-2">
        <button
          type="submit"
          aria-disabled={pending || undefined}
          className="rounded bg-emerald-700 px-3 py-1.5 font-medium text-white hover:bg-emerald-800 aria-disabled:opacity-50"
        >
          {t("auth.submitRegister")}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-neutral-700 px-3 py-1.5 text-neutral-300 hover:border-neutral-500"
          >
            {t("common.cancel")}
          </button>
        )}
      </div>
    </form>
  );
}
