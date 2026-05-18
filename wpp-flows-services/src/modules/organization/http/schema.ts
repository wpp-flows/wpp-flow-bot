import { z } from "zod";

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
});

export type CreateOrganizationDTO = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationDTO = z.infer<typeof updateOrganizationSchema>;
