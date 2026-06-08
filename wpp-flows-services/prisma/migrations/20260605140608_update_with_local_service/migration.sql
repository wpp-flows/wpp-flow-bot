-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('DELIVERY', 'LOCAL');

-- CreateEnum
CREATE TYPE "TableStatus" AS ENUM ('EMPTY', 'OCCUPIED', 'BILL_REQUESTED');

-- AlterTable
ALTER TABLE "order" ADD COLUMN     "billId" TEXT,
ADD COLUMN     "serviceType" "ServiceType" NOT NULL DEFAULT 'DELIVERY',
ADD COLUMN     "tableId" TEXT;

-- AlterTable
ALTER TABLE "wallet" ADD COLUMN     "localBalance" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "wallet_transaction" ADD COLUMN     "billId" TEXT,
ADD COLUMN     "serviceType" "ServiceType" NOT NULL DEFAULT 'DELIVERY';

-- CreateTable
CREATE TABLE "restaurant_table" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "qrToken" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "seats" INTEGER,
    "notes" TEXT,
    "status" "TableStatus" NOT NULL DEFAULT 'EMPTY',
    "billRequestedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "restaurant_table_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "table_bill" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "notes" TEXT,
    "closedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "table_bill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_table_qrToken_key" ON "restaurant_table"("qrToken");

-- CreateIndex
CREATE INDEX "restaurant_table_organizationId_idx" ON "restaurant_table"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_table_organizationId_label_key" ON "restaurant_table"("organizationId", "label");

-- CreateIndex
CREATE INDEX "table_bill_organizationId_idx" ON "table_bill"("organizationId");

-- CreateIndex
CREATE INDEX "table_bill_tableId_idx" ON "table_bill"("tableId");

-- CreateIndex
CREATE INDEX "table_bill_organizationId_closedAt_idx" ON "table_bill"("organizationId", "closedAt");

-- CreateIndex
CREATE INDEX "order_organizationId_serviceType_idx" ON "order"("organizationId", "serviceType");

-- CreateIndex
CREATE INDEX "order_tableId_idx" ON "order"("tableId");

-- CreateIndex
CREATE INDEX "order_billId_idx" ON "order"("billId");

-- CreateIndex
CREATE INDEX "wallet_transaction_walletId_serviceType_idx" ON "wallet_transaction"("walletId", "serviceType");

-- CreateIndex
CREATE INDEX "wallet_transaction_billId_idx" ON "wallet_transaction"("billId");

-- AddForeignKey
ALTER TABLE "restaurant_table" ADD CONSTRAINT "restaurant_table_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_bill" ADD CONSTRAINT "table_bill_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "restaurant_table"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "restaurant_table"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_billId_fkey" FOREIGN KEY ("billId") REFERENCES "table_bill"("id") ON DELETE SET NULL ON UPDATE CASCADE;
