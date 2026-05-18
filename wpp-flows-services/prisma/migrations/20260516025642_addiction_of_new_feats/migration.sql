-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('RECEIVED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "WalletTxKind" AS ENUM ('CREDIT', 'WITHDRAWAL');

-- CreateEnum
CREATE TYPE "WalletTxStatus" AS ENUM ('PENDING', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PromotionKind" AS ENUM ('NTH_ORDER_DISCOUNT', 'DAILY_MESSAGE');

-- CreateEnum
CREATE TYPE "PromotionDiscountType" AS ENUM ('PERCENT', 'FIXED');

-- AlterEnum
ALTER TYPE "FlowStepType" ADD VALUE 'INPUT';

-- AlterTable
ALTER TABLE "conversation" ADD COLUMN     "customerId" TEXT;

-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "mercadoPagoAccessToken" TEXT,
ADD COLUMN     "mercadoPagoPublicKey" TEXT,
ADD COLUMN     "mercadoPagoWebhookSecret" TEXT,
ADD COLUMN     "notificationPreferences" JSONB,
ADD COLUMN     "payoutPixKey" TEXT,
ADD COLUMN     "payoutPixKeyType" TEXT;

-- CreateTable
CREATE TABLE "customer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "savedAddresses" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "conversationId" TEXT,
    "sequence" INTEGER NOT NULL,
    "items" JSONB NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(10,2),
    "total" DECIMAL(10,2) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'RECEIVED',
    "observation" TEXT,
    "address" TEXT,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentProvider" TEXT,
    "paymentProviderRef" TEXT,
    "paymentLink" TEXT,
    "receiptUrl" TEXT,
    "appliedPromotionIds" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "kind" "WalletTxKind" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "WalletTxStatus" NOT NULL DEFAULT 'COMPLETED',
    "orderId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "kind" "PromotionKind" NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "nthOrder" INTEGER,
    "discountType" "PromotionDiscountType",
    "discountValue" DECIMAL(10,2),
    "daysOfWeek" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "message" TEXT,
    "teaserOrderOffset" INTEGER,
    "teaserMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_organizationId_idx" ON "customer"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_organizationId_phone_key" ON "customer"("organizationId", "phone");

-- CreateIndex
CREATE INDEX "order_organizationId_idx" ON "order"("organizationId");

-- CreateIndex
CREATE INDEX "order_customerId_idx" ON "order"("customerId");

-- CreateIndex
CREATE INDEX "order_conversationId_idx" ON "order"("conversationId");

-- CreateIndex
CREATE INDEX "order_organizationId_status_idx" ON "order"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "order_organizationId_sequence_key" ON "order"("organizationId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_organizationId_key" ON "wallet"("organizationId");

-- CreateIndex
CREATE INDEX "wallet_transaction_walletId_idx" ON "wallet_transaction"("walletId");

-- CreateIndex
CREATE INDEX "wallet_transaction_walletId_status_idx" ON "wallet_transaction"("walletId", "status");

-- CreateIndex
CREATE INDEX "promotion_organizationId_idx" ON "promotion"("organizationId");

-- CreateIndex
CREATE INDEX "promotion_organizationId_isActive_idx" ON "promotion"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "conversation_customerId_idx" ON "conversation"("customerId");

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer" ADD CONSTRAINT "customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet" ADD CONSTRAINT "wallet_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transaction" ADD CONSTRAINT "wallet_transaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transaction" ADD CONSTRAINT "wallet_transaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion" ADD CONSTRAINT "promotion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
