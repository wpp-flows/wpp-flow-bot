-- AlterTable
ALTER TABLE "menu_item" ADD COLUMN     "availableDaysOfWeek" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- AlterTable
ALTER TABLE "promotion" ADD COLUMN     "featuredItemId" TEXT,
ADD COLUMN     "promotionalPrice" DECIMAL(10,2);

-- CreateIndex
CREATE INDEX "promotion_featuredItemId_idx" ON "promotion"("featuredItemId");

-- AddForeignKey
ALTER TABLE "promotion" ADD CONSTRAINT "promotion_featuredItemId_fkey" FOREIGN KEY ("featuredItemId") REFERENCES "menu_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
