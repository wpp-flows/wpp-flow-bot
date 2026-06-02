import { apiCall } from '@/instances/api';
import type { Order, OrderFilters, OrderStatus } from '@/types';

export const orderService = {
  list(filters: OrderFilters = {}): Promise<Order[]> {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.customerId) params.set('customerId', filters.customerId);
    if (filters.fromDate) params.set('fromDate', filters.fromDate);
    if (filters.toDate) params.set('toDate', filters.toDate);
    if (filters.date) params.set('date', filters.date);
    const qs = params.toString();
    return apiCall<Order[]>({
      endpoint: qs ? `/api/orders?${qs}` : '/api/orders',
    });
  },

  getById(id: string): Promise<Order> {
    return apiCall<Order>({ endpoint: `/api/orders/${id}` });
  },

  updateStatus(
    id: string,
    status: OrderStatus,
    options: { notifyCustomer?: boolean } = {},
  ): Promise<Order> {
    return apiCall<Order>({
      endpoint: `/api/orders/${id}/status`,
      method: 'PATCH',
      body: { status, notifyCustomer: options.notifyCustomer ?? true },
    });
  },

  markPaid(id: string): Promise<Order> {
    return apiCall<Order>({
      endpoint: `/api/orders/${id}/mark-paid`,
      method: 'PATCH',
    });
  },
};
