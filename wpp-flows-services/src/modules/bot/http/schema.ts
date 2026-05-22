import { z } from "zod";

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const workingHoursFields = {
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
};

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
    ...workingHoursFields,
});
