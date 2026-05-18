import type { DashboardOrderStatus, DashboardStatusBucket } from '@/types';

const STATUS_LABEL: Record<DashboardOrderStatus, string> = {
  RECEIVED: 'Recebido',
  PREPARING: 'Preparando',
  OUT_FOR_DELIVERY: 'Em entrega',
  DELIVERED: 'Entregue',
  CANCELED: 'Cancelado',
};

/**
 * Maps each order status to a semantic token from the platform palette so the
 * breakdown bars match the rest of the UI (success = entregue, etc.).
 */
const STATUS_COLOR: Record<DashboardOrderStatus, string> = {
  RECEIVED: 'hsl(var(--info))',
  PREPARING: 'hsl(var(--warning))',
  OUT_FOR_DELIVERY: 'hsl(var(--primary))',
  DELIVERED: 'hsl(var(--success))',
  CANCELED: 'hsl(var(--destructive))',
};

const ORDERED: DashboardOrderStatus[] = [
  'RECEIVED',
  'PREPARING',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELED',
];

export function StatusBreakdown({ data }: { data: DashboardStatusBucket[] }) {
  const lookup = new Map(data.map((b) => [b.status, b.count]));
  const total = data.reduce((sum, b) => sum + b.count, 0);

  return (
    <div className="space-y-2">
      {ORDERED.map((status) => {
        const count = lookup.get(status) ?? 0;
        const pct = total === 0 ? 0 : (count / total) * 100;
        return (
          <div key={status} className="space-y-1">
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-foreground">{STATUS_LABEL[status]}</span>
              <span className="font-mono text-muted-foreground">
                {count} <span className="text-2xs">({pct.toFixed(0)}%)</span>
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  backgroundColor: STATUS_COLOR[status],
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
