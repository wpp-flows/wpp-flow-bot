import { apiCall } from '@/instances/api';
import type { LocalPaymentMethod, Order, TableBill } from '@/types';

export interface CloseBillResult {
  bill: TableBill;
  orders: Order[];
}

export const billService = {
  list(): Promise<TableBill[]> {
    return apiCall<TableBill[]>({ endpoint: '/api/local/bills' });
  },

  get(id: string): Promise<CloseBillResult> {
    return apiCall<CloseBillResult>({ endpoint: `/api/local/bills/${id}` });
  },

  closeTable(
    tableId: string,
    payload: {
      paymentMethod: LocalPaymentMethod;
      notes?: string | null;
    },
  ): Promise<CloseBillResult> {
    return apiCall<CloseBillResult>({
      endpoint: `/api/local/tables/${tableId}/close-bill`,
      method: 'POST',
      body: payload,
    });
  },
};
