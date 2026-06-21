-- AlterTable: pin wallet balance on each wallet
ALTER TABLE "Wallet" ADD COLUMN "pinWalletBalance" INTEGER NOT NULL DEFAULT 0;

-- CreateEnum
CREATE TYPE "PinWalletTxnType" AS ENUM ('LOAN_CREDIT', 'PAYOUT_TRANSFER', 'PIN_PURCHASE');

-- CreateTable
CREATE TABLE "PinWalletTxn" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "PinWalletTxnType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PinWalletTxn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PinWalletTxn_userId_createdAt_idx" ON "PinWalletTxn"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "PinWalletTxn" ADD CONSTRAINT "PinWalletTxn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "PinPurchaseSource" AS ENUM ('RAZORPAY', 'PIN_WALLET');

-- AlterTable: tag the funding source and allow pin-wallet purchases (no razorpay order)
ALTER TABLE "PinPurchase" ADD COLUMN "source" "PinPurchaseSource" NOT NULL DEFAULT 'RAZORPAY';
ALTER TABLE "PinPurchase" ALTER COLUMN "razorpayOrderId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "PinPurchase_source_paidAt_idx" ON "PinPurchase"("source", "paidAt");
