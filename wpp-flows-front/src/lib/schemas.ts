import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(64, 'Password is too long'),
  remember: z.boolean().optional(),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const createBotSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(48),
  phoneNumber: z
    .string()
    .optional()
    .refine((v) => !v || /^\+?[1-9]\d{6,14}$/.test(v), 'Invalid phone format'),
  webhookUrl: z
    .string()
    .optional()
    .refine((v) => !v || /^https?:\/\//.test(v), 'Must be a valid URL'),
});
export type CreateBotFormValues = z.infer<typeof createBotSchema>;

export const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(40),
  description: z.string().max(120).optional().or(z.literal('')),
});
export type CategoryFormValues = z.infer<typeof categorySchema>;

export const menuItemSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  name: z.string().min(1, 'Name is required').max(60),
  description: z.string().max(280).optional().or(z.literal('')),
  price: z
    .union([z.string(), z.number()])
    .transform((v) => (typeof v === 'string' ? Number(v) : v))
    .pipe(z.number().min(0, 'Price must be positive').max(100_000)),
  imageUrl: z
    .string()
    .optional()
    .refine((v) => !v || /^https?:\/\//.test(v), 'Must be a valid URL'),
  available: z.boolean().optional().default(true),
});
export type MenuItemFormValues = z.infer<typeof menuItemSchema>;

export const flowStepSchema = z.object({
  id: z.string(),
  type: z.enum(['message', 'menu', 'item-selection', 'confirmation', 'payment']),
  title: z.string().min(1).max(60),
  content: z.string().min(1).max(800),
  options: z
    .array(
      z.object({
        id: z.string(),
        label: z.string().min(1).max(40),
        value: z.string().min(1).max(40),
        nextStepId: z.string().optional(),
      }),
    )
    .optional(),
});
export type FlowStepFormValues = z.infer<typeof flowStepSchema>;

export const flowSchema = z.object({
  name: z.string().min(1).max(60),
  description: z.string().max(180).optional().or(z.literal('')),
});
export type FlowFormValues = z.infer<typeof flowSchema>;
