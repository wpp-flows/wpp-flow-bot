import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '@/services/orderService';
import { invalidateQueriesByFilters, queryKeys } from '@/lib/queryClient';
import { toast } from '@/stores/uiStore';
import {
  ORDER_STATUSES,
  STATUS_LABEL,
  nextStatusOptions,
  orderNumber,
} from '@/helpers/order-helpers';
import type { Order, OrderStatus } from '@/types';

export interface KanbanColumnDescriptor {
  status: OrderStatus;
  title: string;
  orders: Order[];
}

export interface UseOrderKanbanOptions {
  notifyCustomer?: boolean;
}

export function useOrderKanban(
  orders: Order[],
  options: UseOrderKanbanOptions = {},
) {
  const notifyCustomer = options.notifyCustomer ?? true;
  const qc = useQueryClient();
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  const columns = useMemo<KanbanColumnDescriptor[]>(() => {
    const buckets: Record<OrderStatus, Order[]> = {
      RECEIVED: [],
      PREPARING: [],
      OUT_FOR_DELIVERY: [],
      DELIVERED: [],
      CANCELED: [],
    };
    for (const order of orders) buckets[order.status].push(order);
    for (const status of ORDER_STATUSES) {
      buckets[status].sort(
        (a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)),
      );
    }
    return ORDER_STATUSES.map((status) => ({
      status,
      title: STATUS_LABEL[status],
      orders: buckets[status],
    }));
  }, [orders]);

  const orderById = useMemo(() => {
    const map = new Map<string, Order>();
    for (const order of orders) map.set(order.id, order);
    return map;
  }, [orders]);

  const activeOrder = activeOrderId ? orderById.get(activeOrderId) ?? null : null;

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      orderService.updateStatus(id, status, { notifyCustomer }),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: queryKeys.orders.today });
      const previous = qc.getQueryData<Order[]>(queryKeys.orders.today);
      if (previous) {
        qc.setQueryData<Order[]>(
          queryKeys.orders.today,
          previous.map((o) => (o.id === id ? { ...o, status } : o)),
        );
      }
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKeys.orders.today, ctx.previous);
      toast.error(err instanceof Error ? err.message : 'Falha ao atualizar status');
    },
    onSuccess: (_data, vars) => {
      const updated = orderById.get(vars.id);
      toast.success(
        `Pedido ${updated ? orderNumber(updated.sequence) : ''} → ${STATUS_LABEL[vars.status]}`.trim(),
      );
    },
    onSettled: () => {
      void invalidateQueriesByFilters(qc, [
        { queryKey: queryKeys.orders.all },
        { queryKey: queryKeys.reports.daily },
      ]);
    },
  });

  function moveOrder(orderId: string, nextStatus: OrderStatus): void {
    const order = orderById.get(orderId);
    if (!order) return;
    if (order.status === nextStatus) return;
    const allowed = nextStatusOptions(order.status);
    if (!allowed.includes(nextStatus)) {
      toast.warning(
        `Transição inválida`,
        `${STATUS_LABEL[order.status]} → ${STATUS_LABEL[nextStatus]} não é permitida.`,
      );
      return;
    }
    updateStatus.mutate({ id: orderId, status: nextStatus });
  }

  return {
    columns,
    activeOrder,
    setActiveOrderId,
    moveOrder,
    isMutating: updateStatus.isPending,
  };
}
