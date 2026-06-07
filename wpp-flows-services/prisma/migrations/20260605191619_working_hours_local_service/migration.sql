-- AlterTable
ALTER TABLE "menu_item" ADD COLUMN     "availableForDelivery" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "availableForLocal" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "localOutOfHoursMessage" TEXT,
ADD COLUMN     "localWorkingDaysOfWeek" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "localWorkingEndTime" TEXT,
ADD COLUMN     "localWorkingStartTime" TEXT;
