import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Email é obrigatório').email('Email inválido'),
  password: z
    .string()
    .min(8, 'A senha deve conter pelo menos 8 caracteres')
    .max(64, 'A senha é muito longa'),
  remember: z.boolean().optional(),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const signUpSchema = z.object({
  name: z.string().min(2, 'O nome deve conter pelo menos 2 caracteres').max(80),
  email: z.string().min(1, 'Email é obrigatório').email('Email inválido'),
  password: z
    .string()
    .min(8, 'A senha deve conter pelo menos 8 caracteres')
    .max(64, 'A senha é muito longa'),
});
export type SignUpFormValues = z.infer<typeof signUpSchema>;

export const acceptInvitationSchema = z.object({
  name: z.string().trim().min(2, 'O nome é muito curto.').max(120),
  password: z
    .string()
    .min(8, 'A senha precisa de pelo menos 8 caracteres.')
    .max(64, 'A senha é muito longa.'),
});
export type AcceptInvitationFormValues = z.infer<typeof acceptInvitationSchema>;

export const organizationOnboardingSchema = z.object({
  name: z.string().min(2, 'O nome do restaurante deve conter pelo menos 2 caracteres').max(120),
  slug: z
    .string()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hífens')
    .optional()
    .or(z.literal('')),
});
export type OrganizationOnboardingFormValues = z.infer<typeof organizationOnboardingSchema>;

export const createBotSchema = z.object({
  name: z.string().min(2, 'O nome deve conter pelo menos 2 caracteres').max(48),
  phoneNumber: z
    .string()
    .optional()
    .refine((v) => !v || /^\+?[1-9]\d{6,14}$/.test(v), 'Formato de telefone inválido'),
});
export type CreateBotFormValues = z.infer<typeof createBotSchema>;

export const categorySchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório').max(40),
  description: z.string().max(120).optional().or(z.literal('')),
});
export type CategoryFormValues = z.infer<typeof categorySchema>;

export const additionalSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1, 'O nome é obrigatório').max(120),
  price: z
    .union([z.string(), z.number()])
    .transform((v) => (typeof v === 'string' ? Number(v) : v))
    .pipe(z.number().min(0, 'Preço deve ser positivo').max(100_000)),
});
export type AdditionalFormValues = z.infer<typeof additionalSchema>;

export const menuItemSchema = z.object({
  categoryId: z.string().min(1, 'A categoria é obrigatória'),
  name: z.string().min(1, 'O nome é obrigatório').max(60),
  description: z.string().max(280).optional().or(z.literal('')),
  price: z
    .union([z.string(), z.number()])
    .transform((v) => (typeof v === 'string' ? Number(v) : v))
    .pipe(z.number().min(0, 'O preço deve ser positivo').max(100_000)),
  imageUrl: z
    .string()
    .optional()
    .refine((v) => !v || /^https?:\/\//.test(v), 'Deve ser uma URL válida'),
  available: z.boolean().optional().default(true),
  availableDaysOfWeek: z
    .array(z.number().int().min(0).max(6))
    .optional()
    .default([]),
  availableForDelivery: z.boolean().optional().default(true),
  availableForLocal: z.boolean().optional().default(true),
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
