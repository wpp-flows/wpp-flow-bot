import { z } from "zod";

const codeSchema = z
    .string()
    .min(2)
    .max(40)
    .regex(/^[A-Z0-9_-]+$/i, "Use letras, números, hífens ou _");

const isoDate = z
    .string()
    .datetime()
    .nullable()
    .optional()
    .transform((v) => (v ? new Date(v) : v === null ? null : undefined));

export const createCouponSchema = z.object({
    code: codeSchema,
    discountType: z.enum(["PERCENT", "FIXED"]),
    discountValue: z.number().positive().max(100000),
    isActive: z.boolean().optional(),
    validFrom: isoDate,
    validUntil: isoDate,
    description: z.string().max(200).nullable().optional(),
});

export const updateCouponSchema = createCouponSchema.partial();

export type CreateCouponDTO = z.infer<typeof createCouponSchema>;
export type UpdateCouponDTO = z.infer<typeof updateCouponSchema>;
