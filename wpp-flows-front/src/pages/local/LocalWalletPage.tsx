import { useMutation, useQuery } from '@tanstack/react-query';
import { Banknote, FileText, Receipt } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { walletService } from '@/services/walletService';
import { reportService } from '@/services/reportService';
import { billService } from '@/services/billService';
import { tableService } from '@/services/tableService';
import { queryKeys } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/stores/uiStore';
import { ApiError } from '@/instances/api';
import { TransactionRow } from '../wallet/components/TransactionRow';
import { DailyReportsList } from '../wallet/components/DailyReportsList';
import { openDailyReport } from '../wallet/daily-report';
import { buildBillReceiptHtml } from './components/bill-receipt';
import { formatBRL } from '../../helpers/wallet-helpers';

export function LocalWalletPage() {
  const { organization } = useAuth();

  const walletQ = useQuery({
    queryKey: queryKeys.localWallet.summary,
    queryFn: walletService.get,
  });
  const txQ = useQuery({
    queryKey: queryKeys.localWallet.transactions,
    queryFn: () => walletService.listTransactions({ serviceType: 'LOCAL' }),
  });
  const reportsQ = useQuery({
    queryKey: queryKeys.reports.dailyByService('LOCAL'),
    queryFn: () => reportService.listDaily({ serviceType: 'LOCAL' }),
  });

  const transactions = txQ.data ?? [];
  const reports = reportsQ.data ?? [];
  const balance = walletQ.data?.localBalance ?? '0';

  const downloadLatestDay = useMutation({
    mutationFn: () => {
      const latest = reports[0];
      if (!latest) throw new Error('Sem relatórios disponíveis.');
      return reportService.getDaily(latest.date, { serviceType: 'LOCAL' });
    },
    onSuccess: (detail) => {
      openDailyReport({
        organizationName: organization?.name ?? '—',
        report: detail,
      });
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.message : 'Falha ao carregar o relatório',
      ),
  });

  const reprintBill = useMutation({
    mutationFn: async (billId: string) => {
      const detail = await billService.get(billId);
      const table = detail.bill.tableId
        ? await tableService.get(detail.bill.tableId).catch(() => null)
        : null;
      return { detail, table };
    },
    onSuccess: ({ detail, table }) => {
      const html = buildBillReceiptHtml({
        restaurantName: organization?.name ?? '—',
        table,
        bill: detail.bill,
        orders: detail.orders,
      });
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
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.message : 'Falha ao reimprimir a conta',
      ),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Carteira do Salão"
        description="Recebimentos de contas fechadas no salão. Não inclui pagamentos online — esses ficam na carteira do Delivery."
        info={
          <div className="space-y-2">
            <p className="font-medium tracking-tight text-foreground">
              Saldo separado por canal.
            </p>
            <p className="text-muted-foreground">
              Cada vez que você fecha a conta de uma mesa, o valor entra
              aqui. Para acompanhar pagamentos por Mercado Pago, use a{' '}
              <strong>Carteira</strong> do Delivery.
            </p>
          </div>
        }
        actions={
          reports.length > 0 ? (
            <Button
              leftIcon={<FileText />}
              variant="outline"
              loading={downloadLatestDay.isPending}
              onClick={() => downloadLatestDay.mutate()}
            >
              Imprimir relatório de hoje
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1">
          <p className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Banknote className="h-3.5 w-3.5" />
            Total recebido no salão
          </p>
          {walletQ.isLoading ? (
            <Skeleton className="mt-2 h-9 w-32" />
          ) : (
            <p className="mt-2 font-mono text-3xl font-semibold tracking-tight">
              {formatBRL(balance)}
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Soma das contas fechadas no salão.
          </p>
        </Card>

        <Card className="space-y-2 p-5 lg:col-span-2">
          <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
            Como funciona
          </p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>
              · Cada conta fechada cria uma transação aqui (dinheiro,
              cartão, Pix ou outro).
            </li>
            <li>
              · O saldo é apenas informativo — o caixa físico tem o
              valor de verdade.
            </li>
            <li>
              · Relatórios diários do salão saem direto deste módulo.
            </li>
          </ul>
        </Card>
      </div>

      <div>
        <h2 className="mb-1 text-sm font-semibold tracking-tight">
          Relatórios diários
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Cada dia com contas fechadas vira um relatório próprio.
        </p>
        {reportsQ.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : (
          <DailyReportsList
            organizationName={organization?.name ?? '—'}
            reports={reports}
            serviceType="LOCAL"
          />
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold tracking-tight">
          Movimentações
        </h2>
        {txQ.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={<Receipt />}
            title="Sem movimentações ainda"
            description="As contas fechadas aparecem aqui assim que você confirmar o pagamento de uma mesa."
          />
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <TransactionRow
                key={tx.id}
                tx={tx}
                onReprintBill={(billId) => reprintBill.mutate(billId)}
                reprintPending={
                  reprintBill.isPending && reprintBill.variables === tx.billId
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
