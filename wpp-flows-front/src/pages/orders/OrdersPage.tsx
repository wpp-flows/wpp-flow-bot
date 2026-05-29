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
import type { OrderStatus } from '@/types';
import { OrderDetail } from './components/OrderDetail';
import { OrderKanban } from './components/OrderKanban';
import { orderNumber } from '@/helpers/order-helpers';

export function OrdersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const ordersQ = useQuery({
    queryKey: queryKeys.orders.all,
    queryFn: () => orderService.list({}),
  });

  const openOrder = (id: string) => {
    setSelectedId(id);
    setDetailOpen(true);
  };

  const orders = ordersQ.data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => {
      if (orderNumber(o.sequence).toLowerCase().includes(q)) return true;
      return o.items.some((it) => it.name.toLowerCase().includes(q));
    });
  }, [orders, search]);

  const advanceStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      orderService.updateStatus(id, status),
    onSuccess: () => {
      void invalidateQueriesByFilters(qc, [{ queryKey: queryKeys.orders.all }]);
      toast.success('Status atualizado');
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Falha ao atualizar status'),
  });

  const selected = useMemo(
    () => (selectedId ? (orders.find((o) => o.id === selectedId) ?? null) : null),
    [orders, selectedId],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pedidos"
        description="Acompanhe os pedidos confirmados pelo bot. Arraste um card para mudar o status — a transição dispara as mesmas regras da ação “Avançar”."
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Buscar por nº do pedido ou item…"
            leftIcon={<Search />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {ordersQ.isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<Receipt />}
          title="Nenhum pedido por enquanto"
          description="Os pedidos aparecem aqui assim que um cliente confirmar pelo cardápio digital."
        />
      ) : (
        <OrderKanban orders={filtered} onOpenDetail={openOrder} />
      )}

      <Modal
        open={detailOpen && !!selected}
        onClose={() => setDetailOpen(false)}
        title={selected ? `Pedido ${orderNumber(selected.sequence)}` : 'Pedido'}
        size="xl"
      >
        {selected ? (
          <OrderDetail
            order={selected}
            onAdvance={(status) => {
              advanceStatus.mutate(
                { id: selected.id, status },
                { onSuccess: () => setDetailOpen(false) },
              );
            }}
            pending={advanceStatus.isPending}
          />
        ) : null}
      </Modal>
    </div>
  );
}
