import { z } from "zod";

export const conversationFiltersSchema = z.object({
    search: z.string().optional(),
    status: z.enum(["OPEN", "CLOSED", "PENDING"]).optional(),
    botId: z.uuid().optional(),
    fromDate: z.iso.datetime().optional(),
    toDate: z.iso.datetime().optional(),
});

export const sendMessageSchema = z.object({
    content: z.string().min(1).max(4096),
});

export const setBotActiveSchema = z.object({
    botActive: z.boolean(),
});

export const updateStatusSchema = z.object({
    status: z.enum(["OPEN", "CLOSED", "PENDING"]),
});
