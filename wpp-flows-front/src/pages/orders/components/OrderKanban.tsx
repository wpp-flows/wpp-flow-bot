import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { queryKeys } from '@/lib/queryClient';
import { statusLabelFor } from '@/helpers/order-helpers';
import type { Order, OrderStatus, ServiceType } from '@/types';
import { useOrderKanban } from '../hooks/useOrderKanban';
import { OrderKanbanCard } from './OrderKanbanCard';
import { OrderKanbanColumn } from './OrderKanbanColumn';

interface Props {
  orders: Order[];
  onOpenDetail: (orderId: string) => void;
  notifyCustomer?: boolean;
  serviceType?: ServiceType;
  tableLabelById?: Map<string, string>;
}

export function OrderKanban({
  orders,
  onOpenDetail,
  notifyCustomer,
  serviceType = 'DELIVERY',
  tableLabelById,
}: Readonly<Props>) {
  const optimisticQueryKey =
    serviceType === 'LOCAL'
      ? queryKeys.localOrders.all
      : queryKeys.orders.today;
  const invalidationKeys =
    serviceType === 'LOCAL'
      ? [
          queryKeys.localOrders.all,
          queryKeys.localTables.all,
          queryKeys.orders.all,
          queryKeys.reports.daily,
        ]
      : [queryKeys.orders.all, queryKeys.reports.daily];

  const statusLabel = statusLabelFor(serviceType);

  const { columns, activeOrder, setActiveOrderId, moveOrder } = useOrderKanban(
    orders,
    {
      notifyCustomer,
      optimisticQueryKey,
      invalidationKeys,
      statusLabel,
    },
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveOrderId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveOrderId(null);
    const { active, over } = event;
    if (!over) return;
    const target = resolveTargetStatus(over.id, over.data.current);
    if (!target) return;
    moveOrder(String(active.id), target);
  }

  function handleDragCancel() {
    setActiveOrderId(null);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="-mx-1 overflow-x-auto px-1 pb-2 [scrollbar-gutter:stable] xl:overflow-visible">
        <div className="grid min-h-[60vh] grid-flow-col auto-cols-[minmax(280px,1fr)] gap-3 sm:auto-cols-[minmax(300px,1fr)] xl:mx-auto xl:max-w-[2000px] xl:grid-flow-row xl:auto-cols-auto xl:grid-cols-5">
          {columns.map((col) => (
            <OrderKanbanColumn
              key={col.status}
              status={col.status}
              title={col.title}
              orders={col.orders}
              onOpenDetail={onOpenDetail}
              tableLabelById={tableLabelById}
            />
          ))}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeOrder ? (
          <OrderKanbanCard
            order={activeOrder}
            isOverlay
            tableLabelById={tableLabelById}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function resolveTargetStatus(
  overId: string | number,
  data: Record<string, unknown> | undefined,
): OrderStatus | null {
  const status = data?.status;
  if (typeof status === 'string' && isOrderStatus(status)) return status;
  const raw = String(overId);
  if (raw.startsWith('column:')) {
    const candidate = raw.slice('column:'.length);
    if (isOrderStatus(candidate)) return candidate;
  }
  return null;
}

function isOrderStatus(value: string): value is OrderStatus {
  return (
    value === 'RECEIVED' ||
    value === 'PREPARING' ||
    value === 'OUT_FOR_DELIVERY' ||
    value === 'DELIVERED' ||
    value === 'CANCELED'
  );
}
