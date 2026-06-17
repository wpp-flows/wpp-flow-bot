import type {
  LocalPaymentMethod,
  Order,
  RestaurantTable,
  TableBill,
} from '@/types';
import { formatBRL, orderNumber } from '../../../helpers/order-helpers';

interface BillReceiptInput {
  restaurantName: string;
  table?: RestaurantTable | null;
  bill: TableBill;
  orders: Order[];
}

const METHOD_LABEL: Record<LocalPaymentMethod, string> = {
  CASH: 'Dinheiro',
  CARD: 'Cartão',
  PIX: 'Pix',
  OTHER: 'Outro',
};

export function buildBillReceiptHtml(input: BillReceiptInput): string {
  const closedAt = new Date(input.bill.closedAt).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const tableLabel = input.bill.tableLabel ?? input.table?.label ?? 'Mesa';
  const fallbackName = `Mesa ${tableLabel}`;

  const ordersHtml = input.orders
    .sort((a, b) => a.sequence - b.sequence)
    .map((order) => {
      const time = new Date(order.createdAt).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const items = order.items
        .map((it) => {
          const lineTotal = Number.parseFloat(it.price || '0') * it.qty;
          return `<div class="row"><span>${it.qty}× ${escapeHtml(it.name)}</span><span>${formatBRL(lineTotal)}</span></div>`;
        })
        .join('');
      const diner = order.customerName?.trim();
      const dinerHtml =
        diner && diner !== fallbackName
          ? `<div class="row muted"><span>Cliente</span><span>${escapeHtml(diner)}</span></div>`
          : '';
      return `
        <section class="order">
          <div class="row strong">
            <span>Pedido ${orderNumber(order.sequence)}</span>
            <span>${time}</span>
          </div>
          ${dinerHtml}
          ${items}
          <div class="row sub"><span>Subtotal</span><span>${formatBRL(order.total)}</span></div>
        </section>
      `;
    })
    .join('');

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Conta · ${escapeHtml(tableLabel)} · ${escapeHtml(input.restaurantName)}</title>
  <style>
    * { box-sizing: border-box; }
    @page { size: 80mm auto; margin: 4mm; }
    body { margin: 0; background: #fff; color: #111827; font-family: 'Times New Roman', Times, serif; font-size: 12px; line-height: 1.25; }
    .receipt { width: 80mm; max-width: 100%; margin: 0 auto; padding: 10px; }
    .center { text-align: center; }
    h1 { margin: 0; font-size: 17px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.02em; }
    .muted { color: #4b5563; font-size: 11px; }
    .section { border-top: 1px solid #111827; margin-top: 8px; padding-top: 7px; }
    .row { display: flex; justify-content: space-between; gap: 10px; }
    .row span:last-child { white-space: nowrap; text-align: right; }
    .strong { font-weight: 800; }
    .sub { border-top: 1px dashed #9ca3af; margin-top: 3px; padding-top: 3px; color: #4b5563; }
    .order { margin-bottom: 8px; }
    .grand { border-top: 2px solid #111827; margin-top: 8px; padding-top: 6px; font-size: 16px; font-weight: 800; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .receipt { padding: 0; } }
  </style>
</head>
<body>
  <main class="receipt">
    <header class="center">
      <h1>${escapeHtml(input.restaurantName)}</h1>
      <p class="muted">${escapeHtml(tableLabel)} · ${closedAt}</p>
    </header>

    <section class="section">
      ${ordersHtml || '<p class="muted">Nenhum pedido neste fechamento.</p>'}
    </section>

    <section class="section">
      <div class="row grand"><span>Total</span><span>${formatBRL(input.bill.total)}</span></div>
      <div class="row"><span>Forma de pagamento</span><span>${escapeHtml(METHOD_LABEL[input.bill.paymentMethod])}</span></div>
      ${input.bill.notes ? `<p class="muted">${escapeHtml(input.bill.notes)}</p>` : ''}
    </section>

    <p class="muted center" style="margin-top:12px;">Obrigado pela visita!</p>
  </main>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
