import { type CSSProperties, forwardRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Banknote,
  CreditCard,
  GripVertical,
  MapPin,
  Package,
  StickyNote,
  Table as TableIcon,
  Tag,
  User,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type { Order } from '@/types';
import {
  PAYMENT_LABEL,
  PAYMENT_TONE,
  STATUS_TONE,
  formatBRL,
  formatRelativeTime,
  orderNumber,
} from '@/helpers/order-helpers';

interface Props {
  order: Order;
  isOverlay?: boolean;
  onOpenDetail?: (orderId: string) => void;
  tableLabelById?: Map<string, string>;
}

const ACCENT_BY_TONE: Record<string, string> = {
  info: 'before:bg-info',
  warning: 'before:bg-warning',
  primary: 'before:bg-primary',
  success: 'before:bg-success',
  destructive: 'before:bg-destructive',
  neutral: 'before:bg-muted-foreground/60',
};

export const OrderKanbanCard = forwardRef<HTMLDivElement, Props>(function OrderKanbanCard(
  { order, isOverlay = false, onOpenDetail, tableLabelById },
  forwardedRef,
) {
  const tableLabel = order.tableId
    ? tableLabelById?.get(order.tableId) ?? null
    : null;
  const dinerName =
    order.serviceType === 'LOCAL' &&
    order.customerName &&
    !order.customerName.toLowerCase().startsWith('mesa ')
      ? order.customerName
      : null;
  const sortable = useSortable({
    id: order.id,
    data: { type: 'order', status: order.status },
    disabled: isOverlay,
  });

  const style: CSSProperties = {
    transform: CSS.Translate.toString(sortable.transform),
    transition: sortable.transition,
  };

  const itemCount = order.items.reduce((sum, it) => sum + it.qty, 0);
  const itemPreview = buildItemPreview(order.items);
  const hasDiscount = !!order.discount && Number.parseFloat(order.discount) > 0;
  const hasObservation = !!order.observation?.trim();
  const isCash = order.paymentProvider === 'CASH';
  const isDeliveryCardPix = order.paymentProvider === 'DELIVERY_CARD_PIX';
  const addressShort = order.address?.split(',')[0]?.trim() || null;
  const accent = ACCENT_BY_TONE[(STATUS_TONE[order.status] ?? 'neutral') as keyof typeof ACCENT_BY_TONE];

  return (
    <div
      ref={(node) => {
        sortable.setNodeRef(node);
        if (typeof forwardedRef === 'function') forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      }}
      style={style}
      className={cn(
        'group relative flex flex-col gap-2 overflow-hidden rounded-lg border border-border bg-card p-3 pl-4 text-left shadow-soft-sm transition',
        'before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:content-[""]',
        accent,
        sortable.isDragging && !isOverlay && 'opacity-40',
        isOverlay && 'rotate-1 shadow-soft-lg ring-1 ring-primary/40',
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          aria-label="Arrastar pedido"
          {...sortable.attributes}
          {...sortable.listeners}
          className="-ml-1 inline-flex h-7 w-6 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onOpenDetail?.(order.id)}
          className="min-w-0 flex-1 text-left focus-visible:outline-none"
        >
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-mono text-sm font-semibold tracking-tight">
              {orderNumber(order.sequence)}
            </p>
            <p className="shrink-0 font-mono text-sm font-semibold tabular-nums">
              {formatBRL(order.total)}
            </p>
          </div>
          <p className="mt-0.5 text-2xs text-muted-foreground">
            {formatRelativeTime(order.createdAt)}
          </p>
        </button>
      </div>

      <button
        type="button"
        onClick={() => onOpenDetail?.(order.id)}
        className="flex min-w-0 flex-col gap-1.5 text-left focus-visible:outline-none"
      >
        {itemPreview ? (
          <p className="line-clamp-2 text-xs text-foreground/90" title={itemPreview}>
            {itemPreview}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-1.5">
          {tableLabel ? (
            <Badge
              tone="primary"
              size="sm"
              className="inline-flex items-center gap-1"
            >
              <TableIcon className="h-3 w-3" />
              {tableLabel}
            </Badge>
          ) : null}
          {dinerName ? (
            <Badge
              tone="info"
              size="sm"
              className="inline-flex items-center gap-1"
              title={`Cliente: ${dinerName}`}
            >
              <User className="h-3 w-3" />
              {dinerName}
            </Badge>
          ) : null}
          {isCash ? (
            <Badge tone="warning" size="sm" className="inline-flex items-center gap-1">
              <Banknote className="h-3 w-3" />
              Dinheiro
            </Badge>
          ) : null}
          {isDeliveryCardPix ? (
            <Badge tone="warning" size="sm" className="inline-flex items-center gap-1">
              <CreditCard className="h-3 w-3" />
              Cartão ou Pix
            </Badge>
          ) : null}
          <Badge tone={PAYMENT_TONE[order.paymentStatus]} size="sm">
            {PAYMENT_LABEL[order.paymentStatus]}
          </Badge>
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-2xs text-muted-foreground">
            <Package className="h-3 w-3" />
            {itemCount} {itemCount === 1 ? 'item' : 'itens'}
          </span>
          {hasDiscount ? (
            <span
              className="inline-flex items-center gap-1 rounded-md bg-success/10 px-1.5 py-0.5 text-2xs font-medium text-success"
              title={`Desconto de ${formatBRL(order.discount ?? 0)}`}
            >
              <Tag className="h-3 w-3" />
              {formatBRL(order.discount ?? 0)}
            </span>
          ) : null}
        </div>

        {(addressShort || hasObservation) && (
          <div className="flex flex-col gap-1 border-t border-border/60 pt-1.5">
            {addressShort ? (
              <p
                className="flex items-start gap-1 truncate text-2xs text-muted-foreground"
                title={order.address ?? ''}
              >
                <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                <span className="truncate">{addressShort}</span>
              </p>
            ) : null}
            {hasObservation ? (
              <p
                className="flex items-start gap-1 truncate text-2xs italic text-muted-foreground"
                title={order.observation ?? ''}
              >
                <StickyNote className="mt-0.5 h-3 w-3 shrink-0" />
                <span className="truncate">{order.observation}</span>
              </p>
            ) : null}
          </div>
        )}
      </button>
    </div>
  );
});

function buildItemPreview(items: Order['items']): string | null {
  if (items.length === 0) return null;
  const head = items.slice(0, 2).map((it) => `${it.qty}× ${it.name}`);
  if (items.length > 2) head.push(`+${items.length - 2}`);
  return head.join(', ');
}
