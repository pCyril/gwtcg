-- AlterEnum
ALTER TYPE "AcquisitionSource" ADD VALUE 'EXCHANGE';

-- AlterTable
ALTER TABLE "CardInstance" ADD COLUMN     "givenInExchangeId" TEXT;

-- CreateTable
CREATE TABLE "CardExchange" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rarity" "Rarity" NOT NULL,
    "receivedInstanceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardExchange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CardExchange_receivedInstanceId_key" ON "CardExchange"("receivedInstanceId");

-- CreateIndex
CREATE INDEX "CardExchange_userId_createdAt_idx" ON "CardExchange"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "CardInstance" ADD CONSTRAINT "CardInstance_givenInExchangeId_fkey" FOREIGN KEY ("givenInExchangeId") REFERENCES "CardExchange"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardExchange" ADD CONSTRAINT "CardExchange_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardExchange" ADD CONSTRAINT "CardExchange_receivedInstanceId_fkey" FOREIGN KEY ("receivedInstanceId") REFERENCES "CardInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
