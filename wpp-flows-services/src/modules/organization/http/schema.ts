import { z } from "zod";

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export const createOrganizationSchema = z.object({
    name: z.string().min(2).max(120),
    slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/).optional(),
});

export const updateOrganizationSchema = z.object({
    name: z.string().min(2).max(120).optional(),
    slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/).optional(),
    mercadoPagoAccessToken: z.string().min(1).max(500).nullable().optional(),
    mercadoPagoPublicKey: z.string().min(1).max(500).nullable().optional(),
    mercadoPagoWebhookSecret: z.string().min(1).max(500).nullable().optional(),
    payoutPixKey: z.string().min(1).max(200).nullable().optional(),
    payoutPixKeyType: z
        .enum(["cpf", "cnpj", "email", "phone", "random"])
        .nullable()
        .optional(),
    notificationPreferences: z
        .object({
            newOrders: z.boolean(),
            botDisconnects: z.boolean(),
            idleConversations: z.boolean(),
        })
        .optional(),
    paymentTimeoutMinutes: z.number().int().min(1).max(180).optional(),
    paymentCancelMessage: z.string().max(1000).nullable().optional(),
    paymentTimeoutMessage: z.string().max(1000).nullable().optional(),
    paymentReceivedMessage: z.string().max(1000).nullable().optional(),
    deliveryFee: z.number().min(0).max(10000).optional(),
    workingDaysOfWeek: z
        .array(z.number().int().min(0).max(6))
        .max(7)
        .optional(),
    workingStartTime: z
        .string()
        .regex(TIME_REGEX, "Use o formato HH:MM (24h).")
        .nullable()
        .optional(),
    workingEndTime: z
        .string()
        .regex(TIME_REGEX, "Use o formato HH:MM (24h).")
        .nullable()
        .optional(),
    outOfHoursMessage: z.string().max(800).nullable().optional(),
    localWorkingDaysOfWeek: z
        .array(z.number().int().min(0).max(6))
        .max(7)
        .optional(),
    localWorkingStartTime: z
        .string()
        .regex(TIME_REGEX, "Use o formato HH:MM (24h).")
        .nullable()
        .optional(),
    localWorkingEndTime: z
        .string()
        .regex(TIME_REGEX, "Use o formato HH:MM (24h).")
        .nullable()
        .optional(),
    localOutOfHoursMessage: z.string().max(800).nullable().optional(),
    botCooldownMinutes: z.number().int().min(0).max(1440).optional(),
});

export type CreateOrganizationDTO = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationDTO = z.infer<typeof updateOrganizationSchema>;
