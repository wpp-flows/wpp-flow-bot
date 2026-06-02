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

export const signUpSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(64, 'Password is too long'),
});
export type SignUpFormValues = z.infer<typeof signUpSchema>;

export const organizationOnboardingSchema = z.object({
  name: z.string().min(2, 'Restaurant name must be at least 2 characters').max(120),
  slug: z
    .string()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, and dashes only')
    .optional()
    .or(z.literal('')),
});
export type OrganizationOnboardingFormValues = z.infer<typeof organizationOnboardingSchema>;

export const createBotSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(48),
  phoneNumber: z
    .string()
    .optional()
    .refine((v) => !v || /^\+?[1-9]\d{6,14}$/.test(v), 'Invalid phone format'),
});
export type CreateBotFormValues = z.infer<typeof createBotSchema>;

export const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(40),
  description: z.string().max(120).optional().or(z.literal('')),
});
export type CategoryFormValues = z.infer<typeof categorySchema>;

export const additionalSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1, 'Nome obrigatório').max(120),
  price: z
    .union([z.string(), z.number()])
    .transform((v) => (typeof v === 'string' ? Number(v) : v))
    .pipe(z.number().min(0, 'Preço deve ser positivo').max(100_000)),
});
export type AdditionalFormValues = z.infer<typeof additionalSchema>;

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
  availableDaysOfWeek: z
    .array(z.number().int().min(0).max(6))
    .optional()
    .default([]),
  additionals: z.array(additionalSchema).max(50).optional().default([]),
});
export type MenuItemFormValues = z.infer<typeof menuItemSchema>;

export const flowStepSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['MESSAGE']),
  content: z.string().min(1).max(800),
  order: z.number().int().nonnegative().optional(),
  metadata: z.record(z.string(), z.any()).nullable().optional(),
});
export type FlowStepFormValues = z.infer<typeof flowStepSchema>;

export const flowSchema = z.object({
  name: z.string().min(1).max(60),
});
export type FlowFormValues = z.infer<typeof flowSchema>;

export const publicCheckoutSchema = z
  .object({
    name: z.string().trim().min(1, 'Informe seu nome.').max(120),
    phone: z
      .string()
      .trim()
      .min(1, 'Informe seu telefone.')
      .max(20)
      .regex(/^[+\d\s()\-]+$/, 'Telefone inválido.'),
    addressStreet: z.string().max(200),
    addressNumber: z.string().max(20),
    addressNeighborhood: z.string().max(120),
    addressNotes: z.string().max(300),
    observation: z.string().max(500),
    deliveryMode: z.enum(['PICKUP', 'DELIVERY']),
    couponCode: z.string().max(40),
    paymentMethod: z.enum(['MERCADOPAGO', 'CASH']),
    cashChangeFor: z.string().max(20),
  })
  .superRefine((data, ctx) => {
    if (data.deliveryMode === 'DELIVERY') {
      if (!data.addressStreet.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Informe a rua.',
          path: ['addressStreet'],
        });
      }
      if (!data.addressNumber.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Informe o número.',
          path: ['addressNumber'],
        });
      }
      if (!data.addressNeighborhood.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Informe o bairro.',
          path: ['addressNeighborhood'],
        });
      }
    }
    if (data.paymentMethod === 'CASH' && data.cashChangeFor.trim()) {
      const parsed = Number(data.cashChangeFor.replace(',', '.'));
      if (!Number.isFinite(parsed) || parsed <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Valor inválido.',
          path: ['cashChangeFor'],
        });
      }
    }
  });
export type PublicCheckoutFormValues = z.infer<typeof publicCheckoutSchema>;
