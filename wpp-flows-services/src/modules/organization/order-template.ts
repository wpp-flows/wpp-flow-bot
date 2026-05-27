import type { Customer } from "@/modules/customer/repositories/customer-repo";
import type { Order } from "@/modules/order/repositories/order-repo";
import type { Organization } from "./repositories/organization-repo";

export interface OrderTemplateContext {
    organization: Organization;
    order: Order;
    customer: Customer;
}

export interface OrderTemplateVariable {
    key: string;
    label: string;
    description: string;
}

export const ORDER_TEMPLATE_VARIABLES: OrderTemplateVariable[] = [
    {
        key: "customer_name",
        label: "Nome do cliente",
        description: "Nome do cliente no pedido.",
    },
    {
        key: "order_number",
        label: "Número do pedido",
        description: 'Número de exibição com `#` (ex.: "#0042").',
    },
    {
        key: "order_id",
        label: "ID do pedido",
        description: "Alias para o número de exibição — mesma saída de order_number.",
    },
    {
        key: "order_items",
        label: "Itens do pedido",
        description: "Lista resumida dos itens, uma linha por item.",
    },
    {
        key: "order_total",
        label: "Total do pedido",
        description: "Total final do pedido formatado (ex.: R$ 64,80).",
    },
    {
        key: "order_subtotal",
        label: "Subtotal do pedido",
        description: "Soma dos itens antes de descontos e taxa de entrega.",
    },
    {
        key: "delivery_fee",
        label: "Taxa de entrega",
        description: "Taxa cobrada no pedido (vazio quando retirada no balcão).",
    },
    {
        key: "restaurant_name",
        label: "Nome do restaurante",
        description: "Nome da organização configurado nas configurações.",
    },
];

const VARIABLE_PATTERN = /\{\{\s*([\w.]+)\s*\}\}/g;

export function renderOrderTemplate(
    template: string,
    ctx: OrderTemplateContext,
): string {
    if (!template.includes("{{")) return template;
    return template.replaceAll(VARIABLE_PATTERN, (_, key: string) =>
        valueOf(key, ctx),
    );
}

function valueOf(key: string, ctx: OrderTemplateContext): string {
    const { organization, order, customer } = ctx;
    switch (key) {
        case "customer_name":
            return customer.name?.trim() || "cliente";
        case "order_id":
        case "order_number":
            return `#${String(order.sequence).padStart(4, "0")}`;
        case "order_items":
            return formatItemsList(order);
        case "order_total":
            return formatBrl(order.total);
        case "order_subtotal":
            return formatBrl(order.subtotal);
        case "delivery_fee":
            return Number.parseFloat(order.deliveryFee || "0") > 0
                ? formatBrl(order.deliveryFee)
                : "";
        case "restaurant_name":
            return organization.name;
        default:
            return "";
    }
}

function formatItemsList(order: Order): string {
    return order.items
        .map((item) => {
            const head = `• ${item.qty}x ${item.name}`;
            const lines: string[] = [head];
            for (const add of item.additionals ?? []) {
                lines.push(`   + ${add.name}`);
            }
            if (item.notes) {
                lines.push(`   (${item.notes})`);
            }
            if (item.bundle) {
                for (const pick of item.bundle.picks) {
                    lines.push(`   ↳ ${pick.itemName}`);
                }
            }
            return lines.join("\n");
        })
        .join("\n");
}

function formatBrl(value: string | number): string {
    const n = typeof value === "string" ? Number.parseFloat(value) : value;
    if (!Number.isFinite(n)) return "R$ 0,00";
    return `R$ ${n.toFixed(2).replace(".", ",")}`;
}
