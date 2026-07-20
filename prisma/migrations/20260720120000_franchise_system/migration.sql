-- Franchise system. Admin promotes a member to franchise leader; that leader
-- vets their downline's loan requests and Welcome Kit claims before the admin
-- sees them, and delivers the Welcome Kits themselves.

CREATE TYPE "FranchiseRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "FranchiseApproval" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "User" ADD COLUMN "isFranchise" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "franchiseGrantedAt" TIMESTAMP(3);

CREATE INDEX "User_isFranchise_idx" ON "User"("isFranchise");

CREATE TABLE "FranchiseRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "note" TEXT,
    "status" "FranchiseRequestStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    CONSTRAINT "FranchiseRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FranchiseRequest_status_requestedAt_idx" ON "FranchiseRequest"("status", "requestedAt");
CREATE INDEX "FranchiseRequest_userId_idx" ON "FranchiseRequest"("userId");

ALTER TABLE "FranchiseRequest" ADD CONSTRAINT "FranchiseRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Loan: franchise pre-approval stage. Existing rows default to NONE so they
-- keep flowing straight to the admin queue.
ALTER TABLE "Loan" ADD COLUMN "franchiseId" TEXT;
ALTER TABLE "Loan" ADD COLUMN "franchiseStatus" "FranchiseApproval" NOT NULL DEFAULT 'NONE';
ALTER TABLE "Loan" ADD COLUMN "franchiseNotes" TEXT;
ALTER TABLE "Loan" ADD COLUMN "franchiseReviewedAt" TIMESTAMP(3);

CREATE INDEX "Loan_franchiseId_franchiseStatus_idx" ON "Loan"("franchiseId", "franchiseStatus");

ALTER TABLE "Loan" ADD CONSTRAINT "Loan_franchiseId_fkey"
  FOREIGN KEY ("franchiseId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RewardClaim: Welcome Kit (level 0) franchise approval + delivery.
ALTER TABLE "RewardClaim" ADD COLUMN "franchiseId" TEXT;
ALTER TABLE "RewardClaim" ADD COLUMN "franchiseStatus" "FranchiseApproval" NOT NULL DEFAULT 'NONE';
ALTER TABLE "RewardClaim" ADD COLUMN "franchiseNotes" TEXT;
ALTER TABLE "RewardClaim" ADD COLUMN "franchiseReviewedAt" TIMESTAMP(3);
ALTER TABLE "RewardClaim" ADD COLUMN "franchiseDeliveredAt" TIMESTAMP(3);

CREATE INDEX "RewardClaim_franchiseId_franchiseStatus_idx" ON "RewardClaim"("franchiseId", "franchiseStatus");

ALTER TABLE "RewardClaim" ADD CONSTRAINT "RewardClaim_franchiseId_fkey"
  FOREIGN KEY ("franchiseId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
