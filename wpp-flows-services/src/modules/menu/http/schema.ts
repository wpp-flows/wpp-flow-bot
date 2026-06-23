import { z } from "zod";

const serviceTypeSchema = z.enum(["DELIVERY", "LOCAL"]);

export const createCategorySchema = z.object({
    serviceType: serviceTypeSchema,
    name: z.string().min(1).max(120),
    description: z.string().max(500).optional(),
});

export const updateCategorySchema = z.object({
    name: z.string().min(1).max(120).optional(),
    description: z.string().max(500).optional(),
});

export const reorderCategoriesSchema = z.object({
    serviceType: serviceTypeSchema,
    orderedIds: z.array(z.uuid()).min(1),
});

const daysOfWeekSchema = z.array(z.number().int().min(0).max(6));

const optionSchema = z.object({
    id: z.string().min(1).max(64),
    name: z.string().min(1).max(120),
    additionalPrice: z.number().nonnegative().max(100_000),
    imageUrl: z
        .string()
        .optional()
        .refine((v) => !v || /^https?:\/\//.test(v), "imageUrl deve ser uma URL válida"),
});

const optionGroupSchema = z
    .object({
        id: z.string().min(1).max(64),
        title: z.string().min(1).max(120),
        subtitle: z.string().max(200).nullable().optional(),
        minSelections: z.number().int().min(0).max(50),
        maxSelections: z.number().int().min(1).max(50),
        options: z.array(optionSchema).min(1).max(50),
    })
    .superRefine((g, ctx) => {
        if (g.maxSelections < g.minSelections) {
            ctx.addIssue({
                code: "custom",
                path: ["maxSelections"],
                message: "maxSelections deve ser ≥ minSelections",
            });
        }
        if (g.minSelections > g.options.length) {
            ctx.addIssue({
                code: "custom",
                path: ["minSelections"],
                message: "minSelections excede o total de opções",
            });
        }
    });

const moneyOptional = z.number().nonnegative().max(100_000).nullable().optional();

export const createItemSchema = z.object({
    categoryId: z.uuid(),
    name: z.string().min(1).max(120),
    description: z.string().max(500),
    price: z.number().nonnegative(),
    promotionalPrice: moneyOptional,
    imageUrl: z.url().optional(),
    available: z.boolean().optional(),
    availableDaysOfWeek: daysOfWeekSchema.optional(),
    optionGroups: z.array(optionGroupSchema).max(20).optional(),
});

export const updateItemSchema = z.object({
    categoryId: z.uuid().optional(),
    name: z.string().min(1).max(120).optional(),
    description: z.string().max(500).optional(),
    price: z.number().nonnegative().optional(),
    promotionalPrice: moneyOptional,
    imageUrl: z.url().nullable().optional(),
    available: z.boolean().optional(),
    availableDaysOfWeek: daysOfWeekSchema.optional(),
    optionGroups: z.array(optionGroupSchema).max(20).optional(),
});

export const reorderItemsSchema = z.object({
    categoryId: z.uuid(),
    orderedIds: z.array(z.uuid()).min(1),
});

export const listMenuQuerySchema = z.object({
    serviceType: serviceTypeSchema.optional(),
});
