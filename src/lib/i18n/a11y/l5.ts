// Accessibility strings added by the RGAA remediation (lot l5). Merged into translations.ts.
export const a11yL5 = {
  fr: {
    "auction.bidLabel": "Ta mise (ecto)",
    "auction.bidMinHint": "Minimum : {amount} ecto, nombre entier.",
    "auction.bidErrorHint": "Indique une mise d'au moins {amount} ecto (nombre entier).",
    "auction.bidConfirm":
      "Placer une enchère de {amount} ecto sur « {title} » ? Une enchère placée ne peut pas être retirée.",
    "auction.buyoutConfirm":
      "Acheter immédiatement « {title} » pour {amount} ecto ? L'enchère sera close et tu devras remettre les ectos au vendeur en jeu.",
    "auction.cancelAuctionConfirm": "Annuler cette enchère ? Elle sera retirée du marché et tu garderas la carte.",
    "auction.confirmHandoffConfirm":
      "Confirmer que tu as bien reçu {amount} ecto en jeu ? La carte sera transférée définitivement à l'acheteur.",
    "auction.cancelHandoffConfirm":
      "Déclarer que l'acheteur n'a pas payé ? La vente sera annulée et tu garderas la carte.",
    "auction.bidPlaced": "Enchère de {amount} ecto placée.",
    "auction.actionDone": "C'est fait. Statut de l'enchère : {status}.",
    "sell.cancelInfo":
      "Tu pourras annuler la vente depuis la page de l'enchère tant qu'aucune enchère n'a été placée. Les prix ne sont plus modifiables une fois la vente lancée.",
  },
  en: {
    "auction.bidLabel": "Your bid (ecto)",
    "auction.bidMinHint": "Minimum: {amount} ecto, whole number.",
    "auction.bidErrorHint": "Enter a bid of at least {amount} ecto (whole number).",
    "auction.bidConfirm": "Place a {amount} ecto bid on \"{title}\"? A bid can't be withdrawn once placed.",
    "auction.buyoutConfirm":
      "Buy \"{title}\" now for {amount} ecto? The auction will close and you'll need to hand the ecto to the seller in-game.",
    "auction.cancelAuctionConfirm": "Cancel this auction? It will be removed from the market and you'll keep the card.",
    "auction.confirmHandoffConfirm":
      "Confirm you've received {amount} ecto in-game? The card will be permanently transferred to the buyer.",
    "auction.cancelHandoffConfirm": "Report that the buyer never paid? The sale will be cancelled and you'll keep the card.",
    "auction.bidPlaced": "{amount} ecto bid placed.",
    "auction.actionDone": "Done. Auction status: {status}.",
    "sell.cancelInfo":
      "You can cancel the sale from the auction page as long as no bid has been placed. Prices can't be changed once the auction is live.",
  },
} as const;
