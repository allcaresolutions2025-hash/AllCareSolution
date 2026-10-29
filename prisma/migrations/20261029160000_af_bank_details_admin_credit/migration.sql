-- AF Solution: bank details on AF ID requests, and admin credits to the AF
-- wallet recorded in the PackageEarning ledger. Additive only.

-- AlterEnum
ALTER TYPE "PackageEarningType" ADD VALUE 'ADMIN_CREDIT';

-- AlterTable
ALTER TABLE "AfIdRequest" ADD COLUMN     "bankAccountName" TEXT,
ADD COLUMN     "bankAccountNumber" TEXT,
ADD COLUMN     "bankIfsc" TEXT,
ADD COLUMN     "bankName" TEXT;
