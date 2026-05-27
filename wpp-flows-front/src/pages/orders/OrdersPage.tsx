import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Receipt, Search } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { orderService } from '@/services/orderService';
import { invalidateQueriesByFilters, queryKeys } from '@/lib/queryClient';
import { toast } from '@/stores/uiStore';
import { cn } from '@/lib/utils';
import type { OrderStatus } from '@/types';
import { FilterChip } from './components/FilterChip';
import { OrderDetail } from './components/OrderDetail';
import { OrderRowSummary } from './components/OrderRowSummary';
import { ORDER_STATUSES, STATUS_LABEL, orderNumber } from '../../helpers/order-helpers';

type StatusFilter = OrderStatus | 'all';

export function OrdersPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const openOrder = (id: string) => {
    setSelectedId(id);
    if (
      typeof globalThis.window !== 'undefined' &&
      !globalThis.window.matchMedia('(min-width: 1280px)').matches
    ) {
      setMobileDetailOpen(true);
    }
  };

  const ordersQ = useQuery({
    queryKey: queryKeys.orders.all,
    queryFn: () => orderService.list({}),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      orderService.updateStatus(id, status),
    onSuccess: () => {
      void invalidateQueriesByFilters(qc, [{ queryKey: queryKeys.orders.all }]);
      toast.success('Status atualizado');
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Falha ao atualizar status'),
  });

  const orders = ordersQ.data ?? [];
  const countsByStatus = useMemo(() => {
    const counts: Record<OrderStatus, number> = {
      RECEIVED: 0,
      PREPARING: 0,
      OUT_FOR_DELIVERY: 0,
      DELIVERED: 0,
      CANCELED: 0,
    };
    for (const o of orders) counts[o.status] += 1;
    return counts;
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (!q) return true;
      if (orderNumber(o.sequence).toLowerCase().includes(q)) return true;
      return o.items.some((it) => it.name.toLowerCase().includes(q));
    });
  }, [orders, search, statusFilter]);

  const selected =
    filtered.find((o) => o.id === selectedId) ?? filtered[0] ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pedidos"
        description="Acompanhe os pedidos confirmados pelo bot e mude o status conforme avança o preparo e a entrega."
      />

      <div className="flex flex-wrap items-center gap-2">
        <FilterChip
          label="Todos"
          active={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
          count={orders.length}
        />
        {ORDER_STATUSES.map((s) => (
          <FilterChip
            key={s}
            label={STATUS_LABEL[s]}
            active={statusFilter === s}
            onClick={() => setStatusFilter(s)}
            count={countsByStatus[s]}
          />
        ))}
        <div className="ml-auto w-full sm:w-72">
          <Input
            placeholder="Buscar por nº do pedido ou item…"
            leftIcon={<Search />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {ordersQ.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Receipt />}
          title="Nenhum pedido por enquanto"
          description="Os pedidos aparecem aqui assim que um cliente confirmar pelo bot."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_440px]">
          <div className="space-y-2">
            {filtered.map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() => openOrder(order.id)}
                className={cn(
                  'w-full rounded-xl border bg-card p-4 text-left transition hover:border-primary/40',
                  selected?.id === order.id ? 'border-primary' : 'border-border',
                )}
              >
                <OrderRowSummary order={order} />
              </button>
            ))}
          </div>
          <div className="hidden xl:block">
            {selected ? (
              <OrderDetail
                order={selected}
                onAdvance={(status) =>
                  updateStatus.mutate({ id: selected.id, status })
                }
                pending={updateStatus.isPending}
              />
            ) : null}
          </div>
        </div>
      )}

      <Modal
        open={mobileDetailOpen && !!selected}
        onClose={() => setMobileDetailOpen(false)}
        title={selected ? `Pedido ${orderNumber(selected.sequence)}` : 'Pedido'}
        size="lg"
      >
        {selected ? (
          <OrderDetail
            order={selected}
            onAdvance={(status) => {
              updateStatus.mutate({ id: selected.id, status });
              setMobileDetailOpen(false);
            }}
            pending={updateStatus.isPending}
          />
        ) : null}
      </Modal>
    </div>
  );
}
