-- Admin override to unlock the 1000-pt Pin Wallet for a member regardless of
-- the both-legs-filled requirement.
ALTER TABLE "User" ADD COLUMN "pinWalletUnlocked" BOOLEAN NOT NULL DEFAULT false;
