import type { PromotionDiscountType, PromotionKind } from '@/types';

export const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;

export interface PromotionFormState {
  kind: PromotionKind;
  name: string;
  isActive: boolean;
  nthOrder: string;
  discountType: PromotionDiscountType;
  discountValue: string;
  daysOfWeek: number[];
  message: string;
  featuredItemId: string;
  promotionalPrice: string;
  teaserOrderOffset: string;
  teaserMessage: string;
}

export const emptyPromotionForm: PromotionFormState = {
  kind: 'NTH_ORDER_DISCOUNT',
  name: '',
  isActive: true,
  nthOrder: '5',
  discountType: 'PERCENT',
  discountValue: '10',
  daysOfWeek: [],
  message: '',
  featuredItemId: '',
  promotionalPrice: '',
  teaserOrderOffset: '',
  teaserMessage: '',
};
