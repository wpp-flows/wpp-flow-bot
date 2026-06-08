import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type { Order, OrderStatus } from '@/types';
import { STATUS_TONE } from '@/helpers/order-helpers';
import { OrderKanbanCard } from './OrderKanbanCard';

interface Props {
  status: OrderStatus;
  title: string;
  orders: Order[];
  onOpenDetail: (orderId: string) => void;
  tableLabelById?: Map<string, string>;
}

export function OrderKanbanColumn({
  status,
  title,
  orders,
  onOpenDetail,
  tableLabelById,
}: Readonly<Props>) {
  const droppable = useDroppable({
    id: `column:${status}`,
    data: { type: 'column', status },
  });

  return (
    <section className="flex h-full min-w-[280px] flex-col rounded-xl border border-border bg-muted/30 sm:min-w-[300px] xl:min-w-0">
      <header className="flex items-center gap-2 border-b border-border bg-card/40 px-3 py-2.5">
        <span
          className={cn('h-2.5 w-2.5 rounded-full', dotForStatus(status))}
          aria-hidden
        />
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        <Badge size="sm" tone="neutral" className="ml-auto">
          {orders.length}
        </Badge>
      </header>

      <SortableContext
        items={orders.map((o) => o.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={droppable.setNodeRef}
          className={cn(
            'flex flex-1 flex-col gap-2 p-2 transition',
            droppable.isOver && 'rounded-b-xl bg-primary/5 ring-2 ring-inset ring-primary/30',
          )}
        >
          {orders.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-border/60 py-8 text-center text-2xs text-muted-foreground">
              Solte um pedido aqui
            </div>
          ) : (
            orders.map((order) => (
              <OrderKanbanCard
                key={order.id}
                order={order}
                onOpenDetail={onOpenDetail}
                tableLabelById={tableLabelById}
              />
            ))
          )}
        </div>
      </SortableContext>
    </section>
  );
}

function dotForStatus(status: OrderStatus): string {
  switch (STATUS_TONE[status]) {
    case 'info':
      return 'bg-info';
    case 'warning':
      return 'bg-warning';
    case 'primary':
      return 'bg-primary';
    case 'success':
      return 'bg-success';
    case 'destructive':
      return 'bg-destructive';
    default:
      return 'bg-muted-foreground';
  }
}
