/**
 * Hand-curated, player-facing changelog - newest first. Grounded in real
 * commits but written for players, not verbatim commit messages (internal-only
 * changes like CI/CD plumbing or dependency fixes are left out).
 */
export interface ChangelogEntry {
  date: string; // YYYY-MM-DD
  fr: string[];
  en: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-09-28",
    fr: [
      "Ajout de cette page pour suivre publiquement l'évolution du projet.",
      "Le classeur regroupe désormais chaque carte en une seule tuile, avec un badge indiquant le nombre d'exemplaires possédés, et peut être trié par famille, rareté ou nombre d'exemplaires.",
      "Les cartes tout juste tirées d'un booster sont mises en évidence quand elles sont nouvelles pour toi.",
      "Ajout d'une jauge de complétion des illustrations communautaires et d'un classement des meilleurs illustrateurs sur l'accueil.",
      "Ajout de la famille de cartes « Lieu », synchronisée depuis le wiki.",
      "Les filtres du classeur (famille, rareté) restent maintenant dans l'URL.",
      "Les comptes invités sont invités à créer un compte juste après l'ouverture d'un booster, pour sécuriser leur collection.",
      "Le Kamadan (marché entre joueurs) est temporairement masqué, le temps d'en retravailler le fonctionnement.",
      "Les boosters se rechargent maintenant toutes les heures (au lieu de 12h).",
      "Ajout d'une page de statistiques pour les administrateurs.",
      "Les illustrations proposées par un administrateur sont désormais approuvées automatiquement.",
      "Nettoyage de textes de cartes encore partiellement en français (armes, boss, héros, compétences).",
    ],
    en: [
      "Added this page to publicly track the project's progress.",
      "The binder now groups each card into a single tile, with a badge showing how many copies you own, and can be sorted by family, rarity, or number of copies.",
      "Cards you just pulled from a booster are now highlighted when they're new to you.",
      "Added a community-illustration completion gauge and a top-illustrators leaderboard to the home page.",
      "Added the Location card family, synced from the wiki.",
      "Collection filters (family, rarity) now stay in the URL.",
      "Guest accounts are now prompted to create an account right after opening a booster, to secure their collection.",
      "The Kamadan (player marketplace) is temporarily hidden while its design gets rethought.",
      "Boosters now refill every hour (instead of every 12h).",
      "Added a stats page for admins.",
      "Illustrations submitted by an admin are now auto-approved.",
      "Cleaned up card text that was still partly in French (weapons, bosses, heroes, skills).",
    ],
  },
  {
    date: "2026-09-27",
    fr: [
      "Lancement de GWTCG : ouverture de boosters, classeur, échanges et enchères entre joueurs.",
      "Rebranding du projet en GWTCG (auparavant GuildMasters).",
      "Le nom des cartes n'affiche plus le niveau de qualité de l'arme en double, la couleur de la carte le montre déjà.",
      "Ajout du support PWA (installable sur mobile et bureau).",
    ],
    en: [
      "GWTCG launches: booster openings, a binder, trading, and player auctions.",
      "Rebranded the project to GWTCG (previously GuildMasters).",
      "Card titles no longer repeat the weapon's quality tier - the card's color already shows it.",
      "Added PWA support (installable on mobile and desktop).",
    ],
  },
];
