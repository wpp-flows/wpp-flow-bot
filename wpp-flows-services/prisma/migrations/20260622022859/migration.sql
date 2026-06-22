/*
  Warnings:

  - You are about to drop the column `additionals` on the `menu_item` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "menu_item" DROP COLUMN "additionals",
ADD COLUMN     "optionGroups" JSONB,
ADD COLUMN     "originalPrice" DECIMAL(10,2),
ADD COLUMN     "promotionalPrice" DECIMAL(10,2);
