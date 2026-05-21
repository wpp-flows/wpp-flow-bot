import { z } from "zod";

export const updateMpCredentialsSchema = z.object({
    mercadoPagoAccessToken: z.string().min(1).max(500).nullable().optional(),
    mercadoPagoPublicKey: z.string().min(1).max(500).nullable().optional(),
    mercadoPagoWebhookSecret: z.string().min(1).max(500).nullable().optional(),
});
