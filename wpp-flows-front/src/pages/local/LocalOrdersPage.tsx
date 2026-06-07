import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { orderService } from '@/services/orderService';
import { tableService } from '@/services/tableService';
import { useAuth } from '@/hooks/useAuth';
import { invalidateQueriesByFilters, queryKeys } from '@/lib/queryClient';
import { toast } from '@/stores/uiStore';
import type { OrderStatus } from '@/types';
import { OrderDetail } from '../orders/components/OrderDetail';
import { OrderKanban } from '../orders/components/OrderKanban';
import { orderNumber } from '@/helpers/order-helpers';

/**
 * Mirror of the delivery /orders page, scoped to LOCAL serviceType +
 * unbilled orders only. Closed-bill orders disappear from this board
 * (they live in the daily report).
 *
 * Customer notifications are intentionally disabled on this side —
 * the dine-in customer is in the room, not on WhatsApp, so a
 * status-change message to the synthetic table-customer would just
 * churn the messaging queue.
 */
export function LocalOrdersPage() {
  const qc = useQueryClient();
  const { organization } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const notifyCustomer = false;

  const ordersQ = useQuery({
    queryKey: queryKeys.localOrders.all,
    queryFn: () =>
      orderService.list({ serviceType: 'LOCAL', unbilledOnly: true }),
    refetchInterval: 5_000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
  const tablesQ = useQuery({
    queryKey: queryKeys.localTables.all,
    queryFn: tableService.list,
    refetchInterval: 5_000,
    refetchOnWindowFocus: true,
    staleTime: 0,
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

  const tableLabelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of tablesQ.data ?? []) m.set(t.id, t.label);
    return m;
  }, [tablesQ.data]);

  const advanceStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      orderService.updateStatus(id, status, { notifyCustomer }),
    onSuccess: () => {
      void invalidateQueriesByFilters(qc, [
        { queryKey: queryKeys.localOrders.all },
        { queryKey: queryKeys.localTables.all },
        { queryKey: queryKeys.orders.all },
        { queryKey: queryKeys.reports.daily },
      ]);
      toast.success('Status atualizado');
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Falha ao atualizar status'),
  });

  const selected = useMemo(
    () =>
      selectedId ? (orders.find((o) => o.id === selectedId) ?? null) : null,
    [orders, selectedId],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pedidos do Salão"
        description="Tudo que sai das mesas vem para cá. Arraste o card para mudar o status — quando fechar a conta, os pedidos somem do quadro e vão para o relatório."
        info={
          <div className="space-y-2">
            <p className="font-medium tracking-tight text-foreground">
              Apenas pedidos do salão, abertos.
            </p>
            <p className="text-muted-foreground">
              Pedidos com a conta fechada saem deste quadro e ficam no{' '}
              <strong>Carteira → Relatórios diários</strong>. A mesa volta a
              ser <em>livre</em> assim que a conta é fechada.
            </p>
          </div>
        }
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
      ) : (
        <OrderKanban
          orders={filtered}
          onOpenDetail={openOrder}
          notifyCustomer={notifyCustomer}
          serviceType="LOCAL"
          tableLabelById={tableLabelById}
        />
      )}

      <Modal
        open={detailOpen && !!selected}
        onClose={() => setDetailOpen(false)}
        title={
          selected
            ? `Pedido ${orderNumber(selected.sequence)}${
                selected.tableId
                  ? ` · ${tableLabelById.get(selected.tableId) ?? 'Mesa'}`
                  : ''
              }`
            : 'Pedido'
        }
        size="xl"
      >
        {selected ? (
          <OrderDetail
            order={selected}
            restaurantName={organization?.name ?? 'Restaurante'}
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
