import {
  Bell,
  CircleAlert,
  CircleCheck,
  MessagesSquare,
  Receipt,
  type LucideIcon,
} from 'lucide-react';
import type { NotificationType } from '@/types';

export const TYPE_LABEL: Record<NotificationType, string> = {
  NEW_ORDER: 'Novo pedido',
  PAYMENT_RECEIVED: 'Pagamento recebido',
  BOT_OFFLINE: 'Bot offline',
  IDLE_CONVERSATION: 'Conversa parada',
  GENERIC: 'Notificação',
};

export const TYPE_ICON: Record<NotificationType, LucideIcon> = {
  NEW_ORDER: Receipt,
  PAYMENT_RECEIVED: CircleCheck,
  BOT_OFFLINE: CircleAlert,
  IDLE_CONVERSATION: MessagesSquare,
  GENERIC: Bell,
};

export const TYPE_ICON_TONE: Record<NotificationType, string> = {
  NEW_ORDER: 'bg-primary-soft text-primary',
  PAYMENT_RECEIVED: 'bg-success-soft text-success',
  BOT_OFFLINE: 'bg-destructive-soft text-destructive',
  IDLE_CONVERSATION: 'bg-warning-soft text-warning',
  GENERIC: 'bg-muted text-muted-foreground',
};

export const formatRelative = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min} min`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d`;
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
};
