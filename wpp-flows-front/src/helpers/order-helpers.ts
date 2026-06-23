import type { BadgeProps } from '@/components/ui/Badge';
import type { OrderStatus, PaymentProvider, PaymentStatus } from '@/types';

export const ORDER_STATUSES: readonly OrderStatus[] = [
  'RECEIVED',
  'PREPARING',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELED',
];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  RECEIVED: 'Recebido',
  PREPARING: 'Preparando',
  OUT_FOR_DELIVERY: 'Em entrega',
  DELIVERED: 'Entregue',
  CANCELED: 'Cancelado',
};

export const LOCAL_STATUS_LABEL: Record<OrderStatus, string> = {
  RECEIVED: 'Recebido',
  PREPARING: 'Preparando',
  OUT_FOR_DELIVERY: 'Pronto para servir',
  DELIVERED: 'Servido',
  CANCELED: 'Cancelado',
};

export function statusLabelFor(
  serviceType: 'DELIVERY' | 'LOCAL' | undefined,
): Record<OrderStatus, string> {
  return serviceType === 'LOCAL' ? LOCAL_STATUS_LABEL : STATUS_LABEL;
}

export const STATUS_TONE: Record<OrderStatus, BadgeProps['tone']> = {
  RECEIVED: 'info',
  PREPARING: 'warning',
  OUT_FOR_DELIVERY: 'primary',
  DELIVERED: 'success',
  CANCELED: 'destructive',
};

export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  PENDING: 'Aguardando pagamento',
  PAID: 'Pago',
  FAILED: 'Falha no pagamento',
  REFUNDED: 'Reembolsado',
};

export const PAYMENT_TONE: Record<PaymentStatus, BadgeProps['tone']> = {
  PENDING: 'warning',
  PAID: 'success',
  FAILED: 'destructive',
  REFUNDED: 'neutral',
};

export function isOnDeliveryPaymentProvider(
  paymentProvider: PaymentProvider | string | null | undefined,
): boolean {
  return paymentProvider === 'CASH' || paymentProvider === 'DELIVERY_CARD_PIX';
}

export function paymentProviderLabel(
  paymentProvider: PaymentProvider | string | null | undefined,
): string {
  switch (paymentProvider) {
    case 'MERCADO_PAGO':
      return 'Mercado Pago';
    case 'CASH':
      return 'Dinheiro';
    case 'DELIVERY_CARD_PIX':
      return 'Cartão/Pix na entrega';
    default:
      return 'Pagamento na entrega';
  }
}

export function receiptPaymentLabel(
  paymentProvider: PaymentProvider | null,
): string {
  switch (paymentProvider) {
    case 'MERCADO_PAGO':
      return 'Plataforma';
    case 'CASH':
      return 'Dinheiro na entrega';
    case 'DELIVERY_CARD_PIX':
      return 'Cartão/Pix na entrega';
    default:
      return 'Pagamento na entrega';
  }
}

const ALLOWED_NEXT: Record<OrderStatus, OrderStatus[]> = {
  RECEIVED: ['PREPARING', 'CANCELED'],
  PREPARING: ['OUT_FOR_DELIVERY', 'CANCELED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELED'],
  DELIVERED: [],
  CANCELED: [],
};

export const nextStatusOptions = (status: OrderStatus): OrderStatus[] =>
  ALLOWED_NEXT[status];

export const formatBRL = (value: string | number): string => {
  const n = typeof value === 'string' ? Number.parseFloat(value) : value;
  if (Number.isNaN(n)) return 'R$ 0,00';
  return `R$ ${n.toFixed(2).replace('.', ',')}`;
};

export const formatDateTime = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatRelativeTime = (iso: string): string => {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  if (diffMs < 60_000) return 'agora';
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days}d`;
  return formatDateTime(iso);
};

export const orderNumber = (sequence: number): string =>
  `#${String(sequence).padStart(4, '0')}`;

export const isToday = (iso: string): boolean => {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
};

export const localDayKey = (iso: string): string => {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const formatDayLabel = (key: string): string => {
  const [y, m, d] = key.split('-').map(Number);
  if (!y || !m || !d) return key;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};
