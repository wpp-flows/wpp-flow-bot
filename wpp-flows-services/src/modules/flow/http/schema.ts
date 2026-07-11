import { z } from "zod";

export const flowStepTypeSchema = z.enum(["MESSAGE"]);

export const stepInputSchema = z.object({
    type: flowStepTypeSchema,
    content: z.string().min(1).max(4096),
    order: z.number().int().nonnegative().optional(),
    metadata: z.record(z.string(), z.any()).nullable().optional(),
});

export const createFlowSchema = z.object({
    name: z.string().min(1).max(120),
    activate: z.boolean().optional(),
    steps: z.array(stepInputSchema).min(1),
});

export const updateFlowSchema = z.object({
    name: z.string().min(1).max(120),
});

export const newFlowVersionSchema = z.object({
    activate: z.boolean().optional(),
    steps: z.array(stepInputSchema).optional(),
});

export const replaceStepsSchema = z.object({
    steps: z.array(stepInputSchema).min(1),
});

export const reorderStepsSchema = z.object({
    orderedIds: z.array(z.uuid()).min(1),
});
