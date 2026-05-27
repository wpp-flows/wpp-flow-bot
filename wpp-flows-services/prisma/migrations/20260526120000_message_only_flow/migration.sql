-- Pivot: WhatsApp flows are now MESSAGE-only. Ordering lives on the web menu
-- site; the bot just greets + hands off via {{menu_url}}.

-- 1. Drop any flow steps with types we're removing. Cascade is fine because
--    the FlowStep table only refers to Flow + carries the step data itself.
DELETE FROM "flow_step" WHERE "type" IN ('MENU', 'CONFIRMATION', 'INPUT');

-- 2. Recreate the enum with only MESSAGE. Cast existing column through text
--    to swap enum types in-place.
ALTER TABLE "flow_step" ALTER COLUMN "type" TYPE TEXT;
DROP TYPE "FlowStepType";
CREATE TYPE "FlowStepType" AS ENUM ('MESSAGE');
ALTER TABLE "flow_step"
  ALTER COLUMN "type" TYPE "FlowStepType" USING "type"::"FlowStepType";

-- 3. Bot cooldown — how long the runner stays quiet on a conversation after
--    replying. 0 = no cooldown.
ALTER TABLE "organization"
  ADD COLUMN "botCooldownMinutes" INTEGER NOT NULL DEFAULT 60;

-- 4. Track the last bot reply per conversation, used for the cooldown check.
ALTER TABLE "conversation" ADD COLUMN "lastBotReplyAt" TIMESTAMP(3);
