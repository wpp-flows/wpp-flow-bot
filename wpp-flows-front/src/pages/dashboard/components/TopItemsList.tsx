import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import type { DashboardTopItem } from '@/types';

export function TopItemsList({ items }: { items: DashboardTopItem[] }) {
  const max = useMemo(
    () => Math.max(1, ...items.map((it) => it.qty)),
    [items],
  );
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Sparkles />}
        title="Ainda sem itens vendidos"
        description="Configure seu menu e ative um fluxo para que o bot comece a registrar pedidos."
      />
    );
  }
  return (
    <ul className="space-y-3">
      {items.map((it, idx) => (
        <li key={it.itemId} className="flex items-center gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-2xs font-mono font-semibold text-muted-foreground">
            {String(idx + 1).padStart(2, '0')}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{it.name}</p>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(it.qty / max) * 100}%`,
                  backgroundColor: 'hsl(var(--primary))',
                }}
              />
            </div>
          </div>
          <span className="font-mono text-sm font-semibold tracking-tight">
            {it.qty}
          </span>
        </li>
      ))}
    </ul>
  );
}
