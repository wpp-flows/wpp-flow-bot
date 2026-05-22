-- AlterEnum
ALTER TYPE "PromotionKind" ADD VALUE 'BUNDLE';

-- AlterTable
ALTER TABLE "promotion" ADD COLUMN     "bundle" JSONB;
