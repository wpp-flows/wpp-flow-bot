import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff, Search } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Switch } from '@/components/ui/Switch';
import { orderService } from '@/services/orderService';
import { useAuth } from '@/hooks/useAuth';
import { invalidateQueriesByFilters, queryKeys } from '@/lib/queryClient';
import { toast } from '@/stores/uiStore';
import type { OrderStatus } from '@/types';
import { OrderDetail } from './components/OrderDetail';
import { OrderKanban } from './components/OrderKanban';
import { orderNumber } from '@/helpers/order-helpers';

const NOTIFY_STORAGE_KEY = 'mesa.orders.notify-customer';

function readInitialNotify(): boolean {
  if (typeof globalThis.window === 'undefined') return true;
  const raw = globalThis.window.localStorage.getItem(NOTIFY_STORAGE_KEY);
  return raw === null ? true : raw === 'true';
}

export function OrdersPage() {
  const qc = useQueryClient();
  const { organization } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [notifyCustomer, setNotifyCustomer] = useState<boolean>(readInitialNotify);
  useEffect(() => {
    if (typeof globalThis.window === 'undefined') return;
    globalThis.window.localStorage.setItem(
      NOTIFY_STORAGE_KEY,
      String(notifyCustomer),
    );
  }, [notifyCustomer]);

  const ordersQ = useQuery({
    queryKey: queryKeys.orders.today,
    queryFn: () => orderService.list({ serviceType: 'DELIVERY', date: 'today' }),
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const openOrder = (id: string) => {
    setSelectedId(id);
    setDetailOpen(true);
  };

  const todaysOrders = ordersQ.data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return todaysOrders;
    return todaysOrders.filter((o) => {
      if (orderNumber(o.sequence).toLowerCase().includes(q)) return true;
      return o.items.some((it) => it.name.toLowerCase().includes(q));
    });
  }, [todaysOrders, search]);

  const advanceStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      orderService.updateStatus(id, status, { notifyCustomer }),
    onSuccess: () => {
      void invalidateQueriesByFilters(qc, [
        { queryKey: queryKeys.orders.all },
        { queryKey: queryKeys.reports.daily },
      ]);
      toast.success('Status atualizado');
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Falha ao atualizar status'),
  });

  const markPaid = useMutation({
    mutationFn: (id: string) => orderService.markPaid(id),
    onSuccess: () => {
      void invalidateQueriesByFilters(qc, [
        { queryKey: queryKeys.orders.all },
        { queryKey: queryKeys.reports.daily },
      ]);
      toast.success('Pedido marcado como pago');
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Falha ao marcar como pago'),
  });

  const selected = useMemo(
    () =>
      selectedId ? (todaysOrders.find((o) => o.id === selectedId) ?? null) : null,
    [todaysOrders, selectedId],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pedidos"
        description="Acompanhe os pedidos confirmados pelo bot. Arraste um card para mudar o status — a transição dispara as mesmas regras da ação “Avançar”."
        info={
          <div className="space-y-2">
            <p className="font-medium tracking-tight text-foreground">
              Mostrando apenas os pedidos de hoje.
            </p>
            <p className="text-muted-foreground">
              Para evitar poluição do quadro com pedidos de dias anteriores,
              o kanban é zerado todo dia. Os pedidos anteriores ficam
              disponíveis na{' '}
              <Link
                to="/wallet"
                className="font-medium text-info underline-offset-2 hover:underline"
              >
                Carteira → Relatórios diários
              </Link>
              .
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
        <label
          className="ml-auto flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-soft-sm"
          title="Quando desligado, mudar o status do pedido não envia mensagem ao cliente pelo WhatsApp."
        >
          <span
            className={notifyCustomer ? 'text-foreground' : 'text-muted-foreground'}
            aria-hidden
          >
            {notifyCustomer ? (
              <Bell className="h-4 w-4" />
            ) : (
              <BellOff className="h-4 w-4" />
            )}
          </span>
          <span className="select-none">Enviar feedback ao cliente</span>
          <Switch
            checked={notifyCustomer}
            onChange={(e) => setNotifyCustomer(e.target.checked)}
            aria-label="Enviar feedback ao cliente ao mudar status"
          />
        </label>
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
        />
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
            restaurantName={organization?.name ?? 'Restaurante'}
            onAdvance={(status) => {
              advanceStatus.mutate(
                { id: selected.id, status },
                { onSuccess: () => setDetailOpen(false) },
              );
            }}
            pending={advanceStatus.isPending}
            onMarkPaid={() => markPaid.mutate(selected.id)}
            markingPaid={markPaid.isPending}
          />
        ) : null}
      </Modal>
    </div>
  );
}
