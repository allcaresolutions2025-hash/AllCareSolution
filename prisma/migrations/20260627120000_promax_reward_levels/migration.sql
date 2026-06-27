-- Restructure Pro Max rewards into a level-based ladder (was kind COMBO/LEVEL).
-- The table is empty (Pro Max tree was reset), so this is a clean reshape.
DROP INDEX IF EXISTS "ProMaxReward_userId_idx";
ALTER TABLE "ProMaxReward" DROP COLUMN "kind";
DROP TYPE "ProMaxRewardKind";
ALTER TABLE "ProMaxReward" ADD COLUMN "level" INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX "ProMaxReward_userId_level_key" ON "ProMaxReward"("userId", "level");
