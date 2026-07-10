import { orgEventBus } from "@/infrastructure/events/event-bus";
import { senderFor, type SendTemplateInput } from "@/infrastructure/whatsapp";
import type { BotRepository } from "@/modules/bot/repositories/bot-repo";
import type {
    Conversation,
    ConversationRepository,
    MessageRepository,
} from "@/modules/chat/repositories/chat-repo";

/** Meta's free-form messaging window: 24h since the customer's last inbound. */
const CUSTOMER_SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;

function withinServiceWindow(conversation: Conversation): boolean {
    if (!conversation.lastInboundAt) return false;
    return Date.now() - conversation.lastInboundAt.getTime() < CUSTOMER_SERVICE_WINDOW_MS;
}

export class OrderCustomerNotifier {
    constructor(
        private readonly botRepo: BotRepository,
        private readonly conversationRepo: ConversationRepository,
        private readonly messageRepo: MessageRepository,
    ) { }

    /**
     * Sends a proactive message to the customer. `text` is the free-form body;
     * `template` (optional) is the approved-template fallback used when the
     * CLOUD_API 24h window has closed — outside the window Meta rejects
     * free-form text, so a template is the only way through. Evolution ignores
     * the window and always sends `text`.
     */
    async notify(input: {
        organizationId: string;
        phone: string;
        contactName: string;
        text: string;
        template?: SendTemplateInput;
    }): Promise<boolean> {
        const { organizationId, phone, contactName, text, template } = input;
        if (!text.trim()) return false;

        const bots = await this.botRepo.listByOrg(organizationId);
        const bot =
            bots.find((b) => b.status === "ONLINE" && b.isActive) ??
            bots.find((b) => b.isActive) ??
            null;
        if (!bot) return false;

        const remoteJid = `${phone.replace(/\D/g, "")}@s.whatsapp.net`;
        const conversation =
            (await this.conversationRepo.findByBotAndRemoteJid(bot.id, remoteJid)) ??
            (await this.conversationRepo.create({
                organizationId,
                botId: bot.id,
                remoteJid,
                contactName: contactName || phone,
                contactPhone: phone,
            }));

        const { gateway, transport } = senderFor(bot);
        // On Cloud API outside the 24h window we can only send an approved
        // template. Everywhere else (Evolution, or within the window) send text.
        const useTemplate =
            bot.provider === "CLOUD_API" &&
            !!template &&
            !withinServiceWindow(conversation);

        try {
            const sent = useTemplate
                ? await gateway.sendTemplate(transport, phone, template!)
                : await gateway.sendText(transport, phone, text);

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

            orgEventBus.emit(organizationId, {
                kind: "chat.message",
                conversationId: conversation.id,
                direction: "OUT",
            });
            return true;
        } catch (err) {
            console.warn(
                `OrderCustomerNotifier failed for org=${organizationId} order-phone=${phone}:`,
                err,
            );
            return false;
        }
    }
}
