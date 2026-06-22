import { APP_CONFIG } from "@/constants/app";
import type { Order } from "@/types";
import {
  formatBRL,
  orderNumber,
} from "../../../helpers/order-helpers";
import { PaymentProvider } from "@/types/order";

export function buildReceiptHtml({
  order,
  restaurantName,
}: {
  order: Order;
  restaurantName: string;
}): string {
  const generatedAt = formatReceiptDate(order.createdAt);
  const paymentLabel = receiptPaymentLabel(order.paymentProvider);
  const deliveryFee = Number.parseFloat(order.deliveryFee || "0");
  const hasDeliveryFee = order.deliveryMode === "DELIVERY" || deliveryFee > 0;
  const hasDiscount = !!order.discount && Number.parseFloat(order.discount) > 0;
  const deliveryText =
    order.deliveryMode === "PICKUP"
      ? "Retirada no local"
      : order.address?.trim() || "Não informado";

  const itemRows = order.items
    .map((item) => {
      const additionals = item.additionals ?? [];
      const extrasTotal = additionals.reduce(
        (sum, additional) => sum + Number.parseFloat(additional.price || "0"),
        0,
      );
      const itemTotal =
        (Number.parseFloat(item.price || "0") + extrasTotal) * item.qty;
      const additionalRows = additionals
        .map(
          (additional) => `
            <li>+ ${escapeHtml(additional.name)} (${formatBRL(additional.price)})</li>
          `,
        )
        .join("");
      const notes = item.notes?.trim()
        ? `<p class="notes">Obs: ${escapeHtml(item.notes.trim())}</p>`
        : "";

      return `
        <li class="item">
          <div class="row strong">
            <span>${item.qty}x ${escapeHtml(item.name)}</span>
            <span>${formatBRL(itemTotal)}</span>
          </div>
          ${additionalRows ? `<ul class="details">${additionalRows}</ul>` : ""}
          ${notes}
        </li>
      `;
    })
    .join("");

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Recibo ${orderNumber(order.sequence)} · ${escapeHtml(restaurantName)}</title>
  <style>
    * { box-sizing: border-box; }
    @page { size: 80mm auto; margin: 4mm; }
    body {
      margin: 0;
      background: #fff;
      color: #111827;
      font-family: 'Times New Roman', Times, serif;
      font-size: 12px;
      line-height: 1.25;
    }
    .receipt {
      width: 80mm;
      max-width: 100%;
      margin: 0 auto;
      padding: 10px;
    }
    .center { 
      text-align: center;
      margin-bottom: 10px
    }
    .mesa-brand {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin-bottom: 8px;
    }
    .mesa-logo-wrap {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 5px;
      background: #111827;
    }
    .mesa-logo-wrap svg {
      display: block;
      width: 14px;
      height: 14px;
      stroke: #fff;
    }
    .mesa-name {
      margin: 0;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #374151;
    }
    h1 {
      margin: 0;
      font-size: 17px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      line-height: 1.15;
    }
    .order-no {
      margin: 4px 0 0;
      font-size: 14px;
      font-weight: 800;
      line-height: 1.2;
    }
    .muted { color: #4b5563; font-size: 11px; }
    .section {
      border-top: 1px solid #111827;
      margin-top: 8px;
      padding-top: 7px;
    }
    .section-title {
      margin: 0 0 4px;
      font-size: 12px;
      font-weight: 800;
    }
    ul { list-style: none; margin: 0; padding: 0; }
    .item {
      border-bottom: 1px dashed #9ca3af;
      padding: 5px 0;
    }
    .row {
      display: flex;
      justify-content: space-between;
      gap: 10px;
    }
    .row span:last-child {
      white-space: nowrap;
      text-align: right;
    }
    .strong { font-weight: 700; }
    .details {
      margin-top: 2px;
      padding-left: 10px;
      color: #374151;
      font-size: 11px;
    }
    .notes {
      margin: 2px 0 0;
      color: #374151;
      font-size: 11px;
    }
    .totals {
      margin-top: 6px;
      font-size: 12px;
    }
    .total {
      border-top: 1px solid #111827;
      margin-top: 4px;
      padding-top: 4px;
      font-size: 15px;
      font-weight: 800;
    }
    .text { margin: 0; white-space: pre-wrap; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .receipt { padding: 0; }
    }
  </style>
</head>
<body>
  <main class="receipt">
    <header class="center">
      <div class="mesa-brand">
        <div class="mesa-logo-wrap" aria-hidden="true">${MESA_BOT_LOGO_SVG}</div>
        <h2 class="mesa-name">${escapeHtml(APP_CONFIG.name)}</h2>
      </div>
      <h1>${escapeHtml(restaurantName)}</h1>
      </header>
      
      <section>
        <p class="order-no">Pedido ${orderNumber(order.sequence)}</p>
        ${order.customerName?.trim()
      ? `<div class="muted">Cliente: ${escapeHtml(order.customerName.trim())}</div>`
      : ""
    }
        <div class="muted">Realizado em: ${generatedAt}</div>
      </section>

    <section class="section">
      <ul>${itemRows}</ul>
      <div class="totals">
        <div class="row"><span>Valor dos produtos</span><span>${formatBRL(order.subtotal)}</span></div>
        ${hasDiscount
      ? `<div class="row"><span>Descontos</span><span>- ${formatBRL(order.discount ?? 0)}</span></div>`
      : ""
    }
        ${hasDeliveryFee
      ? `<div class="row"><span>Taxa de entrega</span><span>${formatBRL(order.deliveryFee)}</span></div>`
      : ""
    }
        <div class="row total"><span>Total</span><span>${formatBRL(order.total)}</span></div>
      </div>
    </section>

    <section class="section">
      <p class="section-title">Observações:</p>
      <p class="text">${escapeHtml(order.observation?.trim() || "Sem observação")}</p>
    </section>

    <section class="section">
      <p class="section-title">${order.deliveryMode === "PICKUP" ? "Retirada" : "Entrega"}</p>
      <p class="text">${escapeHtml(deliveryText)}</p>
    </section>

    <section class="section">
      <p class="section-title">Forma de pagamento</p>
      <p class="text">${escapeHtml(paymentLabel)}</p>
    </section>
  </main>
</body>
</html>`;
}

function receiptPaymentLabel(paymentProvider: PaymentProvider | null): string {
  return paymentProvider === "MERCADO_PAGO" ? "Plataforma" : "Pagamento na entrega";
}

/** Inline bot mark (Lucide Bot) — works in print without external assets. */
const MESA_BOT_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>`;

function formatReceiptDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
