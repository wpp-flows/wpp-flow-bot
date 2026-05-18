import { useMemo, useState } from 'react';
import type { DashboardOrdersByDay } from '@/types';

/**
 * Lightweight SVG bar chart for the 14-day orders trend. Avoids pulling in a
 * chart library and renders cleanly with the platform palette (hsl variables).
 * Hovering a bar exposes the exact order/revenue numbers in a tooltip card.
 */
export function OrdersBarChart({ data }: { data: DashboardOrdersByDay[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  const max = useMemo(
    () => Math.max(1, ...data.map((d) => d.orders)),
    [data],
  );

  const labels = useMemo(
    () =>
      data.map((d) => {
        const date = new Date(`${d.date}T00:00:00Z`);
        return {
          short: date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            timeZone: 'UTC',
          }),
          weekday: date.toLocaleDateString('pt-BR', {
            weekday: 'short',
            timeZone: 'UTC',
          }),
        };
      }),
    [data],
  );

  if (data.length === 0) return null;

  return (
    <div className="relative">
      <div className="flex h-48 items-end gap-1.5">
        {data.map((d, i) => {
          const height = Math.max(2, (d.orders / max) * 100);
          const isHovered = hovered === i;
          return (
            <button
              key={d.date}
              type="button"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(i)}
              onBlur={() => setHovered(null)}
              className="group relative flex-1 cursor-default rounded-t-md transition-colors"
              style={{
                height: `${height}%`,
                backgroundColor: isHovered ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.55)',
              }}
              aria-label={`${labels[i]?.short}: ${d.orders} pedidos`}
            />
          );
        })}
      </div>
      <div className="mt-2 flex gap-1.5 text-2xs text-muted-foreground">
        {labels.map((l, i) => (
          <span
            key={i}
            className={`flex-1 text-center ${i % 2 === 0 ? '' : 'opacity-0'}`}
          >
            {l.short}
          </span>
        ))}
      </div>

      {hovered !== null && data[hovered] ? (
        <div
          className="pointer-events-none absolute -top-2 z-10 -translate-y-full rounded-md border border-border bg-popover px-2.5 py-1.5 shadow-soft-md"
          style={{
            left: `${(hovered + 0.5) * (100 / data.length)}%`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <p className="text-2xs font-semibold tracking-tight">
            {labels[hovered]?.weekday}, {labels[hovered]?.short}
          </p>
          <p className="text-xs">
            <span className="font-mono">{data[hovered].orders}</span>{' '}
            <span className="text-muted-foreground">pedidos</span>
          </p>
          <p className="text-2xs text-muted-foreground">
            R$ {data[hovered].revenue.replace('.', ',')}
          </p>
        </div>
      ) : null}
    </div>
  );
}
