import { useQuery } from '@tanstack/react-query';
import { FileDown, Receipt, Info } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { walletService } from '@/services/walletService';
import { queryKeys } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { TransactionRow } from './components/TransactionRow';
import { formatBRL } from './wallet-helpers';
import { openWalletReport } from './wallet-report';

export function WalletPage() {
  const { organization } = useAuth();

  const walletQ = useQuery({
    queryKey: queryKeys.wallet.me,
    queryFn: walletService.get,
  });
  const txQ = useQuery({
    queryKey: queryKeys.wallet.transactions,
    queryFn: walletService.listTransactions,
  });

  const balance = walletQ.data?.balance ?? '0';
  const transactions = txQ.data ?? [];

  const handleGenerateReport = () => {
    if (!walletQ.data) return;
    openWalletReport({
      organizationName: organization?.name ?? '—',
      wallet: walletQ.data,
      transactions,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Carteira"
        description="Resumo do que foi recebido por pedidos pagos via Mercado Pago. Para sacar, use o painel do MP."
        actions={
          <Button
            leftIcon={<FileDown />}
            onClick={handleGenerateReport}
            disabled={walletQ.isLoading || !walletQ.data}
          >
            Gerar relatório
          </Button>
        }
      />

      <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-soft/40 p-4 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <div className="space-y-1">
          <p className="font-medium tracking-tight text-foreground">
            Os valores ficam na sua conta do Mercado Pago.
          </p>
          <p className="text-muted-foreground">
            Cada pedido aprovado vai direto para o saldo da sua conta MP. Para sacar para a sua
            conta bancária ou chave PIX, acesse o aplicativo ou painel do Mercado Pago. Aqui você
            acompanha o histórico e gera relatórios financeiros.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1">
          <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
            Total recebido
          </p>
          {walletQ.isLoading ? (
            <Skeleton className="mt-2 h-9 w-32" />
          ) : (
            <p className="mt-2 font-mono text-3xl font-semibold tracking-tight">
              {formatBRL(balance)}
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Valores em {walletQ.data?.currency ?? 'BRL'} · disponível na sua conta MP.
          </p>
        </Card>

        <Card className="space-y-2 p-5 lg:col-span-2">
          <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
            Como funciona
          </p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>· Cada pedido pago credita o valor automaticamente na sua conta Mercado Pago.</li>
            <li>· Aqui você vê o histórico das entradas para acompanhar o que foi recebido.</li>
            <li>· Use <span className="font-medium text-foreground">Gerar relatório</span> para baixar um PDF com todas as movimentações.</li>
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
            description="As entradas aparecem aqui quando um pedido é pago via Mercado Pago."
          />
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
