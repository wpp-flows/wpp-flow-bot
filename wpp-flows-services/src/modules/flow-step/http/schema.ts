import { z } from "zod";
import { stepInputSchema } from "@/modules/flow/http/schema";

export const createFlowStepSchema = stepInputSchema;

export const updateFlowStepSchema = stepInputSchema.partial().refine(
    (data) => Object.keys(data).length > 0,
    "At least one field must be provided."
);

export type CreateFlowStepInput = z.infer<typeof createFlowStepSchema>;
export type UpdateFlowStepInput = z.infer<typeof updateFlowStepSchema>;
