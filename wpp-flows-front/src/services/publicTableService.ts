import { apiCall } from '@/instances/api';
import type {
  PublicTableOrdersResponse,
  PublicTableResolved,
} from '@/types';

export const publicTableService = {
  resolve(token: string): Promise<PublicTableResolved> {
    return apiCall<PublicTableResolved>({
      endpoint: `/api/public/tables/${encodeURIComponent(token)}`,
    });
  },

  requestBill(token: string): Promise<{ ok: true; billRequestedAt: string | null }> {
    return apiCall<{ ok: true; billRequestedAt: string | null }>({
      endpoint: `/api/public/tables/${encodeURIComponent(token)}/request-bill`,
      method: 'POST',
    });
  },

  listOrders(token: string): Promise<PublicTableOrdersResponse> {
    return apiCall<PublicTableOrdersResponse>({
      endpoint: `/api/public/tables/${encodeURIComponent(token)}/orders`,
    });
  },
};
