import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { getServerLocale, pageTitle } from "@/lib/i18n/serverLocale";
import type { Locale } from "@/lib/i18n/translations";
import { CONTACT_EMAIL } from "@/lib/contact";

export async function generateMetadata(): Promise<Metadata> {
  return { title: await pageTitle("legal.title") };
}

const mail = (
  <a href={`mailto:${CONTACT_EMAIL}`} className="underline hover:text-neutral-100">
    {CONTACT_EMAIL}
  </a>
);
const contactLink = (label: string) => (
  <Link href="/contact" className="underline hover:text-neutral-100">
    {label}
  </Link>
);

interface Section {
  id: string;
  title: string;
  body: ReactNode;
}

// Legal notice (LCEN art. 6) + personal data and cookies. Long-form legal text lives here rather than
// in translations.ts: it is page content, kept in both languages side by side.
function sections(locale: Locale): Section[] {
  if (locale === "en") {
    return [
      {
        id: "publisher",
        title: "Publisher",
        body: (
          <>
            <p>GWTCG is published by Cyril Perraud, a private individual, on a non-commercial basis. He is also the publication director.</p>
            <p>Contact: {mail}</p>
          </>
        ),
      },
      {
        id: "host",
        title: "Hosting",
        body: (
          <p>
            OVH SAS, 2 rue Kellermann, 59100 Roubaix, France. Phone: 1007 (from France).
          </p>
        ),
      },
      {
        id: "data",
        title: "Personal data",
        body: (
          <>
            <p>
              Playing creates an account automatically. The site stores: a pseudo, and, if you create a permanent account, your
              email address and a hash of your password (never the password itself); your optional in-game character name and
              starting profession; your collection, booster openings, trades, auctions, bids and the card illustrations you
              submit.
            </p>
            <p>
              This data is only used to run the game (your account, your collection, trades and the auction house). It is not
              sold, shared with third parties or used for advertising. It is kept as long as your account exists.
            </p>
            <p>
              You can ask to access, correct or delete your data, or your whole account, by writing to {mail}. You can also lodge
              a complaint with the CNIL (cnil.fr).
            </p>
          </>
        ),
      },
      {
        id: "cookies",
        title: "Cookies",
        body: (
          <>
            <p>The site only uses two cookies, both strictly necessary, so no consent banner is needed:</p>
            <ul className="ml-5 flex list-disc flex-col gap-1">
              <li>
                <code>gm_session</code>: keeps you signed in to your account (1 year).
              </li>
              <li>
                <code>gm_locale</code>: remembers the language you chose (1 year).
              </li>
            </ul>
            <p>No tracking, analytics or advertising cookie is used.</p>
          </>
        ),
      },
      {
        id: "ip",
        title: "Intellectual property",
        body: (
          <>
            <p>
              GWTCG is an unofficial fan project, not affiliated with ArenaNet or NCSoft. Guild Wars is a trademark of ArenaNet /
              NCSoft.
            </p>
            <p>Card texts are adapted from the Guild Wars Wiki under the GNU Free Documentation License.</p>
            <p>
              The site&apos;s source code is published under the MIT License on{" "}
              <a
                href="https://github.com/pCyril/gwtcg"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-neutral-100"
              >
                GitHub (opens in a new tab)
              </a>
              .
            </p>
          </>
        ),
      },
      {
        id: "accessibility",
        title: "Accessibility",
        body: <p>If you can&apos;t access some content or feature of the site, let me know through the {contactLink("contact page")}.</p>,
      },
    ];
  }
  return [
    {
      id: "editeur",
      title: "Éditeur",
      body: (
        <>
          <p>GWTCG est édité par Cyril Perraud, particulier, à titre non professionnel et non commercial. Il en est aussi le directeur de la publication.</p>
          <p>Contact : {mail}</p>
        </>
      ),
    },
    {
      id: "hebergeur",
      title: "Hébergeur",
      body: <p>OVH SAS, 2 rue Kellermann, 59100 Roubaix, France. Téléphone : 1007 (depuis la France).</p>,
    },
    {
      id: "donnees",
      title: "Données personnelles",
      body: (
        <>
          <p>
            Jouer crée automatiquement un compte. Le site enregistre : un pseudo et, si tu crées un compte permanent, ton adresse
            e-mail et une empreinte (hash) de ton mot de passe, jamais le mot de passe lui-même ; le nom de ton personnage en jeu et
            ta profession de départ si tu les renseignes ; ta collection, tes ouvertures de boosters, tes échanges, tes enchères et
            les illustrations de cartes que tu proposes.
          </p>
          <p>
            Ces données servent uniquement au fonctionnement du jeu (ton compte, ta collection, les échanges et le Kamadan). Elles
            ne sont ni vendues, ni transmises à des tiers, ni utilisées à des fins publicitaires. Elles sont conservées tant que ton
            compte existe.
          </p>
          <p>
            Tu peux demander l&apos;accès à tes données, leur rectification ou leur suppression, ou la suppression de ton compte, en
            écrivant à {mail}. Tu peux aussi adresser une réclamation à la CNIL (cnil.fr).
          </p>
        </>
      ),
    },
    {
      id: "cookies",
      title: "Cookies",
      body: (
        <>
          <p>Le site n&apos;utilise que deux cookies, strictement nécessaires à son fonctionnement ; aucun consentement n&apos;est donc requis :</p>
          <ul className="ml-5 flex list-disc flex-col gap-1">
            <li>
              <code>gm_session</code> : te garde connecté à ton compte (1 an).
            </li>
            <li>
              <code>gm_locale</code> : mémorise la langue choisie (1 an).
            </li>
          </ul>
          <p>Aucun cookie de mesure d&apos;audience, de traçage ou de publicité n&apos;est utilisé.</p>
        </>
      ),
    },
    {
      id: "propriete",
      title: "Propriété intellectuelle",
      body: (
        <>
          <p>
            GWTCG est un projet de fan non officiel, non affilié à ArenaNet ou NCSoft. Guild Wars est une marque d&apos;ArenaNet /
            NCSoft.
          </p>
          <p>Les textes des cartes sont adaptés du Guild Wars Wiki, sous licence GNU FDL (GNU Free Documentation License).</p>
          <p>
            Le code source du site est publié sous licence MIT sur{" "}
            <a
              href="https://github.com/pCyril/gwtcg"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-neutral-100"
            >
              GitHub (nouvel onglet)
            </a>
            .
          </p>
        </>
      ),
    },
    {
      id: "accessibilite",
      title: "Accessibilité",
      body: (
        <p>Si tu n&apos;arrives pas à accéder à un contenu ou à une fonctionnalité du site, signale-le via la {contactLink("page de contact")}.</p>
      ),
    },
  ];
}

export default async function LegalNoticePage() {
  const locale = await getServerLocale();
  return (
    <main className="flex flex-col gap-8 py-10">
      <h1 className="text-3xl font-bold tracking-tight">{locale === "en" ? "Legal notice" : "Mentions légales"}</h1>
      {sections(locale).map((s) => (
        <section key={s.id} aria-labelledby={`legal-${s.id}`} className="flex flex-col gap-2 text-neutral-300">
          <h2 id={`legal-${s.id}`} className="text-xl font-semibold text-neutral-100">
            {s.title}
          </h2>
          {s.body}
        </section>
      ))}
    </main>
  );
}
