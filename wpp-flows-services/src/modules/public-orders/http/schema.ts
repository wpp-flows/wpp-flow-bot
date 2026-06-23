import { z } from "zod";

const phoneSchema = z
    .string()
    .min(8)
    .max(20)
    .regex(/^[+\d\s()\-]+$/, "Telefone inválido");

const selectionSchema = z.object({
    groupId: z.string().min(1).max(64),
    optionIds: z.array(z.string().min(1).max(64)).max(50),
});

const cartItemSchema = z.object({
    itemId: z.uuid(),
    qty: z.number().int().min(1).max(100),
    notes: z.string().max(500).nullable().optional(),
    selections: z.array(selectionSchema).max(20).optional(),
});

export const createPublicOrderSchema = z
    .object({
        customer: z
            .object({
                name: z.string().min(1).max(120),
                phone: phoneSchema,
            })
            .optional(),
        items: z.array(cartItemSchema).min(1),
        observation: z.string().max(500).nullable().optional(),
        address: z.string().max(500).nullable().optional(),
        deliveryMode: z.enum(["PICKUP", "DELIVERY"]).optional(),
        couponCode: z.string().max(40).nullable().optional(),
        paymentMethod: z
            .enum(["MERCADOPAGO", "CASH", "DELIVERY_CARD_PIX"])
            .default("MERCADOPAGO"),
        cashChangeFor: z.number().positive().max(99999.99).nullable().optional(),
        tableToken: z.string().min(8).max(128).optional(),
        customerName: z.string().trim().min(1).max(120).optional(),
    })
    .superRefine((data, ctx) => {
        if (data.paymentMethod !== "CASH" && data.cashChangeFor != null) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Troco só é permitido para pagamento em dinheiro.",
                path: ["cashChangeFor"],
            });
        }
    });

export const validateCouponQuerySchema = z.object({
    code: z.string().min(1).max(40),
    subtotal: z.coerce.number().min(0),
});

export const customerContextQuerySchema = z.object({
    phone: phoneSchema,
});

export type CreatePublicOrderBody = z.infer<typeof createPublicOrderSchema>;
