import { evolutionApi } from "@/infrastructure/evolution/client";
import { orgEventBus } from "@/infrastructure/events/event-bus";
import type { BotRepository } from "@/modules/bot/repositories/bot-repo";
import type {
    ConversationRepository,
    MessageRepository,
} from "@/modules/chat/repositories/chat-repo";
import { jidToSendTarget } from "@/modules/webhook/usecases/strategies/shared";


export class OrderCustomerNotifier {
    constructor(
        private readonly botRepo: BotRepository,
        private readonly conversationRepo: ConversationRepository,
        private readonly messageRepo: MessageRepository,
    ) {}

    async notify(input: {
        organizationId: string;
        phone: string;
        contactName: string;
        text: string;
    }): Promise<boolean> {
        const { organizationId, phone, contactName, text } = input;
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

        try {
            const sent = await evolutionApi.sendText({
                instanceName: bot.evolutionInstanceName,
                number: jidToSendTarget(remoteJid),
                text,
            });
            await this.messageRepo.create({
                conversationId: conversation.id,
                evolutionMessageId: sent.key.id,
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
