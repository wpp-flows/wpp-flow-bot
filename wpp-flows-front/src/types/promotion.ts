export type PromotionKind = 'NTH_ORDER_DISCOUNT' | 'DAILY_MESSAGE';
export type PromotionDiscountType = 'PERCENT' | 'FIXED';

export interface Promotion {
  id: string;
  organizationId: string;
  kind: PromotionKind;
  name: string;
  isActive: boolean;
  nthOrder: number | null;
  discountType: PromotionDiscountType | null;
  discountValue: string | null;
  daysOfWeek: number[];
  message: string | null;
  featuredItemId: string | null;
  promotionalPrice: string | null;
  teaserOrderOffset: number | null;
  teaserMessage: string | null;
  qualifyingMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PromotionInput {
  kind: PromotionKind;
  name: string;
  isActive?: boolean;
  nthOrder?: number | null;
  discountType?: PromotionDiscountType | null;
  discountValue?: number | null;
  daysOfWeek?: number[];
  message?: string | null;
  featuredItemId?: string | null;
  promotionalPrice?: number | null;
  teaserOrderOffset?: number | null;
  teaserMessage?: string | null;
  qualifyingMessage?: string | null;
}
