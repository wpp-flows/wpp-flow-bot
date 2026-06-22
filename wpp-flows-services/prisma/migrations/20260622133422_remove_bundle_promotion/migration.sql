/*
  Warnings:

  - The values [BUNDLE] on the enum `PromotionKind` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `originalPrice` on the `menu_item` table. All the data in the column will be lost.
  - You are about to drop the column `bundle` on the `promotion` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PromotionKind_new" AS ENUM ('NTH_ORDER_DISCOUNT', 'DAILY_MESSAGE');
ALTER TABLE "promotion" ALTER COLUMN "kind" TYPE "PromotionKind_new" USING ("kind"::text::"PromotionKind_new");
ALTER TYPE "PromotionKind" RENAME TO "PromotionKind_old";
ALTER TYPE "PromotionKind_new" RENAME TO "PromotionKind";
DROP TYPE "public"."PromotionKind_old";
COMMIT;

-- AlterTable
ALTER TABLE "menu_item" DROP COLUMN "originalPrice";

-- AlterTable
ALTER TABLE "promotion" DROP COLUMN "bundle";
