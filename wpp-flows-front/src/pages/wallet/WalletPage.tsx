import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownToLine, Receipt } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { walletService } from '@/services/walletService';
import { invalidateQueriesByFilters, queryKeys } from '@/lib/queryClient';
import { toast } from '@/stores/uiStore';
import { TransactionRow } from './components/TransactionRow';
import { WithdrawModal } from './components/WithdrawModal';
import { formatBRL } from './wallet-helpers';

export function WalletPage() {
  const qc = useQueryClient();
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const walletQ = useQuery({
    queryKey: queryKeys.wallet.me,
    queryFn: walletService.get,
  });
  const txQ = useQuery({
    queryKey: queryKeys.wallet.transactions,
    queryFn: walletService.listTransactions,
  });

  const invalidateAll = () =>
    invalidateQueriesByFilters(qc, [
      { queryKey: queryKeys.wallet.me },
      { queryKey: queryKeys.wallet.transactions },
    ]);

  const cancel = useMutation({
    mutationFn: walletService.cancelWithdrawal,
    onSuccess: () => {
      void invalidateAll();
      toast.success('Saque cancelado');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Falha ao cancelar'),
  });

  const balance = walletQ.data?.balance ?? '0';
  const transactions = txQ.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Carteira"
        description="Saldo recebido por pedidos pagos via Mercado Pago. Solicite saques para a sua conta MP."
        actions={
          <Button
            leftIcon={<ArrowDownToLine />}
            onClick={() => setWithdrawOpen(true)}
            disabled={Number.parseFloat(balance) <= 0}
          >
            Solicitar saque
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1">
          <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
            Saldo disponível
          </p>
          {walletQ.isLoading ? (
            <Skeleton className="mt-2 h-9 w-32" />
          ) : (
            <p className="mt-2 font-mono text-3xl font-semibold tracking-tight">
              {formatBRL(balance)}
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Valores em {walletQ.data?.currency ?? 'BRL'}.
          </p>
        </Card>

        <Card className="space-y-2 p-5 lg:col-span-2">
          <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
            Como funciona
          </p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>· Cada pedido aprovado pelo Mercado Pago credita seu valor aqui automaticamente.</li>
            <li>· O saque cria uma solicitação pendente; assim que aprovada, o valor sai da carteira.</li>
            <li>· O valor de um saque pendente é descontado do saldo imediatamente.</li>
          </ul>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold tracking-tight">Movimentações</h2>
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
            description="As entradas aparecem aqui quando um pedido é pago e os saques quando você solicitar."
          />
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <TransactionRow
                key={tx.id}
                tx={tx}
                onCancel={() => cancel.mutate(tx.id)}
                canceling={cancel.isPending}
              />
            ))}
          </div>
        )}
      </div>

      <WithdrawModal
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        balance={balance}
        onCompleted={() => void invalidateAll()}
      />
    </div>
  );
}
