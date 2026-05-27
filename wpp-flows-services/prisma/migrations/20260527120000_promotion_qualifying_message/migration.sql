-- Customer-facing banner for NTH_ORDER_DISCOUNT when the qualifying order
-- lands. Optional — defaults to an auto-built message when null.
ALTER TABLE "promotion" ADD COLUMN "qualifyingMessage" TEXT;
