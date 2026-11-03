// Accessibility strings added by the RGAA remediation (lot l2). Merged into translations.ts.
export const a11yL2 = {
  fr: {
    // TiltableCard: one-tap / keyboard alternative to the drag rotation
    "tilt.controls": "Faire pivoter la carte",
    "tilt.rotateLeft": "Tourner à gauche",
    "tilt.rotateRight": "Tourner à droite",
    "tilt.flip": "Retourner la carte",
    // BoosterOverlay: progress announced to screen readers
    "booster.a11y.opening": "Ouverture du booster…",
    "booster.a11y.progress": "Carte {n} sur {total} : {title}, {rarity}",
    "booster.a11y.done": "{count} cartes obtenues",
    // HomeClient: accessible name of the pack button
    "home.a11y.openStandardPack": "Ouvrir un booster standard",
    // ArtSubmissionForm: label and instructions shown before the fields
    "art.fileLabel": "Illustration à envoyer (obligatoire)",
    "art.fileHint": "Formats acceptés : JPEG, PNG ou WebP, 8 Mo maximum.",
    "art.requiredMark": "(obligatoire)",
  },
  en: {
    "tilt.controls": "Rotate the card",
    "tilt.rotateLeft": "Rotate left",
    "tilt.rotateRight": "Rotate right",
    "tilt.flip": "Flip the card",
    "booster.a11y.opening": "Opening the booster…",
    "booster.a11y.progress": "Card {n} of {total}: {title}, {rarity}",
    "booster.a11y.done": "{count} cards obtained",
    "home.a11y.openStandardPack": "Open a standard booster",
    "art.fileLabel": "Illustration to upload (required)",
    "art.fileHint": "Accepted formats: JPEG, PNG or WebP, 8 MB max.",
    "art.requiredMark": "(required)",
  },
} as const;
