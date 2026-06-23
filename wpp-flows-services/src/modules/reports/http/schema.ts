import { z } from "zod";

export const dailyReportDateParamSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
});

export const regenerateReportBodySchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
    serviceType: z.enum(["DELIVERY", "LOCAL"]).optional(),
});
