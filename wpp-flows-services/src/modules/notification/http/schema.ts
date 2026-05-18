import { z } from "zod";

export const listNotificationsQuerySchema = z.object({
    cursor: z.iso.datetime().optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
});
