import { useEffect } from 'react';
import { useQueryClient, type InvalidateQueryFilters } from '@tanstack/react-query';
import { API_BASE_URL } from '@/instances/api';
import { invalidateQueriesByFilters, queryKeys } from '@/lib/queryClient';

export type RealtimeEvent =
  | {
      kind: 'order.created';
      orderId: string;
      tableId: string | null;
      serviceType: 'DELIVERY' | 'LOCAL';
    }
  | {
      kind: 'order.updated';
      orderId: string;
      tableId: string | null;
      serviceType: 'DELIVERY' | 'LOCAL';
    }
  | { kind: 'table.updated'; tableId: string }
  | { kind: 'table.deleted'; tableId: string }
  | { kind: 'bill.closed'; tableId: string; billId: string }
  | {
      kind: 'chat.message';
      conversationId: string;
      direction: 'IN' | 'OUT';
    }
  | { kind: 'chat.conversation'; conversationId: string };

export function useRealtimeSync(enabled: boolean): void {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    if (typeof globalThis.window === 'undefined') return;

    const url = new URL(
      'api/realtime/events',
      API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`,
    ).toString();

    const handleEvent = (event: RealtimeEvent): void => {
      let filters: InvalidateQueryFilters[];
      switch (event.kind) {
        case 'order.created':
        case 'order.updated': {
          filters = [
            { queryKey: queryKeys.orders.all },
            { queryKey: queryKeys.localOrders.all },
          ];
          if (event.tableId) {
            filters.push(
              { queryKey: queryKeys.localOrders.byTable(event.tableId) },
              { queryKey: queryKeys.localTables.detail(event.tableId) },
              { queryKey: queryKeys.localTables.all },
            );
          }
          break;
        }
        case 'table.updated':
          filters = [
            { queryKey: queryKeys.localTables.all },
            { queryKey: queryKeys.localTables.detail(event.tableId) },
          ];
          break;
        case 'table.deleted':
          filters = [{ queryKey: queryKeys.localTables.all }];
          break;
        case 'bill.closed':
          filters = [
            { queryKey: queryKeys.localTables.all },
            { queryKey: queryKeys.localTables.detail(event.tableId) },
            { queryKey: queryKeys.localOrders.all },
            { queryKey: queryKeys.localOrders.byTable(event.tableId) },
            { queryKey: queryKeys.localBills.all },
            { queryKey: queryKeys.reports.daily },
            { queryKey: queryKeys.localWallet.summary },
          ];
          break;
        case 'chat.message':
          filters = [
            { queryKey: queryKeys.chats.all },
            { queryKey: queryKeys.chats.messages(event.conversationId) },
          ];
          break;
        case 'chat.conversation':
          filters = [
            { queryKey: queryKeys.chats.all },
            { queryKey: queryKeys.chats.detail(event.conversationId) },
          ];
          break;
        default:
          return;
      }
      invalidateQueriesByFilters(qc, filters).catch(() => {
      });
    };

    const source = new EventSource(url, { withCredentials: true });

    source.onmessage = (msg) => {
      try {
        handleEvent(JSON.parse(msg.data) as RealtimeEvent);
      } catch {
      }
    };

    return () => {
      source.close();
    };
  }, [enabled, qc]);
}
