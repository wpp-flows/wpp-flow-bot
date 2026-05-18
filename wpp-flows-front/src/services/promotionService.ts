import { apiCall } from '@/instances/api';
import type { Promotion, PromotionInput } from '@/types';

export const promotionService = {
  list(): Promise<Promotion[]> {
    return apiCall<Promotion[]>({ endpoint: '/api/promotions' });
  },
  create(payload: PromotionInput): Promise<Promotion> {
    return apiCall<Promotion>({
      endpoint: '/api/promotions',
      method: 'POST',
      body: payload,
    });
  },
  update(id: string, payload: Partial<PromotionInput>): Promise<Promotion> {
    return apiCall<Promotion>({
      endpoint: `/api/promotions/${id}`,
      method: 'PATCH',
      body: payload,
    });
  },
  remove(id: string): Promise<void> {
    return apiCall<void>({
      endpoint: `/api/promotions/${id}`,
      method: 'DELETE',
    });
  },
};
