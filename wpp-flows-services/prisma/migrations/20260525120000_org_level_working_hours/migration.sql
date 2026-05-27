-- Move working hours from bot to organization (single source for "are we open?")

-- 1. Add new columns to organization
ALTER TABLE "organization"
  ADD COLUMN "workingDaysOfWeek" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  ADD COLUMN "workingStartTime" TEXT,
  ADD COLUMN "workingEndTime" TEXT,
  ADD COLUMN "outOfHoursMessage" TEXT;

-- 2. Copy hours from the earliest-created bot per org (best-effort —
--    multi-bot orgs that disagreed pick one source of truth).
UPDATE "organization" AS o SET
  "workingDaysOfWeek"  = b."workingDaysOfWeek",
  "workingStartTime"   = b."workingStartTime",
  "workingEndTime"     = b."workingEndTime",
  "outOfHoursMessage"  = b."outOfHoursMessage"
FROM (
  SELECT DISTINCT ON ("organizationId")
    "organizationId",
    "workingDaysOfWeek",
    "workingStartTime",
    "workingEndTime",
    "outOfHoursMessage"
  FROM "bot"
  ORDER BY "organizationId", "createdAt" ASC
) AS b
WHERE o.id = b."organizationId";

-- 3. Drop the columns from bot
ALTER TABLE "bot"
  DROP COLUMN "workingDaysOfWeek",
  DROP COLUMN "workingStartTime",
  DROP COLUMN "workingEndTime",
  DROP COLUMN "outOfHoursMessage";
