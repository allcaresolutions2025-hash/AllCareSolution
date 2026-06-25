-- Pin Pro Max — a fully parallel binary program (10,000-pt pin) alongside the
-- existing 1000-pt system. All columns default to the 1000-pt no-op value so
-- existing rows and the existing engine are unaffected.

-- AlterTable: User — Pro Max placement (separate tree) + program flag
ALTER TABLE "User" ADD COLUMN "isProMax" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "proMaxReferrerId" TEXT;
ALTER TABLE "User" ADD COLUMN "proMaxSlot" "Slot";
ALTER TABLE "User" ADD COLUMN "proMaxPairBonusAwarded" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "proMaxLeftLegCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "proMaxRightLegCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: Wallet — Pro Max wallet balances
ALTER TABLE "Wallet" ADD COLUMN "proMaxBalanceAvailable" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Wallet" ADD COLUMN "proMaxBalancePaidLifetime" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: Pin / PinRequest — flag Pro Max pins
ALTER TABLE "Pin" ADD COLUMN "proMax" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PinRequest" ADD COLUMN "proMax" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: DailyPayout — distinguish Pro Max payout rows; rebuild unique key
ALTER TABLE "DailyPayout" ADD COLUMN "proMax" BOOLEAN NOT NULL DEFAULT false;
DROP INDEX "DailyPayout_userId_runDate_key";
CREATE UNIQUE INDEX "DailyPayout_userId_runDate_proMax_key" ON "DailyPayout"("userId", "runDate", "proMax");

-- CreateIndex: Pro Max placement lookups
CREATE INDEX "User_proMaxReferrerId_proMaxSlot_idx" ON "User"("proMaxReferrerId", "proMaxSlot");

-- AddForeignKey: Pro Max referrer self-relation
ALTER TABLE "User" ADD CONSTRAINT "User_proMaxReferrerId_fkey" FOREIGN KEY ("proMaxReferrerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
