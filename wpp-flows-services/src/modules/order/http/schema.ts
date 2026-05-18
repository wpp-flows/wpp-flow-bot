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
});

export const updateOrderStatusSchema = z.object({
    status: z.enum(ORDER_STATUSES),
});
