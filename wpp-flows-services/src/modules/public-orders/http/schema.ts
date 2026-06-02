import { z } from "zod";

const phoneSchema = z
    .string()
    .min(8)
    .max(20)
    .regex(/^[+\d\s()\-]+$/, "Telefone inválido");

const bundlePickSchema = z.object({
    componentId: z.string().min(1),
    itemId: z.uuid(),
});

const additionalSchema = z.object({
    id: z.string().min(1).max(64),
    name: z.string().min(1).max(120),
    price: z.number().nonnegative(),
});

const cartItemSchema = z.object({
    itemId: z.uuid(),
    qty: z.number().int().min(1).max(100),
    notes: z.string().max(500).nullable().optional(),
    additionals: z.array(additionalSchema).max(50).optional(),
    bundle: z
        .object({
            bundleId: z.uuid(),
            picks: z.array(bundlePickSchema).min(1),
            answers: z.record(z.string(), z.string()).optional(),
        })
        .nullable()
        .optional(),
});

export const createPublicOrderSchema = z.object({
    customer: z.object({
        name: z.string().min(1).max(120),
        phone: phoneSchema,
    }),
    items: z.array(cartItemSchema).min(1),
    observation: z.string().max(500).nullable().optional(),
    address: z.string().max(500).nullable().optional(),
    deliveryMode: z.enum(["PICKUP", "DELIVERY"]),
    couponCode: z.string().max(40).nullable().optional(),
    paymentMethod: z.enum(["MERCADOPAGO", "CASH"]).default("MERCADOPAGO"),
    cashChangeFor: z.number().positive().max(99999.99).nullable().optional(),
});

export const validateCouponQuerySchema = z.object({
    code: z.string().min(1).max(40),
    subtotal: z.coerce.number().min(0),
});

export const customerContextQuerySchema = z.object({
    phone: phoneSchema,
});

export type CreatePublicOrderBody = z.infer<typeof createPublicOrderSchema>;
