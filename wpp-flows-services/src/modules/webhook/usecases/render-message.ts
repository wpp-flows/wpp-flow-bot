import type { Bot } from "@/modules/bot/repositories/bot-repo";
import type {
    Conversation,
    FlowCartItem,
    FlowState,
} from "@/modules/chat/repositories/chat-repo";
import type { Customer } from "@/modules/customer/repositories/customer-repo";

export interface RenderContext {
    conversation: Conversation;
    bot: Bot;
    state: FlowState;
    customer: Customer | null;
}

export interface VariableDescriptor {
    /** Placeholder users type in the editor (without the surrounding braces). */
    key: string;
    /** Short label for the editor's variable picker. */
    label: string;
    /** Slightly longer text shown as tooltip / hint. */
    description: string;
}

/**
 * Canonical list of variables the flow editor surfaces to users and the
 * runner can interpolate. Keep in sync with the keys handled in {@link valueOf}.
 */
export const AVAILABLE_VARIABLES: VariableDescriptor[] = [
    {
        key: "customer_name",
        label: "Nome do cliente",
        description: "Nome exibido do cliente no WhatsApp.",
    },
    {
        key: "customer_phone",
        label: "Telefone do cliente",
        description: "Telefone do cliente (apenas dígitos).",
    },
    {
        key: "bot_name",
        label: "Nome do bot",
        description: "Nome configurado para o bot que está atendendo.",
    },
    {
        key: "order_total",
        label: "Total do pedido",
        description: "Soma dos itens no carrinho (R$ X,XX). Vazio se ainda não há itens.",
    },
    {
        key: "order_items",
        label: "Itens do pedido",
        description: "Lista resumida dos itens do carrinho, uma linha cada.",
    },
    {
        key: "order_count",
        label: "Nº de pedidos",
        description: "Quantidade de pedidos do cliente. Disponível após integração com pedidos.",
    },
    {
        key: "input.observation",
        label: "Observação",
        description: "Texto digitado pelo cliente em um passo de observação.",
    },
    {
        key: "input.address",
        label: "Endereço",
        description: "Endereço digitado pelo cliente em um passo de endereço.",
    },
];

const VARIABLE_PATTERN = /\{\{\s*([\w.]+)\s*\}\}/g;

/**
 * Replaces `{{variable}}` placeholders in the given template. Unknown variables
 * are removed from the output so partially-applicable templates (e.g. an
 * `{{order_total}}` in a welcome message) don't leak `{{...}}` syntax to users.
 */
export function renderMessage(template: string, ctx: RenderContext): string {
    if (!template.includes("{{")) return template;
    return template.replaceAll(VARIABLE_PATTERN, (_, key: string) => valueOf(key, ctx));
}

function valueOf(key: string, ctx: RenderContext): string {
    const { conversation, bot, state } = ctx;

    if (key.startsWith("input.")) {
        const fieldKey = key.slice("input.".length);
        return state.inputs?.[fieldKey]?.trim() ?? "";
    }

    switch (key) {
        case "customer_name":
            return conversation.contactName?.trim() || "cliente";
        case "customer_phone":
            return conversation.contactPhone ?? "";
        case "bot_name":
            return bot.name ?? "";
        case "order_total":
            return state.cart.length ? formatTotal(state.cart) : "";
        case "order_items":
            return state.cart.length
                ? state.cart
                    .map((item) => `• ${item.qty}x ${item.name}`)
                    .join("\n")
                : "";
        case "order_count":
            return ctx.customer ? String(ctx.customer.orderCount) : "";
        default:
            return "";
    }
}

function formatTotal(cart: FlowCartItem[]): string {
    const total = cart.reduce(
        (sum, item) => sum + item.qty * Number.parseFloat(item.price || "0"),
        0,
    );
    return `R$ ${total.toFixed(2).replace(".", ",")}`;
}
