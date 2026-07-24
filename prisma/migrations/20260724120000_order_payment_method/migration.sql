-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('COD', 'WALLET_POINTS');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'COD';
