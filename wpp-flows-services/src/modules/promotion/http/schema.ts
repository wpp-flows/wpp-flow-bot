import { z } from "zod";

const bundleComponentSchema = z.object({
    id: z.string().min(1).max(64),
    label: z.string().min(1).max(80),
    itemIds: z.array(z.uuid()).max(50),
    count: z.number().int().positive().max(20),
    free: z.boolean(),
});

const bundleQuestionSchema = z.object({
    id: z.string().min(1).max(64),
    label: z.string().min(1).max(200),
    fieldKey: z
        .string()
        .min(1)
        .max(40)
        .regex(/^[a-z][a-z0-9_]*$/i, "Use letras, números e underscore."),
});

const bundleConfigSchema = z.object({
    components: z.array(bundleComponentSchema).min(1).max(10),
    price: z
        .union([z.string(), z.number()])
        .transform((v) => (typeof v === "number" ? v.toFixed(2) : v)),
    questions: z.array(bundleQuestionSchema).max(10).optional().default([]),
});

const baseSchema = z.object({
    kind: z.enum(["NTH_ORDER_DISCOUNT", "DAILY_MESSAGE", "BUNDLE"]),
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
    bundle: bundleConfigSchema.nullable().optional(),
});

export const createPromotionSchema = baseSchema;
export const updatePromotionSchema = baseSchema.partial();
