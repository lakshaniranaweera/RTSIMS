-- CreateEnum
CREATE TYPE "ProductLocation" AS ENUM ('OFFICE', 'STORE');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "location" "ProductLocation" NOT NULL DEFAULT 'STORE';

-- CreateIndex
CREATE INDEX "Product_location_idx" ON "Product"("location");
