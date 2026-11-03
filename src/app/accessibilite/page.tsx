import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { getServerLocale, pageTitle } from "@/lib/i18n/serverLocale";
import type { Locale } from "@/lib/i18n/translations";
import { CONTACT_EMAIL } from "@/lib/contact";

export async function generateMetadata(): Promise<Metadata> {
  return { title: await pageTitle("a11yStatement.title") };
}

const SITE_URL = "https://gwtcg.net";
const AUDIT_DATE = { fr: "3 novembre 2026", en: "November 3, 2026" };

const mail = (
  <a href={`mailto:${CONTACT_EMAIL}`} className="underline hover:text-neutral-100">
    {CONTACT_EMAIL}
  </a>
);
const ext = (href: string, label: string) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="underline hover:text-neutral-100">
    {label}
  </a>
);
const internal = (href: string, label: string) => (
  <Link href={href} className="underline hover:text-neutral-100">
    {label}
  </Link>
);
const list = (items: ReactNode[]) => (
  <ul className="ml-5 flex list-disc flex-col gap-1">
    {items.map((item, i) => (
      <li key={i}>{item}</li>
    ))}
  </ul>
);

interface Section {
  id: string;
  title: string;
  body: ReactNode;
}

// Accessibility statement (article 47 of law 2005-102, RGAA 4.1.2 model), from the internal audit
// of 2026-11-03 (run-1). Update the figures and lists here whenever the audit is re-run.
function sections(locale: Locale): { intro: ReactNode; sections: Section[] } {
  if (locale === "en") {
    return {
      intro: (
        <p>
          Cyril Perraud is committed to making GWTCG accessible, in accordance with article 47 of French law no. 2005-102 of
          February 11, 2005. This accessibility statement applies to the GWTCG website ({SITE_URL}).
        </p>
      ),
      sections: [
        {
          id: "status",
          title: "Compliance status",
          body: (
            <p>
              GWTCG is <strong>partially compliant</strong> with the French accessibility standard RGAA version 4.1.2 (equivalent
              to WCAG 2.1 level AA), because of the non-compliant content listed below.
            </p>
          ),
        },
        {
          id: "results",
          title: "Test results",
          body: (
            <>
              <p>The internal compliance audit carried out on {AUDIT_DATE.en} on a sample of 12 pages shows that:</p>
              {list([
                "96.30% of the RGAA 4.1.2 criteria are met (52 compliant criteria out of 54 applicable);",
                "the average compliance rate per page is 98.15%.",
              ])}
              <p>
                8 criteria are still being assessed (relevance of some labels, text alternatives and symbols, and a test with a
                screen reader). They are not counted in these figures.
              </p>
            </>
          ),
        },
        {
          id: "non-accessible",
          title: "Non-accessible content",
          body: (
            <>
              <h3 className="font-semibold text-neutral-100">Non-compliance</h3>
              {list([
                "Criterion 3.1: on card tiles, the rarity of a card is only conveyed by colour (border and diamond).",
                "Criterion 10.12: on card tiles, long titles and the campaign name are cut off when text spacing is increased.",
              ])}
              <h3 className="font-semibold text-neutral-100">Disproportionate burden exemptions</h3>
              <p>None.</p>
              <h3 className="font-semibold text-neutral-100">Content not subject to the accessibility obligation</h3>
              {list(["Administration pages (illustration moderation, statistics), reserved for administrators."])}
            </>
          ),
        },
        {
          id: "made",
          title: "Preparation of this statement",
          body: (
            <>
              <p>This statement was prepared on {AUDIT_DATE.en}.</p>
              <p>Technologies used: HTML5, CSS (Tailwind CSS), JavaScript, React, Next.js.</p>
              <p>
                Test environment: Google Chrome, automated checks and keyboard navigation at widths from 320 to 1280 pixels, 200%
                zoom and increased text spacing. No test with a screen reader has been carried out yet.
              </p>
              <p>Tools: axe-core, eslint-plugin-jsx-a11y, computed colour contrast measurements.</p>
              <p>
                Audited pages: home (including sign-in and booster opening), my collection (including the card detail window), a
                player&apos;s public collection, a shared card, the Kamadan, listing a card, an auction, my auctions, trades, a
                trade window, drop rates, changelog.
              </p>
            </>
          ),
        },
        {
          id: "feedback",
          title: "Feedback and contact",
          body: (
            <p>
              If you can&apos;t access some content or service, contact the site publisher at {mail} (or through the{" "}
              {internal("/contact", "contact page")}) to be directed to an accessible alternative or to get the content in
              another form.
            </p>
          ),
        },
        {
          id: "remedies",
          title: "Remedies",
          body: (
            <>
              <p>
                If you reported an accessibility issue that prevents you from accessing some content or service and did not get
                a satisfactory answer, you can:
              </p>
              {list([
                <>write a message to the Défenseur des droits ({ext("https://formulaire.defenseurdesdroits.fr/", "online form, opens in a new tab")});</>,
                <>contact the Défenseur des droits delegate in your region ({ext("https://www.defenseurdesdroits.fr/carte-des-delegues", "list of delegates, opens in a new tab")});</>,
                "send a letter by post (free, no stamp needed): Défenseur des droits, Libre réponse 71120, 75342 Paris CEDEX 07, France.",
              ])}
            </>
          ),
        },
      ],
    };
  }
  return {
    intro: (
      <p>
        Cyril Perraud s&apos;engage à rendre GWTCG accessible, conformément à l&apos;article 47 de la loi n° 2005-102 du 11
        février 2005. Cette déclaration d&apos;accessibilité s&apos;applique au site GWTCG ({SITE_URL}).
      </p>
    ),
    sections: [
      {
        id: "etat",
        title: "État de conformité",
        body: (
          <p>
            GWTCG est <strong>partiellement conforme</strong> avec le référentiel général d&apos;amélioration de
            l&apos;accessibilité (RGAA), version 4.1.2, en raison des non-conformités énumérées ci-dessous.
          </p>
        ),
      },
      {
        id: "resultats",
        title: "Résultats des tests",
        body: (
          <>
            <p>L&apos;audit de conformité interne réalisé le {AUDIT_DATE.fr} sur un échantillon de 12 pages révèle que :</p>
            {list([
              "96,30 % des critères du RGAA version 4.1.2 sont respectés (52 critères conformes sur 54 critères applicables) ;",
              "le taux moyen de conformité par page est de 98,15 %.",
            ])}
            <p>
              8 critères sont en cours d&apos;évaluation (pertinence de certains intitulés, alternatives textuelles et symboles,
              test avec un lecteur d&apos;écran). Ils n&apos;entrent pas dans ces taux.
            </p>
          </>
        ),
      },
      {
        id: "non-accessibles",
        title: "Contenus non accessibles",
        body: (
          <>
            <h3 className="font-semibold text-neutral-100">Non-conformités</h3>
            {list([
              "Critère 3.1 : sur les tuiles de cartes, la rareté d'une carte n'est indiquée que par la couleur (bordure et losange).",
              "Critère 10.12 : sur les tuiles de cartes, les titres longs et le nom de la campagne sont coupés quand l'espacement du texte est augmenté.",
            ])}
            <h3 className="font-semibold text-neutral-100">Dérogations pour charge disproportionnée</h3>
            <p>Aucune.</p>
            <h3 className="font-semibold text-neutral-100">Contenus non soumis à l&apos;obligation d&apos;accessibilité</h3>
            {list(["Pages d'administration (modération des illustrations, statistiques), réservées aux administrateurs."])}
          </>
        ),
      },
      {
        id: "etablissement",
        title: "Établissement de cette déclaration d'accessibilité",
        body: (
          <>
            <p>Cette déclaration a été établie le {AUDIT_DATE.fr}.</p>
            <p>Technologies utilisées pour la réalisation du site : HTML5, CSS (Tailwind CSS), JavaScript, React, Next.js.</p>
            <p>
              Environnement de test : Google Chrome, vérifications automatisées et navigation au clavier, largeurs de 320 à 1280
              pixels, zoom à 200 % et espacement du texte augmenté. Aucun test avec un lecteur d&apos;écran n&apos;a encore été
              réalisé.
            </p>
            <p>Outils pour évaluer l&apos;accessibilité : axe-core, eslint-plugin-jsx-a11y, mesures de contraste des couleurs.</p>
            <p>
              Pages ayant fait l&apos;objet de la vérification de conformité : accueil (avec connexion et ouverture de booster),
              ma collection (avec la fenêtre de détail d&apos;une carte), collection publique d&apos;un joueur, carte partagée, le
              Kamadan, mise en vente d&apos;une carte, détail d&apos;une enchère, mes enchères, échanges, fenêtre d&apos;échange,
              taux de drop, journal des mises à jour.
            </p>
          </>
        ),
      },
      {
        id: "retour",
        title: "Retour d'information et contact",
        body: (
          <p>
            Si vous n&apos;arrivez pas à accéder à un contenu ou à un service, vous pouvez contacter l&apos;éditeur du site à{" "}
            {mail} (ou via la {internal("/contact", "page de contact")}) pour être orienté vers une alternative accessible ou
            obtenir le contenu sous une autre forme.
          </p>
        ),
      },
      {
        id: "recours",
        title: "Voies de recours",
        body: (
          <>
            <p>
              Si vous avez signalé à l&apos;éditeur un défaut d&apos;accessibilité qui vous empêche d&apos;accéder à un contenu
              ou à un service et que vous n&apos;avez pas obtenu de réponse satisfaisante, vous pouvez :
            </p>
            {list([
              <>écrire un message au Défenseur des droits ({ext("https://formulaire.defenseurdesdroits.fr/", "formulaire en ligne, nouvel onglet")}) ;</>,
              <>contacter le délégué du Défenseur des droits dans votre région ({ext("https://www.defenseurdesdroits.fr/carte-des-delegues", "liste des délégués, nouvel onglet")}) ;</>,
              "envoyer un courrier par la poste (gratuit, ne pas mettre de timbre) : Défenseur des droits, Libre réponse 71120, 75342 Paris CEDEX 07.",
            ])}
          </>
        ),
      },
    ],
  };
}

export default async function AccessibilityStatementPage() {
  const locale = await getServerLocale();
  const { intro, sections: items } = sections(locale);
  return (
    <main className="flex flex-col gap-8 py-10">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold tracking-tight">
          {locale === "en" ? "Accessibility statement" : "Déclaration d'accessibilité"}
        </h1>
        <div className="text-neutral-300">{intro}</div>
      </div>
      {items.map((s) => (
        <section key={s.id} aria-labelledby={`a11y-${s.id}`} className="flex flex-col gap-2 text-neutral-300">
          <h2 id={`a11y-${s.id}`} className="text-xl font-semibold text-neutral-100">
            {s.title}
          </h2>
          {s.body}
        </section>
      ))}
    </main>
  );
}
