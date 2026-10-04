import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { LocaleProvider } from "@/lib/i18n/LocaleContext";
import { SiteNav } from "@/components/SiteNav";
import { Footer } from "@/components/Footer";
import { LOCALES, DEFAULT_LOCALE, type Locale } from "@/lib/i18n/translations";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GWTCG",
  description: "Un TCG communautaire et non officiel autour du wiki Guild Wars 1.",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const jar = await cookies();
  const cookieLocale = jar.get("gm_locale")?.value;
  const locale: Locale = (LOCALES as readonly string[]).includes(cookieLocale ?? "")
    ? (cookieLocale as Locale)
    : DEFAULT_LOCALE;

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-950 text-neutral-100">
        <LocaleProvider initialLocale={locale}>
          <SiteNav />
          {/* One content width for the whole site, shared with the nav bar (SiteNav) - pages must not set their own. */}
          <div className="mx-auto w-full max-w-5xl flex-1 px-4">{children}</div>
          <Footer />
        </LocaleProvider>
      </body>
    </html>
  );
}
