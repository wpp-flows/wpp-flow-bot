import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Banknote, CreditCard, MoreHorizontal, Printer, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { ApiError } from '@/instances/api';
import { billService } from '@/services/billService';
import { useAuth } from '@/hooks/useAuth';
import { invalidateQueriesByFilters, queryKeys } from '@/lib/queryClient';
import { toast } from '@/stores/uiStore';
import { cn } from '@/lib/utils';
import type { LocalPaymentMethod, Order, RestaurantTable } from '@/types';
import { formatBRL } from '@/helpers/order-helpers';
import { buildBillReceiptHtml } from './bill-receipt';

interface Props {
  open: boolean;
  onClose: () => void;
  table: RestaurantTable;
  orders: Order[];
  runningTotal: number;
}

const PAYMENT_OPTIONS: {
  key: LocalPaymentMethod;
  label: string;
  icon: React.ReactNode;
}[] = [
  { key: 'CASH', label: 'Dinheiro', icon: <Banknote className="h-4 w-4" /> },
  { key: 'CARD', label: 'Cartão', icon: <CreditCard className="h-4 w-4" /> },
  { key: 'PIX', label: 'Pix', icon: <QrCode className="h-4 w-4" /> },
  { key: 'OTHER', label: 'Outro', icon: <MoreHorizontal className="h-4 w-4" /> },
];

export function CloseBillModal({
  open,
  onClose,
  table,
  orders,
  runningTotal,
}: Readonly<Props>) {
  const { organization } = useAuth();
  const qc = useQueryClient();
  const [paymentMethod, setPaymentMethod] = useState<LocalPaymentMethod>('CASH');
  const [notes, setNotes] = useState('');

  const close = useMutation({
    mutationFn: () =>
      billService.closeTable(table.id, {
        paymentMethod,
        notes: notes.trim() || null,
      }),
    onSuccess: (result) => {
      toast.success(
        'Conta fechada',
        `${table.label} · ${formatBRL(result.bill.total)}`,
      );
      const html = buildBillReceiptHtml({
        restaurantName: organization?.name ?? '—',
        table,
        bill: result.bill,
        orders: result.orders,
      });
      openPrintWindow(html);
      void invalidateQueriesByFilters(qc, [
        { queryKey: queryKeys.localOrders.all },
        { queryKey: queryKeys.localOrders.byTable(table.id) },
        { queryKey: queryKeys.localTables.all },
        { queryKey: queryKeys.localTables.detail(table.id) },
        { queryKey: queryKeys.localWallet.summary },
        { queryKey: queryKeys.localWallet.transactions },
        { queryKey: queryKeys.localBills.all },
        { queryKey: queryKeys.reports.daily },
        { queryKey: queryKeys.reports.dailyByService('LOCAL') },
      ]);
      onClose();
      setPaymentMethod('CASH');
      setNotes('');
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.message : 'Falha ao fechar a conta',
      ),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Fechar conta · ${table.label}`}
      description={`${orders.length} pedido${orders.length === 1 ? '' : 's'} aberto${orders.length === 1 ? '' : 's'}`}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            leftIcon={<Printer />}
            loading={close.isPending}
            onClick={() => close.mutate()}
          >
            Fechar e imprimir · {formatBRL(runningTotal)}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <section>
          <p className="mb-2 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
            Forma de pagamento
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PAYMENT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setPaymentMethod(opt.key)}
                aria-pressed={paymentMethod === opt.key}
                className={cn(
                  'flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition',
                  paymentMethod === opt.key
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border bg-background hover:bg-muted/40',
                )}
              >
                <span
                  className={
                    paymentMethod === opt.key
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  }
                >
                  {opt.icon}
                </span>
                <span className="text-sm font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
        </section>

        <FormField label="Observações (opcional)" htmlFor="close-bill-notes">
          <Textarea
            id="close-bill-notes"
            rows={2}
            placeholder="Ex.: gorjeta, divisão da conta, troco devolvido…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </FormField>

        <section className="rounded-md border border-border bg-muted/30 p-3 text-sm">
          <div className="flex items-baseline justify-between">
            <span className="text-muted-foreground">Total a cobrar</span>
            <span className="font-mono text-lg font-semibold">
              {formatBRL(runningTotal)}
            </span>
          </div>
          <p className="mt-1 text-2xs text-muted-foreground">
            Calculado a partir dos pedidos não cancelados ainda abertos.
          </p>
        </section>
      </div>
    </Modal>
  );
}

function openPrintWindow(html: string): void {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = globalThis.open(url, '_blank', 'width=420,height=700');
  if (!win) {
    URL.revokeObjectURL(url);
    toast.error('Não foi possível abrir a impressão');
    return;
  }
  win.addEventListener('load', () => {
    win.focus();
    win.print();
  });
  win.addEventListener('pagehide', () => URL.revokeObjectURL(url));
}
