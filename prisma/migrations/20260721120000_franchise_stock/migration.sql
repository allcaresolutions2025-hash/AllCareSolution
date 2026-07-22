-- Franchise Welcome Kit stock. Admin ships kits to a franchise leader; the
-- leader's shelf drops by one each time they deliver a Welcome Kit.

ALTER TABLE "User" ADD COLUMN "franchiseStockReceived" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "franchiseStockCurrent" INTEGER NOT NULL DEFAULT 0;

CREATE TYPE "FranchiseStockTxnType" AS ENUM ('GRANT', 'CONSUME', 'ADJUST');

CREATE TABLE "FranchiseStockTxn" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "type" "FranchiseStockTxnType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "note" TEXT,
    "actorId" TEXT,
    "rewardClaimId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FranchiseStockTxn_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FranchiseStockTxn_franchiseId_createdAt_idx" ON "FranchiseStockTxn"("franchiseId", "createdAt");

ALTER TABLE "FranchiseStockTxn" ADD CONSTRAINT "FranchiseStockTxn_franchiseId_fkey"
  FOREIGN KEY ("franchiseId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
