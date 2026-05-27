/*
  Warnings:

  - The values [PAYMENT] on the enum `FlowStepType` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "DeliveryMode" AS ENUM ('PICKUP', 'DELIVERY');

-- CreateEnum
CREATE TYPE "CouponDiscountType" AS ENUM ('PERCENT', 'FIXED');

-- AlterEnum
BEGIN;
CREATE TYPE "FlowStepType_new" AS ENUM ('MESSAGE', 'MENU', 'CONFIRMATION', 'INPUT');
ALTER TABLE "flow_step" ALTER COLUMN "type" TYPE "FlowStepType_new" USING ("type"::text::"FlowStepType_new");
ALTER TYPE "FlowStepType" RENAME TO "FlowStepType_old";
ALTER TYPE "FlowStepType_new" RENAME TO "FlowStepType";
DROP TYPE "public"."FlowStepType_old";
COMMIT;

-- AlterTable
ALTER TABLE "order" ADD COLUMN     "couponCode" TEXT,
ADD COLUMN     "couponDiscount" DECIMAL(10,2),
ADD COLUMN     "deliveryFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "deliveryMode" "DeliveryMode" NOT NULL DEFAULT 'DELIVERY';

-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "deliveryFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "paymentCancelMessage" TEXT,
ADD COLUMN     "paymentReceivedMessage" TEXT,
ADD COLUMN     "paymentTimeoutMessage" TEXT,
ADD COLUMN     "paymentTimeoutMinutes" INTEGER NOT NULL DEFAULT 15;

-- CreateTable
CREATE TABLE "coupon" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountType" "CouponDiscountType" NOT NULL,
    "discountValue" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coupon_organizationId_idx" ON "coupon"("organizationId");

-- CreateIndex
CREATE INDEX "coupon_organizationId_isActive_idx" ON "coupon"("organizationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_organizationId_code_key" ON "coupon"("organizationId", "code");

-- AddForeignKey
ALTER TABLE "coupon" ADD CONSTRAINT "coupon_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
