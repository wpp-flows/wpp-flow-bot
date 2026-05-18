import { z } from "zod";

export const requestWithdrawalSchema = z.object({
    amount: z.coerce.number().positive().max(1_000_000),
    note: z.string().max(200).optional(),
});

export const updateMpCredentialsSchema = z.object({
    mercadoPagoAccessToken: z.string().min(1).max(500).nullable().optional(),
    mercadoPagoPublicKey: z.string().min(1).max(500).nullable().optional(),
    mercadoPagoWebhookSecret: z.string().min(1).max(500).nullable().optional(),
});
