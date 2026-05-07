import { z } from "zod";

export const createOrganizationSchema = z.object({
    name: z.string().min(2).max(120),
    slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/).optional(),
});

export const updateOrganizationSchema = z.object({
    name: z.string().min(2).max(120).optional(),
    slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/).optional(),
});

export type CreateOrganizationDTO = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationDTO = z.infer<typeof updateOrganizationSchema>;
