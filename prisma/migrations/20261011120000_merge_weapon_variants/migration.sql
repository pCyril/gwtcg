-- Weapons no longer come in four quality variants (WHITE/BLUE/PURPLE/GOLD):
-- every weapon is now a single card (variantKey DEFAULT) with one rarity.
--
-- Players must not lose cards, so every copy someone owns of a BLUE, PURPLE or
-- GOLD variant is first re-pointed at the WHITE card of the same weapon (copies
-- of different variants simply become copies of the same card); only then are
-- the now-empty variant cards deleted, and the WHITE card becomes the weapon's
-- DEFAULT card. Rarities are recomputed afterwards (admin "Recompute rarities"
-- button / `npm run rarity:recompute`); until then merged weapons read Common.

-- 1) Re-point owned copies at the surviving card of the same weapon.
UPDATE "CardInstance" AS ci
SET "cardId" = keep.id
FROM "Card" AS old
JOIN "Card" AS keep
  ON keep."wikiPageId" = old."wikiPageId"
 AND keep.family = 'WEAPON'
 AND keep."variantKey" = 'WHITE'
WHERE ci."cardId" = old.id
  AND old.family = 'WEAPON'
  AND old."variantKey" IN ('BLUE', 'PURPLE', 'GOLD');

-- 2) A rarity an admin set by hand on any variant carries over to the survivor.
UPDATE "Card" AS keep
SET rarity = locked.rarity, "rarityLocked" = true
FROM (
  SELECT DISTINCT ON ("wikiPageId") "wikiPageId", rarity
  FROM "Card"
  WHERE family = 'WEAPON' AND "rarityLocked" = true AND "variantKey" IN ('BLUE', 'PURPLE', 'GOLD')
  ORDER BY "wikiPageId", rarity
) AS locked
WHERE keep."wikiPageId" = locked."wikiPageId"
  AND keep.family = 'WEAPON'
  AND keep."variantKey" = 'WHITE';

-- 3) Drop the variant cards - only those whose weapon has a surviving WHITE card,
--    so a copy can never be left pointing at a deleted row.
DELETE FROM "Card" AS old
WHERE old.family = 'WEAPON'
  AND old."variantKey" IN ('BLUE', 'PURPLE', 'GOLD')
  AND EXISTS (
    SELECT 1 FROM "Card" AS keep
    WHERE keep."wikiPageId" = old."wikiPageId" AND keep.family = 'WEAPON' AND keep."variantKey" = 'WHITE'
  );

-- 4) The survivor becomes the weapon's single DEFAULT card.
UPDATE "Card"
SET "variantKey" = 'DEFAULT'
WHERE family = 'WEAPON' AND "variantKey" = 'WHITE'
  AND NOT EXISTS (
    SELECT 1 FROM "Card" AS other
    WHERE other."wikiPageId" = "Card"."wikiPageId" AND other."variantKey" = 'DEFAULT'
  );
