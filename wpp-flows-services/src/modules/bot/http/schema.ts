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

export const embeddedSignupSchema = z.object({
    name: z.string().min(1).max(120).optional(),
    code: z.string().min(1).max(1024),
    wabaId: z.string().min(1).max(64),
    phoneNumberId: z.string().min(1).max(64),
});

/**
 * Manual connection from a token you already hold (Meta test number, or a
 * System User token). Bridges the gap before Embedded Signup is App-Review
 * approved — used for local testing and the Meta demo video.
 */
export const cloudManualSchema = z.object({
    name: z.string().min(1).max(120).optional(),
    phoneNumberId: z.string().min(1).max(64),
    accessToken: z.string().min(1).max(1024),
    wabaId: z.string().min(1).max(64).optional(),
});

export const testMessageSchema = z.object({
    to: z
        .string()
        .min(8)
        .max(20)
        .regex(/^[+\d\s()-]+$/, "Telefone inválido"),
    text: z.string().max(1000).optional(),
});
