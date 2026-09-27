"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { DEFAULT_LOCALE, t, tError, type Locale, type TranslationKey } from "@/lib/i18n/translations";

const COOKIE_NAME = "gm_locale";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  /** Translates a server error code (e.g. "CARD_IN_TRADE"), falling back to a generic message if unknown. */
  tError: (code: string | undefined | null) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    document.cookie = `${COOKIE_NAME}=${next}; path=/; max-age=${COOKIE_MAX_AGE}`;
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, params) => t(locale, key, params),
      tError: (code) => tError(locale, code),
    }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/** Returns { locale, setLocale, t, tError } - falls back to the default locale if used outside a provider. */
export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (ctx) return ctx;
  return {
    locale: DEFAULT_LOCALE,
    setLocale: () => {},
    t: (key, params) => t(DEFAULT_LOCALE, key, params),
    tError: (code) => tError(DEFAULT_LOCALE, code),
  };
}
