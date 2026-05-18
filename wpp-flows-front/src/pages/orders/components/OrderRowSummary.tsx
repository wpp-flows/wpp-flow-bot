import { Badge } from '@/components/ui/Badge';
import type { Order } from '@/types';
import {
  PAYMENT_LABEL,
  PAYMENT_TONE,
  STATUS_LABEL,
  STATUS_TONE,
  formatBRL,
  formatDateTime,
  orderNumber,
} from '../order-helpers';

export function OrderRowSummary({ order }: { order: Order }) {
  const itemCount = order.items.reduce((sum, it) => sum + it.qty, 0);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-mono text-sm font-semibold tracking-tight">
            {orderNumber(order.sequence)}
          </p>
          <Badge tone={STATUS_TONE[order.status]} size="sm" dot>
            {STATUS_LABEL[order.status]}
          </Badge>
          <Badge tone={PAYMENT_TONE[order.paymentStatus]} size="sm">
            {PAYMENT_LABEL[order.paymentStatus]}
          </Badge>
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {itemCount} {itemCount === 1 ? 'item' : 'itens'} ·{' '}
          {formatDateTime(order.createdAt)}
        </p>
      </div>
      <p className="font-mono text-sm font-semibold tracking-tight">
        {formatBRL(order.total)}
      </p>
    </div>
  );
}
