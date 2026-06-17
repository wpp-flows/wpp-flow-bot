-- DropForeignKey
ALTER TABLE "table_bill" DROP CONSTRAINT "table_bill_tableId_fkey";

-- AlterTable
ALTER TABLE "order" ADD COLUMN     "tableLabel" TEXT;

-- AlterTable
ALTER TABLE "table_bill" ADD COLUMN     "tableLabel" TEXT,
ALTER COLUMN "tableId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "table_bill" ADD CONSTRAINT "table_bill_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "restaurant_table"("id") ON DELETE SET NULL ON UPDATE CASCADE;
