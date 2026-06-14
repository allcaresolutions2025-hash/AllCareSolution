-- CreateEnum
CREATE TYPE "PinPurchaseStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- CreateTable
CREATE TABLE "PinPurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "mobileNumber" TEXT NOT NULL,
    "pricePerPin" INTEGER NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "status" "PinPurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "razorpayOrderId" TEXT NOT NULL,
    "razorpayPaymentId" TEXT,
    "razorpaySignature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PinPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PinPurchase_razorpayOrderId_key" ON "PinPurchase"("razorpayOrderId");

-- CreateIndex
CREATE INDEX "PinPurchase_userId_idx" ON "PinPurchase"("userId");

-- CreateIndex
CREATE INDEX "PinPurchase_status_createdAt_idx" ON "PinPurchase"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "PinPurchase" ADD CONSTRAINT "PinPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: link Pin -> PinPurchase
ALTER TABLE "Pin" ADD COLUMN "purchaseId" TEXT;

-- CreateIndex
CREATE INDEX "Pin_purchaseId_idx" ON "Pin"("purchaseId");

-- AddForeignKey
ALTER TABLE "Pin" ADD CONSTRAINT "Pin_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "PinPurchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
