import { apiCall } from '@/instances/api';
import type { Coupon, CouponInput } from '@/types';

export const couponService = {
  list(): Promise<Coupon[]> {
    return apiCall<Coupon[]>({ endpoint: '/api/coupons' });
  },

  create(payload: CouponInput): Promise<Coupon> {
    return apiCall<Coupon>({
      endpoint: '/api/coupons',
      method: 'POST',
      body: payload,
    });
  },

  update(id: string, payload: Partial<CouponInput>): Promise<Coupon> {
    return apiCall<Coupon>({
      endpoint: `/api/coupons/${id}`,
      method: 'PATCH',
      body: payload,
    });
  },

  remove(id: string): Promise<void> {
    return apiCall({ endpoint: `/api/coupons/${id}`, method: 'DELETE' });
  },
};
