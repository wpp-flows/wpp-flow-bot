-- CreateEnum
CREATE TYPE "BotDesiredState" AS ENUM ('CONNECTED', 'DISCONNECTED');

-- AlterTable
ALTER TABLE "bot" ADD COLUMN     "desiredState" "BotDesiredState" NOT NULL DEFAULT 'CONNECTED',
ADD COLUMN     "lastDisconnectNotifiedAt" TIMESTAMPTZ,
ADD COLUMN     "lastRecoveryAt" TIMESTAMPTZ,
ADD COLUMN     "recoveryAttempts" INTEGER NOT NULL DEFAULT 0;
