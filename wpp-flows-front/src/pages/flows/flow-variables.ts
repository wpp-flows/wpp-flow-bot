/**
 * Variables available inside step content templates. Keep in sync with the
 * backend renderer at wpp-flows-services/src/modules/webhook/usecases/render-message.ts —
 * any key added there should also appear here so users can discover and insert it.
 */
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
    key: 'order_total',
    label: 'Total do pedido',
    description: 'Soma dos itens no carrinho. Vazio se ainda não há itens.',
  },
  {
    key: 'order_items',
    label: 'Itens do pedido',
    description: 'Lista resumida dos itens do carrinho, uma linha cada.',
  },
  {
    key: 'order_count',
    label: 'Nº de pedidos',
    description: 'Quantidade de pedidos do cliente. Disponível após integração de pedidos.',
  },
  {
    key: 'input.observation',
    label: 'Observação',
    description: 'Texto digitado pelo cliente em um passo de observação.',
  },
  {
    key: 'input.address',
    label: 'Endereço',
    description: 'Endereço digitado pelo cliente em um passo de endereço.',
  },
];

export const formatVariable = (key: string) => `{{${key}}}`;
