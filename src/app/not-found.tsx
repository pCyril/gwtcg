import Link from "next/link";
import { getServerLocale } from "@/lib/i18n/serverLocale";
import { t } from "@/lib/i18n/translations";

// Shown for notFound() (e.g. an unknown /card/<id>) and for any URL that matches no route.
export default async function NotFound() {
  const locale = await getServerLocale();
  return (
    <main className="flex flex-col items-start gap-4 py-10">
      {/* not-found can't export metadata: React hoists this <title> into <head>. */}
      <title>{`${t(locale, "notFound.title")} - GWTCG`}</title>
      <h1 className="text-3xl font-bold tracking-tight">{t(locale, "notFound.title")}</h1>
      <p className="text-neutral-400">{t(locale, "notFound.body")}</p>
      <Link href="/" className="text-sm underline hover:text-neutral-100">
        {t(locale, "notFound.home")}
      </Link>
    </main>
  );
}
