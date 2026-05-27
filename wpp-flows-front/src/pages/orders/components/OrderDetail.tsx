import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { toast } from '@/stores/uiStore';
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
} from '../../../helpers/order-helpers';

interface Props {
  order: Order;
  pending: boolean;
  onAdvance: (status: OrderStatus) => void;
}

export function OrderDetail({ order, pending, onAdvance }: Readonly<Props>) {
  const nextOptions = nextStatusOptions(order.status);
  const [copied, setCopied] = useState(false);

  const copyPaymentRef = async () => {
    if (!order.paymentProviderRef) return;
    try {
      await navigator.clipboard.writeText(order.paymentProviderRef);
      setCopied(true);
      toast.success('ID copiado');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Não foi possível copiar');
    }
  };
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
        <ul className="space-y-2 text-sm">
          {order.items.map((it) => (
            <li key={it.itemId} className="space-y-1">
              <div className="flex justify-between gap-3">
                <span className="truncate">
                  {it.qty}× {it.name}
                  {it.bundle ? (
                    <Badge tone="primary" size="sm" className="ml-2">
                      Combo
                    </Badge>
                  ) : null}
                </span>
                <span className="font-mono text-muted-foreground">
                  {formatBRL(Number.parseFloat(it.price) * it.qty)}
                </span>
              </div>
              {it.bundle ? (
                <ul className="ml-4 space-y-0.5 border-l border-border pl-3 text-xs text-muted-foreground">
                  {it.bundle.picks.map((p, idx) => (
                    <li key={`${it.itemId}-pick-${idx}`}>↳ {p.itemName}</li>
                  ))}
                  {Object.entries(it.bundle.answers).map(([key, value]) => (
                    <li key={`${it.itemId}-q-${key}`} className="italic">
                      ↳ {key}: {value}
                    </li>
                  ))}
                </ul>
              ) : null}
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

      <Section title="Endereço de entrega">
        <p className={`text-sm ${order.address ? '' : 'italic text-muted-foreground'}`}>
          {order.address?.trim() || 'Não informado'}
        </p>
      </Section>

      <Section title="Observação do cliente">
        <p className={`text-sm ${order.observation ? '' : 'italic text-muted-foreground'}`}>
          {order.observation?.trim() || 'Sem observação'}
        </p>
      </Section>

      {order.paymentProviderRef ? (
        <Section title="Comprovante de pagamento">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded-md bg-muted px-2 py-1 font-mono text-xs">
                {order.paymentProviderRef}
              </code>
              <Button
                size="sm"
                variant="ghost"
                leftIcon={copied ? <Check /> : <Copy />}
                onClick={copyPaymentRef}
              >
                {copied ? 'Copiado' : 'Copiar ID'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              O comprovante completo está disponível no app ou painel do Mercado Pago — busque
              pelo ID acima.
            </p>
          </div>
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

function Section(props: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <div className="space-y-1.5">
      <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
        {props.title}
      </p>
      {props.children}
    </div>
  );
}
