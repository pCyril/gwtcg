import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LocaleProvider } from "@/lib/i18n/LocaleContext";
import { SiteNav } from "@/components/SiteNav";
import { Footer } from "@/components/Footer";
import { SkipLink } from "@/components/SkipLink";
import { CONTENT_ID } from "@/lib/contentId";
import { getServerLocale } from "@/lib/i18n/serverLocale";
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
  // Each page sets its own title (generateMetadata, localized); the home page keeps the bare site name.
  title: { default: "GWTCG", template: "%s - GWTCG" },
  description: "Un TCG communautaire et non officiel autour du wiki Guild Wars 1.",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getServerLocale();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-950 text-neutral-100">
        <LocaleProvider initialLocale={locale}>
          <SkipLink />
          <SiteNav />
          {/* One content width for the whole site, shared with the nav bar (SiteNav) - pages must not set their own. */}
          <div id={CONTENT_ID} tabIndex={-1} className="mx-auto w-full max-w-5xl flex-1 px-4 focus:outline-none">
            {children}
          </div>
          <Footer />
        </LocaleProvider>
      </body>
    </html>
  );
}
