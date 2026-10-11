-- Remove the PvP weapons from the game: every weapon card whose wiki page title
-- starts with "PvP" (e.g. "PvP Longbow"), the copies players own of them, and
-- anything that points at those copies.
--
-- This is destructive on purpose (players who own them lose them) - take a
-- database backup before deploying. The wiki sync skips these titles from now on.

CREATE TEMP TABLE _pvp_cards AS
SELECT c.id AS card_id, c."wikiPageId" AS page_id
FROM "Card" AS c
JOIN "WikiPage" AS w ON w.id = c."wikiPageId"
WHERE c.family = 'WEAPON' AND w.title LIKE 'PvP%';

CREATE TEMP TABLE _pvp_instances AS
SELECT id FROM "CardInstance" WHERE "cardId" IN (SELECT card_id FROM _pvp_cards);

-- A pending trade that loses a card must be re-confirmed by both sides.
UPDATE "Trade"
SET "initiatorConfirmed" = false, "recipientConfirmed" = false
WHERE status = 'PENDING'
  AND id IN (SELECT "tradeId" FROM "TradeItem" WHERE "cardInstanceId" IN (SELECT id FROM _pvp_instances));

DELETE FROM "TradeItem" WHERE "cardInstanceId" IN (SELECT id FROM _pvp_instances);

-- Auctions on these copies (their bids go with them: Bid cascades from Auction).
DELETE FROM "Auction" WHERE "cardInstanceId" IN (SELECT id FROM _pvp_instances);

DELETE FROM "CardInstance" WHERE id IN (SELECT id FROM _pvp_instances);
DELETE FROM "Card" WHERE id IN (SELECT card_id FROM _pvp_cards);

-- The wiki pages too, unless community art was submitted for them.
DELETE FROM "WikiPage" AS w
WHERE w.id IN (SELECT page_id FROM _pvp_cards)
  AND NOT EXISTS (SELECT 1 FROM "ArtSubmission" AS a WHERE a."wikiPageId" = w.id)
  AND NOT EXISTS (SELECT 1 FROM "Card" AS c WHERE c."wikiPageId" = w.id);

DROP TABLE _pvp_instances;
DROP TABLE _pvp_cards;
