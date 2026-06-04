import { z } from "zod";

export const createInvitationSchema = z.object({
    email: z.string().email().max(160),
});

export const acceptInvitationSchema = z.object({
    token: z.string().min(16).max(256),
    name: z.string().trim().min(2).max(120),
    password: z.string().min(8).max(128),
});
