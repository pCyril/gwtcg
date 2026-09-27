-- CreateEnum
CREATE TYPE "CardFamily" AS ENUM ('SKILL', 'BOSS', 'HERO_NPC', 'LOCATION', 'ITEM', 'LORE');

-- CreateEnum
CREATE TYPE "Rarity" AS ENUM ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC');

-- CreateEnum
CREATE TYPE "CardVariant" AS ENUM ('NORMAL', 'SHINY');

-- CreateEnum
CREATE TYPE "AcquisitionSource" AS ENUM ('BOOSTER', 'TRADE', 'AUCTION');

-- CreateEnum
CREATE TYPE "BoosterType" AS ENUM ('STANDARD', 'CAMPAIGN', 'PROFESSION', 'BOSS_CHEST', 'ZAISHEN');

-- CreateTable
CREATE TABLE "WikiPage" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "revisionId" INTEGER NOT NULL,
    "categories" TEXT[],
    "extract" TEXT NOT NULL,
    "backlinks" INTEGER NOT NULL DEFAULT 0,
    "contentLength" INTEGER NOT NULL DEFAULT 0,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WikiPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "wikiPageId" TEXT NOT NULL,
    "family" "CardFamily" NOT NULL,
    "campaign" TEXT,
    "profession" TEXT,
    "attributes" JSONB NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rarity" "Rarity" NOT NULL DEFAULT 'COMMON',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardInstance" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "variant" "CardVariant" NOT NULL DEFAULT 'NORMAL',
    "source" "AcquisitionSource" NOT NULL,
    "obtainedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "boosterOpeningId" TEXT,

    CONSTRAINT "CardInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "pseudo" TEXT NOT NULL,
    "email" TEXT,
    "discordId" TEXT,
    "isGuest" BOOLEAN NOT NULL DEFAULT true,
    "gold" INTEGER NOT NULL DEFAULT 0,
    "boostersStored" INTEGER NOT NULL DEFAULT 1,
    "lastBoosterRefresh" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startingProfession" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoosterOpening" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "BoosterType" NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BoosterOpening_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WikiPage_title_key" ON "WikiPage"("title");

-- CreateIndex
CREATE INDEX "WikiPage_syncedAt_idx" ON "WikiPage"("syncedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Card_wikiPageId_key" ON "Card"("wikiPageId");

-- CreateIndex
CREATE INDEX "Card_family_idx" ON "Card"("family");

-- CreateIndex
CREATE INDEX "Card_rarity_idx" ON "Card"("rarity");

-- CreateIndex
CREATE INDEX "Card_campaign_idx" ON "Card"("campaign");

-- CreateIndex
CREATE INDEX "Card_profession_idx" ON "Card"("profession");

-- CreateIndex
CREATE INDEX "CardInstance_ownerId_idx" ON "CardInstance"("ownerId");

-- CreateIndex
CREATE INDEX "CardInstance_cardId_idx" ON "CardInstance"("cardId");

-- CreateIndex
CREATE UNIQUE INDEX "User_sessionToken_key" ON "User"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_pseudo_key" ON "User"("pseudo");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_discordId_key" ON "User"("discordId");

-- CreateIndex
CREATE INDEX "BoosterOpening_userId_idx" ON "BoosterOpening"("userId");

-- CreateIndex
CREATE INDEX "LedgerEntry_userId_idx" ON "LedgerEntry"("userId");

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_wikiPageId_fkey" FOREIGN KEY ("wikiPageId") REFERENCES "WikiPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardInstance" ADD CONSTRAINT "CardInstance_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardInstance" ADD CONSTRAINT "CardInstance_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardInstance" ADD CONSTRAINT "CardInstance_boosterOpeningId_fkey" FOREIGN KEY ("boosterOpeningId") REFERENCES "BoosterOpening"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoosterOpening" ADD CONSTRAINT "BoosterOpening_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
