-- AF Solution: pair matching is paid instantly on package approval, so an
-- account can receive several BINARY earnings on the same IST day. Replace the
-- one-per-day unique index with a plain index (still used for the daily cap).
DROP INDEX "PackageEarning_userId_runDate_type_key";

CREATE INDEX "PackageEarning_userId_runDate_type_idx" ON "PackageEarning"("userId", "runDate", "type");

-- Pair matching rate 10% -> 5%. Only touches a stored override; without one
-- the code default (now 5) applies.
UPDATE "Setting" SET "value" = '5', "updatedAt" = NOW() WHERE "key" = 'PKG_BINARY_PERCENT';
