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

export const optionSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1, 'Informe o nome').max(120),
  additionalPrice: z
    .union([z.string(), z.number()])
    .transform((v) => (typeof v === 'string' ? Number(v || '0') : v))
    .pipe(z.number().min(0, 'O preço deve ser positivo').max(100_000)),
  imageUrl: z
    .string()
    .optional()
    .refine((v) => !v || /^https?:\/\//.test(v), 'URL inválida'),
});
export type OptionFormValues = z.infer<typeof optionSchema>;

export const optionGroupSchema = z
  .object({
    id: z.string().min(1).max(64),
    title: z.string().min(1, 'Informe o título do grupo').max(120),
    subtitle: z.string().max(200).optional().or(z.literal('')),
    minSelections: z
      .union([z.string(), z.number()])
      .transform((v) => (typeof v === 'string' ? Number(v || '0') : v))
      .pipe(z.number().int().min(0).max(50)),
    maxSelections: z
      .union([z.string(), z.number()])
      .transform((v) => (typeof v === 'string' ? Number(v || '1') : v))
      .pipe(z.number().int().min(1).max(50)),
    options: z
      .array(optionSchema)
      .min(1, 'Adicione pelo menos uma opção')
      .max(50),
  })
  .superRefine((g, ctx) => {
    if (g.maxSelections < g.minSelections) {
      ctx.addIssue({
        code: 'custom',
        path: ['maxSelections'],
        message: 'Máximo deve ser ≥ mínimo',
      });
    }
    if (g.minSelections > g.options.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['minSelections'],
        message: 'Mínimo maior que o total de opções',
      });
    }
  });
export type OptionGroupFormValues = z.infer<typeof optionGroupSchema>;

const optionalMoney = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === '' || v === null) return null;
    const n = typeof v === 'string' ? Number(v) : v;
    return Number.isFinite(n) ? n : null;
  })
  .pipe(z.number().min(0).max(100_000).nullable());

export const menuItemSchema = z
  .object({
    categoryId: z.string().min(1, 'A categoria é obrigatória'),
    name: z.string().min(1, 'O nome é obrigatório').max(60),
    description: z.string().max(280).optional().or(z.literal('')),
    price: z
      .union([z.string(), z.number()])
      .transform((v) => (typeof v === 'string' ? Number(v) : v))
      .pipe(z.number().min(0, 'O preço deve ser positivo').max(100_000)),
    promotionalPrice: optionalMoney,
    imageUrl: z
      .string()
      .optional()
      .refine((v) => !v || /^https?:\/\//.test(v), 'Deve ser uma URL válida'),
    available: z.boolean().optional().default(true),
    availableDaysOfWeek: z
      .array(z.number().int().min(0).max(6))
      .optional()
      .default([]),
    optionGroups: z.array(optionGroupSchema).max(20).optional().default([]),
  })
  .superRefine((v, ctx) => {
    if (v.promotionalPrice != null && v.promotionalPrice >= v.price) {
      ctx.addIssue({
        code: 'custom',
        path: ['promotionalPrice'],
        message: 'Deve ser menor que o preço normal',
      });
    }
  });
export type MenuItemFormValues = z.infer<typeof menuItemSchema>;

export function deriveOptionGroupHelperText(min: number, max: number): string {
  if (max <= 1) {
    return min === 1 ? 'Escolha 1 opção' : 'Escolha até 1 opção';
  }
  if (min === 0) return `Escolha até ${max} opções`;
  if (min === max) return `Escolha ${min} opções`;
  return `Escolha entre ${min} e ${max} opções`;
}

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
    deliveryMode: z.enum(['PICKUP', 'DELIVERY', '']),
    couponCode: z.string().max(40),
    paymentMethod: z.enum(['MERCADOPAGO', 'ON_DELIVERY', 'CASH', 'DELIVERY_CARD_PIX', '']),
    cashChangeFor: z.string().max(20),
  })
  .superRefine((data, ctx) => {
    if (!data.deliveryMode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Selecione como deseja receber.',
        path: ['deliveryMode'],
      });
    }
    if (!data.paymentMethod) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Selecione uma forma de pagamento.',
        path: ['paymentMethod'],
      });
    }
    if (data.paymentMethod === 'ON_DELIVERY') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Selecione como deseja pagar na entrega.',
        path: ['paymentMethod'],
      });
    }
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
