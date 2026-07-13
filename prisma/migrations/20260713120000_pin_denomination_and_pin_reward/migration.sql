-- Pin denomination (1000 standard / 2000) + the 2000-pt pin reward flow.

-- Denomination selected at request time and carried onto minted pins.
ALTER TABLE "PinRequest" ADD COLUMN "pointsValue" INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE "Pin" ADD COLUMN "pointsValue" INTEGER NOT NULL DEFAULT 1000;

-- Cash-back reward for obtaining a 2000-pt pin; credited to the payout wallet on
-- admin approval. Reuses the existing RewardClaimStatus enum.
CREATE TABLE "PinReward" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pointsValue" INTEGER NOT NULL DEFAULT 2000,
    "status" "RewardClaimStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PinReward_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PinReward_userId_idx" ON "PinReward"("userId");
CREATE INDEX "PinReward_status_requestedAt_idx" ON "PinReward"("status", "requestedAt");

ALTER TABLE "PinReward" ADD CONSTRAINT "PinReward_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
