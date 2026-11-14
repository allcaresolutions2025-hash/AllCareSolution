-- Admin can remove an approved AF package from an account (instead of
-- removing the whole AF account). Additive only.
ALTER TYPE "PackageStatus" ADD VALUE 'REMOVED';

ALTER TABLE "PackagePurchase" ADD COLUMN "removedAt" TIMESTAMP(3),
ADD COLUMN "removedById" TEXT,
ADD COLUMN "removeReason" TEXT;
