import { z } from "zod";

export const createBotSchema = z.object({
    name: z.string().min(1).max(120),
    phoneNumber: z.string().max(40).optional(),
    webhookUrl: z.url().optional(),
    flowId: z.uuid().optional(),
});

export const updateBotSchema = z.object({
    name: z.string().min(1).max(120).optional(),
    phoneNumber: z.string().max(40).nullable().optional(),
    webhookUrl: z.url().nullable().optional(),
    flowId: z.uuid().nullable().optional(),
});

export const setBotIsActiveSchema = z.object({
    isActive: z.boolean(),
});
