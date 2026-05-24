-- Daily points payout

-- CreateEnum
CREATE TYPE "DailyPayoutStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "DailyPayout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "runDate" TEXT NOT NULL,
    "startBalance" INTEGER NOT NULL,
    "paidAmount" INTEGER NOT NULL,
    "forfeitAmount" INTEGER NOT NULL,
    "status" "DailyPayoutStatus" NOT NULL DEFAULT 'PENDING',
    "reviewerNotes" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyPayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyPayout_userId_runDate_key" ON "DailyPayout"("userId", "runDate");

-- CreateIndex
CREATE INDEX "DailyPayout_status_idx" ON "DailyPayout"("status");

-- CreateIndex
CREATE INDEX "DailyPayout_runDate_idx" ON "DailyPayout"("runDate");

-- AddForeignKey
ALTER TABLE "DailyPayout" ADD CONSTRAINT "DailyPayout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
