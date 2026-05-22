-- AlterTable
ALTER TABLE "bot" ADD COLUMN     "outOfHoursMessage" TEXT,
ADD COLUMN     "workingDaysOfWeek" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "workingEndTime" TEXT,
ADD COLUMN     "workingStartTime" TEXT;
