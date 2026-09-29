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
    date: "2026-09-29",
    fr: [
      "Un compte invité n'est désormais créé qu'à l'ouverture de ton premier booster, plutôt qu'à ta simple arrivée sur le site.",
      "En filtrant le classeur par « Compétence », tu peux maintenant affiner par profession grâce à des chips multi-sélection.",
      "Le compteur du classeur (X / Y cartes uniques) tient maintenant compte des filtres actifs pour le total, pas seulement pour ce que tu possèdes.",
      "Tu peux désormais partager ta collection : un bouton « Partager ma collection » copie un lien public en lecture seule vers ton classeur.",
      "Le classeur (et sa version partagée) chargent maintenant les cartes par pages de 100 au défilement, avec le numéro de page conservé dans l'URL.",
      "Les cartes s'affichent maintenant sur 2 colonnes sur mobile au lieu d'une seule, pour éviter qu'elles ne soient trop larges.",
      "Corrigé : les boosters standard ne tiraient jamais de cartes Lieu ou Héros/PNJ, elles sont maintenant bien dans le pool.",
      "Ajout des familles de cartes Objet (377 cartes : matériaux, miniatures, objets de quête, clés, monnaies, consommables) et Lore (16 cartes), synchronisées depuis le wiki.",
      "En consultant la collection partagée de quelqu'un, un bouton « Proposer un échange » apparaît maintenant sur chaque carte, et pré-remplit directement l'offre de cette personne avec la carte souhaitée.",
      "Les comptes invités ne peuvent plus proposer ni recevoir d'échanges - il faut créer un compte pour échanger des cartes.",
      "Ajout d'un classement des joueurs qui ont ouvert le plus de boosters sur l'accueil (depuis le début / 24h glissantes).",
    ],
    en: [
      "A guest account is now only created when you open your first booster, rather than the moment you land on the site.",
      "When filtering the binder by \"Skill\", you can now further narrow it down by profession using multi-select chips.",
      "The binder's counter (X / Y unique cards) now applies active filters to the total too, not just to what you own.",
      "You can now share your collection: a \"Share my collection\" button copies a public, read-only link to your binder.",
      "The binder (and its shared view) now load cards in pages of 100 as you scroll, with the page number kept in the URL.",
      "Cards now display in 2 columns on mobile instead of 1, so they no longer look oversized.",
      "Fixed: standard boosters never drew Location or Hero/NPC cards - they're now properly in the pool.",
      "Added the Item (377 cards: materials, miniatures, quest items, keys, currencies, consumables) and Lore (16 cards) card families, synced from the wiki.",
      "When browsing someone else's shared collection, a \"Propose a trade\" button now appears on each card, and pre-fills their offer with the exact card you wanted.",
      "Guest accounts can no longer propose or receive trades - you need an account to trade cards.",
      "Added a top booster-openers leaderboard to the home page (all time / last 24h).",
    ],
  },
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
