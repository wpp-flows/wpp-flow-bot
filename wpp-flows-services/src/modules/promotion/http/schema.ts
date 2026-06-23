import { z } from "zod";

const baseSchema = z.object({
    kind: z.enum(["NTH_ORDER_DISCOUNT", "DAILY_MESSAGE"]),
    name: z.string().min(1).max(120),
    isActive: z.boolean().optional(),
    nthOrder: z.number().int().positive().nullable().optional(),
    discountType: z.enum(["PERCENT", "FIXED"]).nullable().optional(),
    discountValue: z.coerce.number().positive().nullable().optional(),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    message: z.string().max(800).nullable().optional(),
    featuredItemId: z.uuid().nullable().optional(),
    promotionalPrice: z.coerce.number().nonnegative().nullable().optional(),
    teaserOrderOffset: z.number().int().positive().nullable().optional(),
    teaserMessage: z.string().max(800).nullable().optional(),
    qualifyingMessage: z.string().max(800).nullable().optional(),
});

export const createPromotionSchema = baseSchema;
export const updatePromotionSchema = baseSchema.partial();
