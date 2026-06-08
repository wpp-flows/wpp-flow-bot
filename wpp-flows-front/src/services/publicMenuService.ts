import { apiCall } from '@/instances/api';
import type {
  CreatePublicOrderPayload,
  CreatePublicOrderResponse,
  CustomerContextResponse,
  PublicMenuResponse,
  PublicOrderStatusResponse,
  ValidatedCoupon,
} from '@/types/publicMenu';

export const publicMenuService = {
  getMenu(
    slug: string,
    options: { serviceType?: 'DELIVERY' | 'LOCAL' } = {},
  ): Promise<PublicMenuResponse> {
    const qs = options.serviceType ? `?serviceType=${options.serviceType}` : '';
    return apiCall<PublicMenuResponse>({
      endpoint: `/api/public/menu/${slug}${qs}`,
    });
  },

  createOrder(
    slug: string,
    payload: CreatePublicOrderPayload,
  ): Promise<CreatePublicOrderResponse> {
    return apiCall<CreatePublicOrderResponse>({
      endpoint: `/api/public/orders/${slug}`,
      method: 'POST',
      body: payload,
    });
  },

  getOrderStatus(slug: string, orderId: string): Promise<PublicOrderStatusResponse> {
    return apiCall<PublicOrderStatusResponse>({
      endpoint: `/api/public/orders/${slug}/${orderId}`,
    });
  },

  validateCoupon(slug: string, code: string, subtotal: number): Promise<ValidatedCoupon> {
    return apiCall<ValidatedCoupon>({
      endpoint: `/api/public/orders/${slug}/coupons/validate`,
      query: { code, subtotal },
    });
  },

  getCustomerContext(slug: string, phone: string): Promise<CustomerContextResponse> {
    return apiCall<CustomerContextResponse>({
      endpoint: `/api/public/orders/${slug}/customer-context`,
      query: { phone },
    });
  },

  cancelOrder(slug: string, orderId: string): Promise<void> {
    return apiCall({
      endpoint: `/api/public/orders/${slug}/${orderId}/cancel`,
      method: 'POST',
    });
  },
};
