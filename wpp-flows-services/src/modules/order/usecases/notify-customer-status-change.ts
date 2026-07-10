import { senderFor } from "@/infrastructure/whatsapp";
import type { BotRepository } from "@/modules/bot/repositories/bot-repo";
import type {
    ConversationRepository,
    MessageRepository,
} from "@/modules/chat/repositories/chat-repo";
import { jidToSendTarget } from "@/shared/whatsapp-jid";
import { orderNumberOf } from "@/modules/public-orders/usecases/shared";
import { statusTemplateFor } from "@/modules/public-orders/usecases/whatsapp-templates";
import type { Order, OrderStatus } from "../repositories/order-repo";

const CUSTOMER_SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;

export class NotifyCustomerOrderStatusChangeUseCase {
    constructor(
        private readonly conversationRepo: ConversationRepository,
        private readonly botRepo: BotRepository,
        private readonly messageRepo: MessageRepository,
    ) {}

    async execute(order: Order, newStatus: OrderStatus): Promise<void> {
        if (!order.conversationId) return;

        const text = buildStatusMessage(order, newStatus);
        if (!text) return;

        const conversation = await this.conversationRepo.findByIdInOrg(
            order.organizationId,
            order.conversationId,
        );
        if (!conversation?.remoteJid) return;

        const bot = await this.botRepo.findByIdInOrg(
            order.organizationId,
            conversation.botId,
        );
        if (!bot?.isActive) return;

        // On Cloud API outside the 24h window, a free-form status text is
        // rejected — fall back to the approved template for this status.
        const withinWindow =
            !!conversation.lastInboundAt &&
            Date.now() - conversation.lastInboundAt.getTime() <
            CUSTOMER_SERVICE_WINDOW_MS;
        const template = statusTemplateFor(newStatus, orderNumberOf(order.sequence));
        const useTemplate =
            bot.provider === "CLOUD_API" && !!template && !withinWindow;

        try {
            const { gateway, transport } = senderFor(bot);
            const target = jidToSendTarget(conversation.remoteJid);
            const sent =
                useTemplate && template
                    ? await gateway.sendTemplate(transport, target, template)
                    : await gateway.sendText(transport, target, text);
            await this.messageRepo.create({
                conversationId: conversation.id,
                evolutionMessageId: sent.messageId,
                author: "BOT",
                content: text,
                status: "SENT",
            });
            await this.conversationRepo.update(conversation.id, {
                lastMessagePreview: text.slice(0, 100),
                lastMessageAt: new Date(),
            });
        } catch (err) {
            console.warn(
                `Order status notification failed for order ${order.id}:`,
                err,
            );
        }

        if (newStatus === "CANCELED") {
            await this.conversationRepo.update(conversation.id, {
                currentStepId: null,
                flowState: null,
            });
        }
    }
}

function buildStatusMessage(order: Order, status: OrderStatus): string | null {
    const orderNumber = `#${String(order.sequence).padStart(4, "0")}`;
    const itemsList = order.items
        .map((it) => `• ${it.qty}x ${it.name}`)
        .join("\n");

    switch (status) {
        case "PREPARING":
            return `👨‍🍳 Estamos preparando seu pedido ${orderNumber}!\n\n${itemsList}\n\nA gente te avisa quando sair para entrega 😊`;
        case "OUT_FOR_DELIVERY":
            return `🛵 Seu pedido ${orderNumber} saiu para entrega!\n\n${itemsList}\n\nFica de olho — já está a caminho!`;
        case "DELIVERED":
            return `✅ Pedido ${orderNumber} entregue! Obrigado por comprar com a gente 🙏\n\nQualquer coisa é só chamar por aqui.`;
        case "CANCELED":
            return `❌ Seu pedido ${orderNumber} foi cancelado.\n\nSe foi engano ou tiver alguma dúvida, é só responder aqui.`;
        default:
            return null;
    }
}
