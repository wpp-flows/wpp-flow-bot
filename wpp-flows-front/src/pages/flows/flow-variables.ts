export interface FlowVariable {
  key: string;
  label: string;
  description: string;
}

export const FLOW_VARIABLES: FlowVariable[] = [
  {
    key: 'customer_name',
    label: 'Nome do cliente',
    description: 'Nome exibido do cliente no WhatsApp.',
  },
  {
    key: 'customer_phone',
    label: 'Telefone do cliente',
    description: 'Telefone do cliente (apenas dígitos).',
  },
  {
    key: 'bot_name',
    label: 'Nome do bot',
    description: 'Nome configurado para o bot que está atendendo.',
  },
  {
    key: 'order_count',
    label: 'Nº de pedidos do cliente',
    description: 'Quantidade de pedidos já feitos por este cliente.',
  },
  {
    key: 'menu_url',
    label: 'Link do cardápio',
    description: 'URL pública do cardápio digital do restaurante.',
  },
  {
    key: 'restaurant_name',
    label: 'Nome do restaurante',
    description: 'Nome da organização configurado nas configurações.',
  },
];

export const formatVariable = (key: string) => `{{${key}}}`;
