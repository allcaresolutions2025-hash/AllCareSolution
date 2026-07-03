-- Admin kill-switch to force-lock (disable) a member's 1000-pt Pin Wallet
-- regardless of leg counts or the unlock override.
ALTER TABLE "User" ADD COLUMN "pinWalletLocked" BOOLEAN NOT NULL DEFAULT false;
