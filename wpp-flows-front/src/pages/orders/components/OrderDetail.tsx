import { Check, Copy, Printer } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { APP_CONFIG } from "@/constants/app";
import { toast } from "@/stores/uiStore";
import type { Order, OrderStatus, PaymentStatus } from "@/types";
import {
  PAYMENT_LABEL,
  PAYMENT_TONE,
  STATUS_LABEL,
  STATUS_TONE,
  formatBRL,
  formatDateTime,
  nextStatusOptions,
  orderNumber,
} from "../../../helpers/order-helpers";

interface Props {
  order: Order;
  restaurantName: string;
  pending: boolean;
  onAdvance: (status: OrderStatus) => void;
}

export function OrderDetail({
  order,
  restaurantName,
  pending,
  onAdvance,
}: Readonly<Props>) {
  const nextOptions = nextStatusOptions(order.status);
  const [copied, setCopied] = useState(false);

  const copyPaymentRef = async () => {
    if (!order.paymentProviderRef) return;
    try {
      await navigator.clipboard.writeText(order.paymentProviderRef);
      setCopied(true);
      toast.success("ID copiado");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const printReceipt = () => {
    const html = buildReceiptHtml({ order, restaurantName });
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = globalThis.open(url, "_blank", "width=420,height=700");
    if (!win) {
      URL.revokeObjectURL(url);
      toast.error("Não foi possível abrir a impressão");
      return;
    }
    win.addEventListener("load", () => {
      win.focus();
      win.print();
    });
    win.addEventListener("pagehide", () => URL.revokeObjectURL(url));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={STATUS_TONE[order.status]} dot>
            {STATUS_LABEL[order.status]}
          </Badge>
          <Badge tone={PAYMENT_TONE[order.paymentStatus]}>
            {PAYMENT_LABEL[order.paymentStatus]}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Criado em {formatDateTime(order.createdAt)}
        </p>
      </div>

      {order.paymentStatus === "PAID" ? (
        <Button
          size="sm"
          variant="outline"
          leftIcon={<Printer />}
          onClick={printReceipt}
        >
          Imprimir recibo
        </Button>
      ) : null}

      <Section title="Itens">
        <ul className="space-y-2 text-sm">
          {order.items.map((it) => (
            <li key={it.itemId} className="space-y-1">
              <div className="flex justify-between gap-3">
                <span className="truncate">
                  {it.qty}× {it.name}
                  {it.bundle ? (
                    <Badge tone="primary" size="sm" className="ml-2">
                      Combo
                    </Badge>
                  ) : null}
                </span>
                <span className="font-mono text-muted-foreground">
                  {formatBRL(Number.parseFloat(it.price) * it.qty)}
                </span>
              </div>
              {it.bundle ? (
                <ul className="ml-4 space-y-0.5 border-l border-border pl-3 text-xs text-muted-foreground">
                  {it.bundle.picks.map((p, idx) => (
                    <li key={`${it.itemId}-pick-${idx}`}>↳ {p.itemName}</li>
                  ))}
                  {Object.entries(it.bundle.answers).map(([key, value]) => (
                    <li key={`${it.itemId}-q-${key}`} className="italic">
                      ↳ {key}: {value}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
        <div className="mt-3 border-t border-border pt-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-mono">{formatBRL(order.subtotal)}</span>
          </div>
          {order.discount ? (
            <div className="flex justify-between text-success">
              <span>Desconto</span>
              <span className="font-mono">- {formatBRL(order.discount)}</span>
            </div>
          ) : null}
          <div className="mt-1 flex justify-between font-semibold">
            <span>Total</span>
            <span className="font-mono">{formatBRL(order.total)}</span>
          </div>
        </div>
      </Section>

      <Section title="Endereço de entrega">
        <p
          className={`text-sm ${order.address ? "" : "italic text-muted-foreground"}`}
        >
          {order.address?.trim() || "Não informado"}
        </p>
      </Section>

      <Section title="Observação do cliente">
        <p
          className={`text-sm ${order.observation ? "" : "italic text-muted-foreground"}`}
        >
          {order.observation?.trim() || "Sem observação"}
        </p>
      </Section>

      {order.paymentProviderRef ? (
        <Section title="Comprovante de pagamento">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded-md bg-muted px-2 py-1 font-mono text-xs">
                {order.paymentProviderRef}
              </code>
              <Button
                size="sm"
                variant="ghost"
                leftIcon={copied ? <Check /> : <Copy />}
                onClick={copyPaymentRef}
              >
                {copied ? "Copiado" : "Copiar ID"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              O comprovante completo está disponível no app ou painel do Mercado
              Pago — busque pelo ID acima.
            </p>
          </div>
        </Section>
      ) : null}

      {nextOptions.length > 0 ? (
        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          {nextOptions.map((status) => (
            <Button
              key={status}
              variant={status === "CANCELED" ? "outline" : "primary"}
              size="sm"
              loading={pending}
              onClick={() => onAdvance(status)}
            >
              Mover para {STATUS_LABEL[status]}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function buildReceiptHtml({
  order,
  restaurantName,
}: {
  order: Order;
  restaurantName: string;
}): string {
  const generatedAt = formatReceiptDate(order.createdAt);
  const paymentLabel = receiptPaymentLabel(order.paymentStatus);
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
      const bundleRows = item.bundle
        ? `
          ${item.bundle.picks
            .map((pick) => `<li>+ ${escapeHtml(pick.itemName)}</li>`)
            .join("")}
          ${Object.entries(item.bundle.answers)
            .map(
              ([key, value]) =>
                `<li>+ ${escapeHtml(key)}: ${escapeHtml(value)}</li>`,
            )
            .join("")}
        `
        : "";
      const notes = item.notes?.trim()
        ? `<p class="notes">Obs: ${escapeHtml(item.notes.trim())}</p>`
        : "";

      return `
        <li class="item">
          <div class="row strong">
            <span>${item.qty}x ${escapeHtml(item.name)}</span>
            <span>${formatBRL(itemTotal)}</span>
          </div>
          ${
            additionalRows || bundleRows
              ? `<ul class="details">${additionalRows}${bundleRows}</ul>`
              : ""
          }
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
        <div class="muted">Realizado em: ${generatedAt}</div>
      </section>

    <section class="section">
      <ul>${itemRows}</ul>
      <div class="totals">
        <div class="row"><span>Valor dos produtos</span><span>${formatBRL(order.subtotal)}</span></div>
        ${
          hasDiscount
            ? `<div class="row"><span>Descontos</span><span>- ${formatBRL(order.discount ?? 0)}</span></div>`
            : ""
        }
        ${
          hasDeliveryFee
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

function receiptPaymentLabel(paymentStatus: PaymentStatus): string {
  return paymentStatus === "PAID" ? "Plataforma" : "Pagamento na entrega";
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

function Section(
  props: Readonly<{ title: string; children: React.ReactNode }>,
) {
  return (
    <div className="space-y-1.5">
      <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
        {props.title}
      </p>
      {props.children}
    </div>
  );
}
