import { z } from "zod";

export const createCategorySchema = z.object({
    name: z.string().min(1).max(120),
    description: z.string().max(500).optional(),
});

export const updateCategorySchema = z.object({
    name: z.string().min(1).max(120).optional(),
    description: z.string().max(500).optional(),
});

export const reorderCategoriesSchema = z.object({
    orderedIds: z.array(z.uuid()).min(1),
});

const daysOfWeekSchema = z.array(z.number().int().min(0).max(6));

const additionalSchema = z.object({
    id: z.string().min(1).max(64),
    name: z.string().min(1).max(120),
    price: z.number().nonnegative(),
});

export const createItemSchema = z.object({
    categoryId: z.uuid(),
    name: z.string().min(1).max(120),
    description: z.string().max(500),
    price: z.number().nonnegative(),
    imageUrl: z.url().optional(),
    available: z.boolean().optional(),
    availableDaysOfWeek: daysOfWeekSchema.optional(),
    availableForDelivery: z.boolean().optional(),
    availableForLocal: z.boolean().optional(),
    additionals: z.array(additionalSchema).max(50).optional(),
});

export const updateItemSchema = z.object({
    categoryId: z.uuid().optional(),
    name: z.string().min(1).max(120).optional(),
    description: z.string().max(500).optional(),
    price: z.number().nonnegative().optional(),
    imageUrl: z.url().nullable().optional(),
    available: z.boolean().optional(),
    availableDaysOfWeek: daysOfWeekSchema.optional(),
    availableForDelivery: z.boolean().optional(),
    availableForLocal: z.boolean().optional(),
    additionals: z.array(additionalSchema).max(50).optional(),
});

export const reorderItemsSchema = z.object({
    categoryId: z.uuid(),
    orderedIds: z.array(z.uuid()).min(1),
});
