import { z } from "zod";

export const createTableSchema = z.object({
    label: z.string().trim().min(1).max(60),
    seats: z.number().int().min(1).max(99).nullable().optional(),
    notes: z.string().max(280).nullable().optional(),
    position: z.number().int().min(0).max(1000).optional(),
});

export const updateTableSchema = z.object({
    label: z.string().trim().min(1).max(60).optional(),
    seats: z.number().int().min(1).max(99).nullable().optional(),
    notes: z.string().max(280).nullable().optional(),
    position: z.number().int().min(0).max(1000).optional(),
});

export const closeBillSchema = z.object({
    paymentMethod: z.enum(["CASH", "CARD", "PIX", "OTHER"]),
    notes: z.string().max(280).nullable().optional(),
});
