import { apiCall } from '@/instances/api';
import type { RestaurantTable } from '@/types';

export const tableService = {
  list(): Promise<RestaurantTable[]> {
    return apiCall<RestaurantTable[]>({ endpoint: '/api/local/tables' });
  },

  get(id: string): Promise<RestaurantTable> {
    return apiCall<RestaurantTable>({ endpoint: `/api/local/tables/${id}` });
  },

  create(payload: {
    label: string;
    seats?: number | null;
    notes?: string | null;
    position?: number;
  }): Promise<RestaurantTable> {
    return apiCall<RestaurantTable>({
      endpoint: '/api/local/tables',
      method: 'POST',
      body: payload,
    });
  },

  update(
    id: string,
    payload: {
      label?: string;
      seats?: number | null;
      notes?: string | null;
      position?: number;
    },
  ): Promise<RestaurantTable> {
    return apiCall<RestaurantTable>({
      endpoint: `/api/local/tables/${id}`,
      method: 'PATCH',
      body: payload,
    });
  },

  remove(id: string): Promise<void> {
    return apiCall<void>({
      endpoint: `/api/local/tables/${id}`,
      method: 'DELETE',
    });
  },

  regenerateQr(id: string): Promise<RestaurantTable> {
    return apiCall<RestaurantTable>({
      endpoint: `/api/local/tables/${id}/regenerate-qr`,
      method: 'POST',
    });
  },
};
