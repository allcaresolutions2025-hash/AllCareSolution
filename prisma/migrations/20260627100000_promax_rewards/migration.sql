-- Pro Max programme rewards (combo box + admin-granted level rewards).
CREATE TYPE "ProMaxRewardKind" AS ENUM ('COMBO', 'LEVEL');

CREATE TABLE "ProMaxReward" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "ProMaxRewardKind" NOT NULL DEFAULT 'LEVEL',
    "rewardName" TEXT NOT NULL,
    "status" "RewardClaimStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProMaxReward_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProMaxReward_userId_idx" ON "ProMaxReward"("userId");
CREATE INDEX "ProMaxReward_status_requestedAt_idx" ON "ProMaxReward"("status", "requestedAt");

ALTER TABLE "ProMaxReward" ADD CONSTRAINT "ProMaxReward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
