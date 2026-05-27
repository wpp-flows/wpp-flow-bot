import { evolutionApi } from "@/infrastructure/evolution/client";
import type { Bot } from "@/modules/bot/repositories/bot-repo";
import type {
    Conversation,
    ConversationRepository,
    MessageRepository,
} from "@/modules/chat/repositories/chat-repo";
import type { CustomerRepository } from "@/modules/customer/repositories/customer-repo";
import type { Order, OrderRepository } from "@/modules/order/repositories/order-repo";
import type { OrganizationRepository } from "@/modules/organization/repositories/organization-repo";
import { renderOrderTemplate } from "@/modules/organization/order-template";
import { jidToSendTarget } from "../strategies/shared";

/**
 * Matches the deep-link template the public-checkout success page seeds into
 * the customer's WhatsApp draft: `Pedido #1234 confirmado.`. Accepts obvious
 * variations (with/without `#`, "confirmado!" or "confirmado").
 */
const POST_PAYMENT_PATTERN = /pedido\s*#?\s*(\d{1,8})\s*confirmad[oa]/i;

export interface PostPaymentMatch {
    orderNumber: number;
}

export function parsePostPaymentMessage(text: string): PostPaymentMatch | null {
    const m = POST_PAYMENT_PATTERN.exec(text);
    if (!m) return null;
    const n = Number.parseInt(m[1]!, 10);
    if (!Number.isFinite(n)) return null;
    return { orderNumber: n };
}

export class PostPaymentHandler {
    constructor(
        private readonly orgRepo: OrganizationRepository,
        private readonly orderRepo: OrderRepository,
        private readonly customerRepo: CustomerRepository,
        private readonly conversationRepo: ConversationRepository,
        private readonly messageRepo: MessageRepository,
    ) {}

    async tryHandle(input: {
        bot: Bot;
        conversation: Conversation;
        text: string;
    }): Promise<boolean> {
        const match = parsePostPaymentMessage(input.text);
        if (!match) return false;

        const order = await this.orderRepo.findByOrgAndSequence(
            input.bot.organizationId,
            match.orderNumber,
        );
        if (!order) return false;

        // Only ack actually-paid orders. If the customer races ahead of the MP
        // webhook, fall through — the normal flow handles it.
        if (order.paymentStatus !== "PAID") return false;

        const [org, customer] = await Promise.all([
            this.orgRepo.findById(input.bot.organizationId),
            this.customerRepo.findByIdInOrg(input.bot.organizationId, order.customerId),
        ]);

        const customTemplate = org?.paymentReceivedMessage?.trim();
        const reply =
            org && customer && customTemplate
                ? renderOrderTemplate(customTemplate, { organization: org, order, customer })
                : buildDefaultAcknowledgement(order);

        try {
            const sent = await evolutionApi.sendText({
                instanceName: input.bot.evolutionInstanceName,
                number: jidToSendTarget(input.conversation.remoteJid),
                text: reply,
            });
            await this.messageRepo.create({
                conversationId: input.conversation.id,
                evolutionMessageId: sent.key.id,
                author: "BOT",
                content: reply,
                status: "SENT",
            });
            await this.conversationRepo.update(input.conversation.id, {
                lastMessagePreview: reply.slice(0, 100),
                lastMessageAt: new Date(),
                // Wipe stale flow state — this conversation is now in a
                // post-order ack mode, not in the middle of a menu walk.
                currentStepId: null,
                flowState: null,
            });
        } catch (err) {
            console.warn(
                `PostPaymentHandler: ack send failed for order ${order.id}:`,
                err,
            );
        }
        return true;
    }
}

function buildDefaultAcknowledgement(order: Order): string {
    const orderNumber = `#${String(order.sequence).padStart(4, "0")}`;
    return [
        `✅ Pedido ${orderNumber} confirmado, recebemos seu pagamento!`,
        "Já estamos cuidando de tudo por aqui — assim que sair para entrega, te avisamos.",
        "Qualquer dúvida, é só responder por aqui 🙌",
    ].join("\n\n");
}
