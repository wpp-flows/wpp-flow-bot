import { Printer } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { WalletTransaction } from '@/types';
import {
  TX_KIND_LABEL,
  TX_STATUS_LABEL,
  TX_STATUS_TONE,
  formatBRL,
  formatDateTime,
} from '../../../helpers/wallet-helpers';

interface Props {
  tx: WalletTransaction;
  onReprintBill?: (billId: string) => void;
  reprintPending?: boolean;
}

export function TransactionRow({
  tx,
  onReprintBill,
  reprintPending = false,
}: Readonly<Props>) {
  const sign = tx.kind === 'CREDIT' ? '+' : '−';
  const canReprint = !!tx.billId && !!onReprintBill;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold tracking-tight">{TX_KIND_LABEL[tx.kind]}</p>
          <Badge size="sm" tone={TX_STATUS_TONE[tx.status]} dot>
            {TX_STATUS_LABEL[tx.status]}
          </Badge>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {formatDateTime(tx.createdAt)}
          {tx.note ? ` · ${tx.note}` : ''}
        </p>
      </div>
      <p
        className={`font-mono text-sm font-semibold tracking-tight ${
          tx.kind === 'CREDIT' ? 'text-success' : 'text-foreground'
        }`}
      >
        {sign} {formatBRL(tx.amount)}
      </p>
      {canReprint ? (
        <Button
          size="sm"
          variant="outline"
          leftIcon={<Printer />}
          loading={reprintPending}
          onClick={() => onReprintBill?.(tx.billId!)}
        >
          Reimprimir conta
        </Button>
      ) : null}
    </div>
  );
}
