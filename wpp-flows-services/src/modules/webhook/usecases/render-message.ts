import { env } from "@/infrastructure/config/env";
import type { Bot } from "@/modules/bot/repositories/bot-repo";
import type {
    Conversation,
    FlowState,
} from "@/modules/chat/repositories/chat-repo";
import type { Customer } from "@/modules/customer/repositories/customer-repo";

export interface RenderContext {
    conversation: Conversation;
    bot: Bot;
    state: FlowState;
    customer: Customer | null;
    /** Optional org context — needed to render `{{menu_url}}` and `{{restaurant_name}}`. */
    organization?: {
        slug: string;
        name: string;
    } | null;
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
 *
 * After the digital-menu pivot, MESSAGE is the only step type — these are the
 * variables that make sense in greeting / hand-off messages.
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
        key: "order_count",
        label: "Nº de pedidos do cliente",
        description: "Quantidade de pedidos já feitos por este cliente.",
    },
    {
        key: "menu_url",
        label: "Link do cardápio",
        description:
            "URL pública do cardápio digital do restaurante, com nome e telefone do cliente no query string para autopreencher o checkout.",
    },
    {
        key: "restaurant_name",
        label: "Nome do restaurante",
        description: "Nome da organização configurado nas configurações.",
    },
];

const VARIABLE_PATTERN = /\{\{\s*([\w.]+)\s*\}\}/g;

/**
 * Replaces `{{variable}}` placeholders in the given template. Unknown variables
 * are removed from the output so partially-applicable templates don't leak
 * `{{...}}` syntax to customers.
 */
export function renderMessage(template: string, ctx: RenderContext): string {
    if (!template.includes("{{")) return template;
    return template.replaceAll(VARIABLE_PATTERN, (_, key: string) => valueOf(key, ctx));
}

function valueOf(key: string, ctx: RenderContext): string {
    const { conversation, bot, customer, organization } = ctx;
    switch (key) {
        case "customer_name":
            return conversation.contactName?.trim() || "cliente";
        case "customer_phone":
            return conversation.contactPhone ?? "";
        case "bot_name":
            return bot.name ?? "";
        case "order_count":
            return customer ? String(customer.orderCount) : "";
        case "menu_url":
            return menuUrlFor(
                organization?.slug ?? "",
                conversation.contactName,
                conversation.contactPhone,
            );
        case "restaurant_name":
            return organization?.name ?? "";
        default:
            return "";
    }
}

function menuUrlFor(
    slug: string,
    contactName: string | null | undefined,
    contactPhone: string | null | undefined,
): string {
    if (!slug) return "";
    const base = (env.CLIENT_ORIGIN ?? "").replace(/\/$/, "");
    const path = `${base || ""}/r/${slug}`;
    const params = new URLSearchParams();
    const name = contactName?.trim();
    if (name) params.set("name", name);
    const phoneDigits = (contactPhone ?? "").replace(/\D/g, "");
    if (phoneDigits) params.set("phone", phoneDigits);
    const qs = params.toString();
    return qs ? `${path}?${qs}` : path;
}
