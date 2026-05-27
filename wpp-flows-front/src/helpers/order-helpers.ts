import type { BadgeProps } from '@/components/ui/Badge';
import type { OrderStatus, PaymentStatus } from '@/types';

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

export const orderNumber = (sequence: number): string =>
  `#${String(sequence).padStart(4, '0')}`;
