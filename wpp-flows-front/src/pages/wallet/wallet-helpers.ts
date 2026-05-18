import type { BadgeProps } from '@/components/ui/Badge';
import type { WalletTxKind, WalletTxStatus } from '@/types';

export const TX_KIND_LABEL: Record<WalletTxKind, string> = {
  CREDIT: 'Recebimento',
  WITHDRAWAL: 'Saque',
};

export const TX_STATUS_LABEL: Record<WalletTxStatus, string> = {
  PENDING: 'Pendente',
  COMPLETED: 'Concluído',
  REJECTED: 'Rejeitado',
};

export const TX_STATUS_TONE: Record<WalletTxStatus, BadgeProps['tone']> = {
  PENDING: 'warning',
  COMPLETED: 'success',
  REJECTED: 'destructive',
};

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
