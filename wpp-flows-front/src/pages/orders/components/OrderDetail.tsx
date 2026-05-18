import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { Order, OrderStatus } from '@/types';
import {
  PAYMENT_LABEL,
  PAYMENT_TONE,
  STATUS_LABEL,
  STATUS_TONE,
  formatBRL,
  formatDateTime,
  nextStatusOptions,
  orderNumber,
} from '../order-helpers';

interface Props {
  order: Order;
  pending: boolean;
  onAdvance: (status: OrderStatus) => void;
}

export function OrderDetail({ order, pending, onAdvance }: Props) {
  const nextOptions = nextStatusOptions(order.status);
  return (
    <Card className="space-y-4 p-4">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-mono text-base font-semibold tracking-tight">
            {orderNumber(order.sequence)}
          </p>
          <Badge tone={STATUS_TONE[order.status]} dot>
            {STATUS_LABEL[order.status]}
          </Badge>
          <Badge tone={PAYMENT_TONE[order.paymentStatus]}>
            {PAYMENT_LABEL[order.paymentStatus]}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Criado em {formatDateTime(order.createdAt)}
        </p>
      </div>

      <Section title="Itens">
        <ul className="space-y-1.5 text-sm">
          {order.items.map((it) => (
            <li key={it.itemId} className="flex justify-between gap-3">
              <span className="truncate">
                {it.qty}× {it.name}
              </span>
              <span className="font-mono text-muted-foreground">
                {formatBRL(Number.parseFloat(it.price) * it.qty)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 border-t border-border pt-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-mono">{formatBRL(order.subtotal)}</span>
          </div>
          {order.discount ? (
            <div className="flex justify-between text-success">
              <span>Desconto</span>
              <span className="font-mono">- {formatBRL(order.discount)}</span>
            </div>
          ) : null}
          <div className="mt-1 flex justify-between font-semibold">
            <span>Total</span>
            <span className="font-mono">{formatBRL(order.total)}</span>
          </div>
        </div>
      </Section>

      {order.address ? (
        <Section title="Endereço de entrega">
          <p className="text-sm">{order.address}</p>
        </Section>
      ) : null}

      {order.observation ? (
        <Section title="Observação do cliente">
          <p className="text-sm">{order.observation}</p>
        </Section>
      ) : null}

      {order.receiptUrl ? (
        <Section title="Comprovante de pagamento">
          <a
            href={order.receiptUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            Abrir comprovante
          </a>
        </Section>
      ) : null}

      {nextOptions.length > 0 ? (
        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          {nextOptions.map((status) => (
            <Button
              key={status}
              variant={status === 'CANCELED' ? 'outline' : 'primary'}
              size="sm"
              loading={pending}
              onClick={() => onAdvance(status)}
            >
              Mover para {STATUS_LABEL[status]}
            </Button>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function Section(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
        {props.title}
      </p>
      {props.children}
    </div>
  );
}
