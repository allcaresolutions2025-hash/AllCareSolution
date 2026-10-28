-- Package Plan: product packages that generate BV on the 1000-pt binary tree.
-- Purely additive — new enums + tables only, no changes to existing tables.
-- See src/lib/package-plan.ts for the engine.

-- CreateEnum
CREATE TYPE "PackagePlan" AS ENUM ('STARTER', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PackagePaymentMethod" AS ENUM ('OFFLINE', 'E_WALLET');

-- CreateEnum
CREATE TYPE "PackageStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PackageDeliveryStatus" AS ENUM ('PENDING', 'SHIPPED', 'DELIVERED');

-- CreateEnum
CREATE TYPE "PackageEarningType" AS ENUM ('DIRECT', 'BINARY', 'TRANSFER_OUT');

-- CreateTable
CREATE TABLE "PackagePurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "PackagePlan" NOT NULL,
    "amount" INTEGER NOT NULL,
    "bv" INTEGER NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "paymentMethod" "PackagePaymentMethod" NOT NULL,
    "paymentRef" TEXT,
    "shipName" TEXT NOT NULL,
    "shipPhone" TEXT NOT NULL,
    "shipAddress" TEXT NOT NULL,
    "status" "PackageStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "reviewerId" TEXT,
    "deliveryStatus" "PackageDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "trackingNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "PackagePurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageAccount" (
    "userId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "packageTotal" INTEGER NOT NULL DEFAULT 0,
    "personalBv" INTEGER NOT NULL DEFAULT 0,
    "leftBv" INTEGER NOT NULL DEFAULT 0,
    "rightBv" INTEGER NOT NULL DEFAULT 0,
    "leftBvTotal" INTEGER NOT NULL DEFAULT 0,
    "rightBvTotal" INTEGER NOT NULL DEFAULT 0,
    "walletBalance" INTEGER NOT NULL DEFAULT 0,
    "earnedLifetime" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackageAccount_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "PackageBvEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "side" "Slot" NOT NULL,
    "bv" INTEGER NOT NULL,
    "remaining" INTEGER NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackageBvEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageEarning" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "PackageEarningType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "grossAmount" INTEGER NOT NULL DEFAULT 0,
    "bvMatched" INTEGER,
    "purchaseId" TEXT,
    "runDate" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackageEarning_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PackagePurchase_userId_createdAt_idx" ON "PackagePurchase"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PackagePurchase_status_createdAt_idx" ON "PackagePurchase"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PackagePurchase_status_reviewedAt_idx" ON "PackagePurchase"("status", "reviewedAt");

-- CreateIndex
CREATE INDEX "PackageAccount_leftBv_rightBv_idx" ON "PackageAccount"("leftBv", "rightBv");

-- CreateIndex
CREATE INDEX "PackageBvEntry_userId_side_remaining_createdAt_idx" ON "PackageBvEntry"("userId", "side", "remaining", "createdAt");

-- CreateIndex
CREATE INDEX "PackageBvEntry_remaining_createdAt_idx" ON "PackageBvEntry"("remaining", "createdAt");

-- CreateIndex
CREATE INDEX "PackageEarning_userId_createdAt_idx" ON "PackageEarning"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PackageEarning_type_createdAt_idx" ON "PackageEarning"("type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PackageEarning_userId_runDate_type_key" ON "PackageEarning"("userId", "runDate", "type");

-- AddForeignKey
ALTER TABLE "PackagePurchase" ADD CONSTRAINT "PackagePurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackagePurchase" ADD CONSTRAINT "PackagePurchase_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageAccount" ADD CONSTRAINT "PackageAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageBvEntry" ADD CONSTRAINT "PackageBvEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageEarning" ADD CONSTRAINT "PackageEarning_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
