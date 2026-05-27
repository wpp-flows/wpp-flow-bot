export type PromotionKind = 'NTH_ORDER_DISCOUNT' | 'DAILY_MESSAGE' | 'BUNDLE';
export type PromotionDiscountType = 'PERCENT' | 'FIXED';

export interface BundleComponent {
  id: string;
  label: string;
  itemIds: string[];
  count: number;
  free: boolean;
}

export interface BundleQuestion {
  id: string;
  label: string;
  fieldKey: string;
}

export interface BundleConfig {
  components: BundleComponent[];
  price: string;
  questions: BundleQuestion[];
}

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
  bundle: BundleConfig | null;
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
  bundle?: BundleConfig | null;
}
