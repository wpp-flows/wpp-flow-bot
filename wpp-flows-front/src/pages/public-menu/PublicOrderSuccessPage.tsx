import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Loader2,
  MessageCircle,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { publicMenuService } from '@/services/publicMenuService';
import type { PublicOrderStatusResponse } from '@/types/publicMenu';
import { buildWhatsAppLink, digitsOnly, formatBrl } from '../../helpers/public-menu-helpers';

export function PublicOrderSuccessPage() {
  const { slug = '', orderId = '' } = useParams<{ slug: string; orderId: string }>();
  const [searchParams] = useSearchParams();
  const customerPhone = searchParams.get('phone');

  const query = useQuery({
    queryKey: ['public-order', slug, orderId],
    queryFn: () => publicMenuService.getOrderStatus(slug, orderId),
    refetchInterval: (q) => {
      const data = q.state.data as PublicOrderStatusResponse | undefined;
      if (!data) return 3000;
      if (data.paymentStatus !== 'PENDING') return false;
      if (data.status === 'CANCELED') return false;
      if (data.paymentProvider === 'CASH') return false;
      return 3000;
    },
    enabled: !!slug && !!orderId,
  });

  if (query.isLoading) {
    return <CenteredSpinner />;
  }

  if (query.isError || !query.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center">
        <div>
          <h1 className="text-xl font-semibold">Pedido não encontrado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Confira o link e tente novamente.
          </p>
        </div>
      </div>
    );
  }

  const order = query.data;
  const orderNumber = `#${String(order.sequence).padStart(4, '0')}`;

  return (
    <div className="flex min-h-screen items-start justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <OrderStateCard
          order={order}
          orderNumber={orderNumber}
          customerPhone={customerPhone}
          slug={slug}
          onCanceled={() => query.refetch()}
        />

        <div className="mt-4 text-center">
          <Link to={`/r/${slug}`} className="text-sm text-muted-foreground hover:underline">
            Voltar ao cardápio
          </Link>
        </div>
      </div>
    </div>
  );
}

function OrderStateCard({
  order,
  orderNumber,
  customerPhone,
  slug,
  onCanceled,
}: {
  order: PublicOrderStatusResponse;
  orderNumber: string;
  customerPhone: string | null;
  slug: string;
  onCanceled: () => void;
}) {
  if (order.status === 'CANCELED' || order.paymentStatus === 'FAILED') {
    return <FailedCard orderNumber={orderNumber} />;
  }
  if (order.paymentStatus === 'PAID') {
    return <PaidCard order={order} orderNumber={orderNumber} customerPhone={customerPhone} />;
  }
  if (order.paymentProvider === 'CASH') {
    return <CashOnDeliveryCard order={order} orderNumber={orderNumber} customerPhone={customerPhone} />;
  }
  return (
    <PendingCard
      orderNumber={orderNumber}
      paymentLink={order.paymentLink}
      slug={slug}
      orderId={order.id}
      onCanceled={onCanceled}
    />
  );
}

function PaidCard({
  order,
  orderNumber,
  customerPhone,
}: {
  order: PublicOrderStatusResponse;
  orderNumber: string;
  customerPhone: string | null;
}) {
  const botDigits = digitsOnly(order.bot?.phoneNumber);
  const message = `Olá! Pedido ${orderNumber} confirmado.${customerPhone ? '' : ' Pode me confirmar?'
    }`;
  const link = botDigits ? buildWhatsAppLink(botDigits, message) : null;

  return (
    <article className="rounded-xl border border-border bg-card p-6 shadow-soft-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-emerald-500/15 p-2 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Pagamento confirmado!</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pedido {orderNumber} — total {formatBrl(order.total)}
          </p>
        </div>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        Toque no botão abaixo para abrir o WhatsApp. O restaurante já recebeu
        seu pedido e logo confirma por lá.
      </p>

      <div className="mt-5">
        {link ? (
          <a href={link} target="_blank" rel="noreferrer">
            <Button size="lg" leftIcon={<MessageCircle />} className="w-full">
              Abrir conversa no WhatsApp
            </Button>
          </a>
        ) : (
          <p className="rounded-md border border-dashed border-border p-3 text-center text-sm text-muted-foreground">
            Aguardando o restaurante entrar em contato.
          </p>
        )}
      </div>
    </article>
  );
}

function CashOnDeliveryCard({
  order,
  orderNumber,
  customerPhone,
}: {
  order: PublicOrderStatusResponse;
  orderNumber: string;
  customerPhone: string | null;
}) {
  const botDigits = digitsOnly(order.bot?.phoneNumber);
  const message = `Olá! Pedido ${orderNumber} confirmado — pagamento na entrega.${customerPhone ? '' : ' Pode me confirmar?'
    }`;
  const link = botDigits ? buildWhatsAppLink(botDigits, message) : null;

  return (
    <article className="rounded-xl border border-border bg-card p-6 shadow-soft-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-emerald-500/15 p-2 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Pedido confirmado!</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pedido {orderNumber} — total {formatBrl(order.total)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
        <Banknote className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Pagamento <strong>em dinheiro na entrega</strong>. Tenha o valor por
          perto quando o pedido chegar.
        </p>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        Já avisamos o restaurante. Toque abaixo para abrir o WhatsApp e
        acompanhar.
      </p>

      <div className="mt-5">
        {link ? (
          <a href={link} target="_blank" rel="noreferrer">
            <Button size="lg" leftIcon={<MessageCircle />} className="w-full">
              Abrir conversa no WhatsApp
            </Button>
          </a>
        ) : (
          <p className="rounded-md border border-dashed border-border p-3 text-center text-sm text-muted-foreground">
            Aguardando o restaurante entrar em contato.
          </p>
        )}
      </div>
    </article>
  );
}

function PendingCard({
  orderNumber,
  paymentLink,
  slug,
  orderId,
  onCanceled,
}: {
  orderNumber: string;
  paymentLink: string | null;
  slug: string;
  orderId: string;
  onCanceled: () => void;
}) {
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const cancelMutation = useMutation({
    mutationFn: () => publicMenuService.cancelOrder(slug, orderId),
    onSuccess: () => {
      setConfirmingCancel(false);
      onCanceled();
    },
  });

  return (
    <article className="rounded-xl border border-border bg-card p-6 shadow-soft-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-amber-500/15 p-2 text-amber-600 dark:text-amber-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Aguardando pagamento</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pedido {orderNumber} — assim que o pagamento for confirmado, a
            página atualiza sozinha.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {paymentLink ? (
          <a href={paymentLink} target="_blank" rel="noreferrer">
            <Button size="lg" variant="outline" className="w-full">
              Reabrir Mercado Pago
            </Button>
          </a>
        ) : null}

        {confirmingCancel ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-sm">Cancelar o pedido?</p>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                loading={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate()}
              >
                Sim, cancelar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirmingCancel(false)}
                disabled={cancelMutation.isPending}
              >
                Voltar
              </Button>
            </div>
          </div>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="w-full"
            onClick={() => setConfirmingCancel(true)}
          >
            Cancelar pedido
          </Button>
        )}
      </div>
    </article>
  );
}

function FailedCard({ orderNumber }: { orderNumber: string }) {
  const message = useMemo(() => 'Pedido cancelado ou pagamento não aprovado.', []);
  return (
    <article className="rounded-xl border border-border bg-card p-6 shadow-soft-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-destructive/15 p-2 text-destructive">
          <XCircle className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{message}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pedido {orderNumber}
          </p>
        </div>
      </div>
      <div className="mt-5 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Se foi engano, volte ao cardápio e refaça o pedido — leva menos de
          um minuto.
        </p>
      </div>
    </article>
  );
}

function CenteredSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  );
}
