-- CreateEnum
CREATE TYPE "public"."ArtSubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."AuctionStatus" AS ENUM ('ACTIVE', 'AWAITING_HANDOFF', 'COMPLETED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."TradeSide" AS ENUM ('INITIATOR', 'RECIPIENT');

-- CreateEnum
CREATE TYPE "public"."TradeStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "public"."CardFamily" ADD VALUE 'WEAPON';

-- DropForeignKey
ALTER TABLE "public"."LedgerEntry" DROP CONSTRAINT "LedgerEntry_userId_fkey";

-- DropIndex
DROP INDEX "public"."Card_wikiPageId_key";

-- DropIndex
DROP INDEX "public"."User_discordId_key";

-- AlterTable
ALTER TABLE "public"."Card" ADD COLUMN     "variantKey" TEXT NOT NULL DEFAULT 'DEFAULT';

-- AlterTable
ALTER TABLE "public"."CardInstance" DROP COLUMN "variant",
ADD COLUMN     "discardedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "boostersStored",
DROP COLUMN "discordId",
DROP COLUMN "gold",
DROP COLUMN "lastBoosterRefresh",
ADD COLUMN     "gameCharacterName" TEXT,
ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "passwordHash" TEXT;

-- AlterTable
ALTER TABLE "public"."WikiPage" DROP COLUMN "imageUrl",
ADD COLUMN     "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- DropTable
DROP TABLE "public"."LedgerEntry";

-- DropEnum
DROP TYPE "public"."CardVariant";

-- CreateTable
CREATE TABLE "public"."ArtSubmission" (
    "id" TEXT NOT NULL,
    "wikiPageId" TEXT NOT NULL,
    "submitterId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "status" "public"."ArtSubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,

    CONSTRAINT "ArtSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Auction" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "cardInstanceId" TEXT NOT NULL,
    "startingPrice" INTEGER NOT NULL,
    "buyoutPrice" INTEGER,
    "status" "public"."AuctionStatus" NOT NULL DEFAULT 'ACTIVE',
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Auction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Bid" (
    "id" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "bidderId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Trade" (
    "id" TEXT NOT NULL,
    "initiatorId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "status" "public"."TradeStatus" NOT NULL DEFAULT 'PENDING',
    "initiatorConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "recipientConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TradeItem" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "cardInstanceId" TEXT NOT NULL,
    "side" "public"."TradeSide" NOT NULL,

    CONSTRAINT "TradeItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArtSubmission_status_idx" ON "public"."ArtSubmission"("status" ASC);

-- CreateIndex
CREATE INDEX "ArtSubmission_submitterId_idx" ON "public"."ArtSubmission"("submitterId" ASC);

-- CreateIndex
CREATE INDEX "ArtSubmission_wikiPageId_idx" ON "public"."ArtSubmission"("wikiPageId" ASC);

-- CreateIndex
CREATE INDEX "Auction_cardInstanceId_idx" ON "public"."Auction"("cardInstanceId" ASC);

-- CreateIndex
CREATE INDEX "Auction_endsAt_idx" ON "public"."Auction"("endsAt" ASC);

-- CreateIndex
CREATE INDEX "Auction_sellerId_idx" ON "public"."Auction"("sellerId" ASC);

-- CreateIndex
CREATE INDEX "Auction_status_idx" ON "public"."Auction"("status" ASC);

-- CreateIndex
CREATE INDEX "Bid_auctionId_idx" ON "public"."Bid"("auctionId" ASC);

-- CreateIndex
CREATE INDEX "Bid_bidderId_idx" ON "public"."Bid"("bidderId" ASC);

-- CreateIndex
CREATE INDEX "Trade_initiatorId_idx" ON "public"."Trade"("initiatorId" ASC);

-- CreateIndex
CREATE INDEX "Trade_recipientId_idx" ON "public"."Trade"("recipientId" ASC);

-- CreateIndex
CREATE INDEX "Trade_status_idx" ON "public"."Trade"("status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "TradeItem_tradeId_cardInstanceId_key" ON "public"."TradeItem"("tradeId" ASC, "cardInstanceId" ASC);

-- CreateIndex
CREATE INDEX "TradeItem_tradeId_idx" ON "public"."TradeItem"("tradeId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Card_wikiPageId_variantKey_key" ON "public"."Card"("wikiPageId" ASC, "variantKey" ASC);

-- AddForeignKey
ALTER TABLE "public"."ArtSubmission" ADD CONSTRAINT "ArtSubmission_submitterId_fkey" FOREIGN KEY ("submitterId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ArtSubmission" ADD CONSTRAINT "ArtSubmission_wikiPageId_fkey" FOREIGN KEY ("wikiPageId") REFERENCES "public"."WikiPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Auction" ADD CONSTRAINT "Auction_cardInstanceId_fkey" FOREIGN KEY ("cardInstanceId") REFERENCES "public"."CardInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Auction" ADD CONSTRAINT "Auction_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Bid" ADD CONSTRAINT "Bid_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "public"."Auction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Bid" ADD CONSTRAINT "Bid_bidderId_fkey" FOREIGN KEY ("bidderId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Trade" ADD CONSTRAINT "Trade_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Trade" ADD CONSTRAINT "Trade_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TradeItem" ADD CONSTRAINT "TradeItem_cardInstanceId_fkey" FOREIGN KEY ("cardInstanceId") REFERENCES "public"."CardInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TradeItem" ADD CONSTRAINT "TradeItem_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "public"."Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;
