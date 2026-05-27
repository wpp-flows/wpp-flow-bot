export type CouponDiscountType = 'PERCENT' | 'FIXED';

export interface Coupon {
  id: string;
  organizationId: string;
  code: string;
  discountType: CouponDiscountType;
  discountValue: string;
  isActive: boolean;
  validFrom: string | null;
  validUntil: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CouponInput {
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  isActive?: boolean;
  validFrom?: string | null;
  validUntil?: string | null;
  description?: string | null;
}
