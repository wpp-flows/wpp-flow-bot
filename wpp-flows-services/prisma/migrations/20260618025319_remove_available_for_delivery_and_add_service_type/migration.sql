/*
  Warnings:

  - You are about to drop the column `availableForDelivery` on the `menu_item` table. All the data in the column will be lost.
  - You are about to drop the column `availableForLocal` on the `menu_item` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "menu_category" ADD COLUMN     "serviceType" "ServiceType" NOT NULL DEFAULT 'DELIVERY';

-- AlterTable
ALTER TABLE "menu_item" DROP COLUMN "availableForDelivery",
DROP COLUMN "availableForLocal",
ADD COLUMN     "serviceType" "ServiceType" NOT NULL DEFAULT 'DELIVERY';

-- CreateIndex
CREATE INDEX "menu_category_organizationId_serviceType_idx" ON "menu_category"("organizationId", "serviceType");

-- CreateIndex
CREATE INDEX "menu_item_organizationId_serviceType_idx" ON "menu_item"("organizationId", "serviceType");
