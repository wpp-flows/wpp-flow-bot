import { z } from "zod";

export const ORDER_STATUSES = [
    "RECEIVED",
    "PREPARING",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELED",
] as const;

export const listOrdersQuerySchema = z.object({
    status: z.enum(ORDER_STATUSES).optional(),
    customerId: z.uuid().optional(),
    fromDate: z.iso.datetime().optional(),
    toDate: z.iso.datetime().optional(),
    date: z
        .union([z.literal("today"), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)])
        .optional(),
    serviceType: z.enum(["DELIVERY", "LOCAL"]).optional(),
    tableId: z.uuid().optional(),
    unbilledOnly: z
        .union([z.literal("true"), z.literal("false")])
        .optional(),
});

export const updateOrderStatusSchema = z.object({
    status: z.enum(ORDER_STATUSES),
    notifyCustomer: z.boolean().optional().default(true),
});
