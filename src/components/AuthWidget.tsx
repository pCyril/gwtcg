"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { RegisterForm } from "@/components/RegisterForm";

interface AuthWidgetProps {
  isGuest: boolean;
  email: string | null;
  onAuthChange: () => void;
}

type Mode = "closed" | "login" | "register";
type Field = "email" | "password";

export function AuthWidget({ isGuest, email, onAuthChange }: AuthWidgetProps) {
  const { t, tError } = useLocale();
  const [mode, setMode] = useState<Mode>("closed");
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<Field | null>(null);
  const [pending, setPending] = useState(false);

  const loginButtonRef = useRef<HTMLButtonElement>(null);
  const registerButtonRef = useRef<HTMLButtonElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  // Which opener gets focus back when a panel is closed with ✕ (null: leave focus alone).
  const returnFocusTo = useRef<"login" | "register" | null>(null);

  const id = useId();
  const ids = {
    title: `${id}-title`,
    email: `${id}-email`,
    password: `${id}-password`,
    error: `${id}-error`,
  };

  useEffect(() => {
    if (mode === "login") {
      emailInputRef.current?.focus();
    } else if (mode === "closed" && returnFocusTo.current) {
      (returnFocusTo.current === "login" ? loginButtonRef : registerButtonRef).current?.focus();
      returnFocusTo.current = null;
    }
  }, [mode]);

  if (!isGuest) {
    return (
      <div className="text-sm text-neutral-400">
        <span>{t("auth.connectedAs", { email: email ?? "" })}</span>
      </div>
    );
  }

  function closePanel() {
    returnFocusTo.current = mode === "closed" ? null : mode;
    setMode("closed");
  }

  const closeButton = (
    <button type="button" onClick={closePanel} className="text-neutral-400 hover:text-neutral-300">
      <span aria-hidden="true">✕</span>
      <span className="sr-only">{t("common.close")}</span>
    </button>
  );

  if (mode === "closed") {
    return (
      <div className="flex gap-3 text-sm">
        <button
          ref={loginButtonRef}
          type="button"
          onClick={() => setMode("login")}
          className="text-neutral-400 underline hover:text-neutral-200"
        >
          {t("auth.login")}
        </button>
        <button
          ref={registerButtonRef}
          type="button"
          onClick={() => setMode("register")}
          className="text-emerald-400 underline hover:text-emerald-300"
        >
          {t("auth.register")}
        </button>
      </div>
    );
  }

  if (mode === "register") {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-neutral-800 bg-neutral-900/50 p-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-200">{t("auth.registerTitle")}</h2>
          {closeButton}
        </div>
        <RegisterForm
          focusOnMount
          onSuccess={() => {
            setMode("closed");
            onAuthChange();
          }}
        />
      </div>
    );
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // aria-disabled (not disabled) keeps focus on the button while the request runs.
    if (pending) return;
    setError(null);
    setErrorField(null);
    if (!form.email.trim()) {
      setError(t("a11y.l3.emailEmpty"));
      setErrorField("email");
      return;
    }
    if (!form.password) {
      setError(t("a11y.l3.passwordEmpty"));
      setErrorField("password");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/auth/login", {
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

  const inputClass = "rounded border border-neutral-500 bg-neutral-950 px-2 py-1";

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-labelledby={ids.title}
      className="flex flex-col gap-2 rounded-lg border border-neutral-800 bg-neutral-900/50 p-3 text-sm"
    >
      <div className="flex items-center justify-between">
        <h2 id={ids.title} className="font-semibold text-neutral-200">
          {t("auth.loginTitle")}
        </h2>
        {closeButton}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={ids.email}>
          {t("auth.email")} {t("a11y.l3.required")}
        </label>
        <input
          ref={emailInputRef}
          id={ids.email}
          type="email"
          name="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          aria-invalid={errorField === "email" || undefined}
          aria-describedby={errorField === "email" ? ids.error : undefined}
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
          autoComplete="current-password"
          required
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          aria-invalid={errorField === "password" || undefined}
          aria-describedby={errorField === "password" ? ids.error : undefined}
          className={inputClass}
        />
      </div>

      {/* Always mounted so screen readers announce the message when it is filled in. */}
      <p id={ids.error} role="alert" className={error ? "text-xs text-red-400" : "sr-only"}>
        {error}
      </p>

      <button
        type="submit"
        aria-disabled={pending || undefined}
        className="rounded bg-emerald-700 px-3 py-1.5 font-medium text-white hover:bg-emerald-800 aria-disabled:opacity-50"
      >
        {t("auth.submitLogin")}
      </button>
    </form>
  );
}
