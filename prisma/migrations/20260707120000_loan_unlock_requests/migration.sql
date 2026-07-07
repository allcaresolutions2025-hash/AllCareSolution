-- Admin unlock flow for members blocked by the loan identity/PAN-reuse guard.
ALTER TABLE "User" ADD COLUMN "loanUnlocked" BOOLEAN NOT NULL DEFAULT false;

CREATE TYPE "LoanUnlockStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "LoanUnlockRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT,
    "status" "LoanUnlockStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    CONSTRAINT "LoanUnlockRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LoanUnlockRequest_status_createdAt_idx" ON "LoanUnlockRequest"("status", "createdAt");
CREATE INDEX "LoanUnlockRequest_userId_idx" ON "LoanUnlockRequest"("userId");

ALTER TABLE "LoanUnlockRequest" ADD CONSTRAINT "LoanUnlockRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
