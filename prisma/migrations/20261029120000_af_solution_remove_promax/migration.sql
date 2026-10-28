-- Remove the Pin Pro Max programme entirely (code and data) and add AF Solution.
-- A JSON backup of every Pro Max row was taken before this ran. Pro Max
-- accounts were separate logins with no place in the 1000-pt tree, so deleting
-- them does not touch any main-tree member.

-- Everything below runs in one transaction: it either fully applies or leaves
-- the database untouched.
BEGIN;

-- 1. Pro Max data.
DELETE FROM "Pin" WHERE "proMax" = true;
DELETE FROM "PinRequest" WHERE "proMax" = true;
DELETE FROM "DailyPayout" WHERE "proMax" = true;
DELETE FROM "Loan" WHERE "proMax" = true;

-- 2. Pro Max member accounts and the Pro Max admin. Clear the RESTRICT-ed
-- references first; everything else cascades.
CREATE TEMP TABLE "_promax_users" AS
  SELECT id FROM "User" WHERE "isProMax" = true OR role = 'PROMAX_ADMIN';
DELETE FROM "RewardClaim" WHERE "userId" IN (SELECT id FROM "_promax_users");
DELETE FROM "Commission" WHERE "beneficiaryId" IN (SELECT id FROM "_promax_users");
DELETE FROM "PayoutRequest" WHERE "userId" IN (SELECT id FROM "_promax_users");
DELETE FROM "Order" WHERE "userId" IN (SELECT id FROM "_promax_users");
DELETE FROM "User" WHERE id IN (SELECT id FROM "_promax_users");
DROP TABLE "_promax_users";

DELETE FROM "Setting" WHERE key LIKE 'PIN_PRO_MAX%';

-- 3. Schema.
-- CreateEnum
CREATE TYPE "AfIdRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
CREATE TYPE "Role_new" AS ENUM ('CUSTOMER', 'ADMIN');
ALTER TABLE "public"."User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'CUSTOMER';

-- DropForeignKey
ALTER TABLE "ProMaxReward" DROP CONSTRAINT "ProMaxReward_userId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_proMaxReferrerId_fkey";

-- DropIndex
DROP INDEX "DailyPayout_userId_runDate_proMax_key";

-- DropIndex
DROP INDEX IF EXISTS "Loan_proMax_status_idx";

-- DropIndex
DROP INDEX "User_proMaxReferrerId_proMaxSlot_idx";

-- AlterTable
ALTER TABLE "DailyPayout" DROP COLUMN "proMax";

-- AlterTable
ALTER TABLE "Loan" DROP COLUMN "proMax";

-- AlterTable
ALTER TABLE "Pin" DROP COLUMN "proMax";

-- AlterTable
ALTER TABLE "PinRequest" DROP COLUMN "proMax";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "isProMax",
DROP COLUMN "proMaxLeftLegCount",
DROP COLUMN "proMaxPairBonusAwarded",
DROP COLUMN "proMaxReferrerId",
DROP COLUMN "proMaxRightLegCount",
DROP COLUMN "proMaxSlot",
ADD COLUMN     "afReferrerId" TEXT,
ADD COLUMN     "afSlot" "Slot",
ADD COLUMN     "afTermsAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "isAf" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Wallet" DROP COLUMN "proMaxBalanceAvailable",
DROP COLUMN "proMaxBalancePaidLifetime";

-- DropTable
DROP TABLE "ProMaxReward";

-- CreateTable
CREATE TABLE "AfIdRequest" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "sponsorAfId" TEXT,
    "side" "Slot",
    "note" TEXT,
    "status" "AfIdRequestStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "reviewerId" TEXT,
    "createdUserId" TEXT,
    "createdAfId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "AfIdRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AfIdRequest_status_createdAt_idx" ON "AfIdRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AfIdRequest_requesterId_createdAt_idx" ON "AfIdRequest"("requesterId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DailyPayout_userId_runDate_key" ON "DailyPayout"("userId", "runDate");

-- CreateIndex
CREATE UNIQUE INDEX "User_afReferrerId_afSlot_key" ON "User"("afReferrerId", "afSlot");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_afReferrerId_fkey" FOREIGN KEY ("afReferrerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AfIdRequest" ADD CONSTRAINT "AfIdRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
