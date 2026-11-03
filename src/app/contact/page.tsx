import type { Metadata } from "next";
import { getServerLocale, pageTitle } from "@/lib/i18n/serverLocale";
import { t } from "@/lib/i18n/translations";
import { CONTACT_EMAIL } from "@/lib/contact";

export async function generateMetadata(): Promise<Metadata> {
  return { title: await pageTitle("contact.title") };
}

export default async function ContactPage() {
  const locale = await getServerLocale();
  return (
    <main className="flex flex-col gap-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">{t(locale, "contact.title")}</h1>

      <section className="flex flex-col gap-2">
        <p className="text-neutral-300">{t(locale, "contact.intro")}</p>
        <p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-lg underline hover:text-neutral-100">
            {CONTACT_EMAIL}
          </a>
        </p>
        <p className="text-sm text-neutral-400">{t(locale, "contact.emailNote")}</p>
      </section>

      <section aria-labelledby="contact-a11y" className="flex flex-col gap-2">
        <h2 id="contact-a11y" className="text-xl font-semibold">
          {t(locale, "contact.a11yTitle")}
        </h2>
        <p className="text-neutral-300">{t(locale, "contact.a11yBody")}</p>
      </section>
    </main>
  );
}
