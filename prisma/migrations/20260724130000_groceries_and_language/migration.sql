-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('WELLNESS', 'GROCERIES');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('EN', 'TA', 'HI');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "category" "ProductCategory" NOT NULL DEFAULT 'WELLNESS',
ADD COLUMN     "nameHi" TEXT,
ADD COLUMN     "nameTa" TEXT,
ADD COLUMN     "subCategory" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "preferredLanguage" "Language" NOT NULL DEFAULT 'EN';
