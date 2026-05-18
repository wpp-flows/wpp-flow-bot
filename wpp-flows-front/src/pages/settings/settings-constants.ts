import type { NotificationPreferences, PayoutPixKeyType } from '@/types';

export const PIX_KEY_TYPES: { value: PayoutPixKeyType; label: string }[] = [
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'email', label: 'E-mail' },
  { value: 'phone', label: 'Telefone' },
  { value: 'random', label: 'Chave aleatória' },
];

export const NOTIFICATION_ROWS: {
  key: keyof NotificationPreferences;
  label: string;
  desc: string;
}[] = [
  {
    key: 'newOrders',
    label: 'Novos pedidos',
    desc: 'Som e aviso quando um novo pedido chega.',
  },
  {
    key: 'botDisconnects',
    label: 'Desconexões do bot',
    desc: 'Receba alerta quando um bot ficar offline.',
  },
  {
    key: 'idleConversations',
    label: 'Conversas inativas',
    desc: 'Lembrete se um cliente esperar mais de 5 minutos.',
  },
];

export const maskSecret = (value: string): string =>
  value.length > 6 ? `${value.slice(0, 4)}…${value.slice(-2)}` : '••••';
