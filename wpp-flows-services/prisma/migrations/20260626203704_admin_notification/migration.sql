-- CreateEnum
CREATE TYPE "AdminNotificationType" AS ENUM ('WA_VERSION_UPDATED');

-- CreateTable
CREATE TABLE "admin_notification" (
    "id" TEXT NOT NULL,
    "type" "AdminNotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "metadata" JSONB,
    "readAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_notification_createdAt_idx" ON "admin_notification"("createdAt");

-- CreateIndex
CREATE INDEX "admin_notification_readAt_idx" ON "admin_notification"("readAt");
