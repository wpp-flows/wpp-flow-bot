-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'HUMAN_HANDOFF';

-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "humanHandoffKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "humanHandoffMessage" TEXT;
