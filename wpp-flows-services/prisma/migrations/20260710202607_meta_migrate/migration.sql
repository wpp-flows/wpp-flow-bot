/*
  Warnings:

  - A unique constraint covering the columns `[phoneNumberId]` on the table `bot` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "BotProvider" AS ENUM ('EVOLUTION', 'CLOUD_API');

-- AlterTable
ALTER TABLE "bot" ADD COLUMN     "accessToken" TEXT,
ADD COLUMN     "displayPhoneNumber" TEXT,
ADD COLUMN     "phoneNumberId" TEXT,
ADD COLUMN     "provider" "BotProvider" NOT NULL DEFAULT 'EVOLUTION',
ADD COLUMN     "tokenStatus" TEXT,
ADD COLUMN     "verifiedName" TEXT,
ADD COLUMN     "wabaId" TEXT,
ALTER COLUMN "evolutionInstanceName" DROP NOT NULL;

-- AlterTable
ALTER TABLE "conversation" ADD COLUMN     "lastInboundAt" TIMESTAMPTZ;

-- CreateIndex
CREATE UNIQUE INDEX "bot_phoneNumberId_key" ON "bot"("phoneNumberId");

-- CreateIndex
CREATE INDEX "bot_wabaId_idx" ON "bot"("wabaId");
