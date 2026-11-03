import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALES, t, type Locale, type TranslationKey } from "@/lib/i18n/translations";

/** Server-side locale, read from the same `gm_locale` cookie the LocaleProvider writes. */
export async function getServerLocale(): Promise<Locale> {
  const jar = await cookies();
  const cookieLocale = jar.get("gm_locale")?.value;
  return (LOCALES as readonly string[]).includes(cookieLocale ?? "") ? (cookieLocale as Locale) : DEFAULT_LOCALE;
}

/** Translated page title for generateMetadata; the root layout's template appends " - GWTCG". */
export async function pageTitle(key: TranslationKey, params?: Record<string, string | number>): Promise<string> {
  return t(await getServerLocale(), key, params);
}
