import { orgEventBus } from "@/infrastructure/events/event-bus";
import { senderFor } from "@/infrastructure/whatsapp";
import type { Bot } from "@/modules/bot/repositories/bot-repo";
import type {
    Conversation,
    ConversationRepository,
    MessageRepository,
} from "@/modules/chat/repositories/chat-repo";
import type { NotificationEmitter } from "@/modules/notification/usecases/notification-emitter";
import type { OrganizationRepository } from "@/modules/organization/repositories/organization-repo";
import { jidToSendTarget } from "@/shared/whatsapp-jid";

const DEFAULT_KEYWORDS = ["atendente"];
const DEFAULT_CONFIRMATION =
    "Certo, {{customer_name}}! Chamei um atendente — ele vai te responder por aqui em instantes 👋";

/** Normaliza para comparação: minúsculas e sem acentos. */
function normalize(text: string): string {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "");
}

/**
 * Handoff para atendimento humano. Quando a mensagem do cliente contém uma das
 * keywords configuradas na organização ("atendente" por padrão):
 *
 *  1. o bot é pausado NESTA conversa (`botActive = false`) — o fluxo não roda;
 *  2. a conversa vira PENDING, destacando-a na lista;
 *  3. o cliente recebe uma confirmação (personalizável, aceita {{customer_name}});
 *  4. a organização é notificada em tempo real (sino + SSE).
 *
 * O agente responde pela aba Conversas — a janela de 24h da Meta está aberta,
 * já que o cliente acabou de escrever. Retomar o bot é o botão que já existe
 * no painel da conversa.
 */
export class HumanHandoffHandler {
    constructor(
        private readonly orgRepo: OrganizationRepository,
        private readonly conversationRepo: ConversationRepository,
        private readonly messageRepo: MessageRepository,
        private readonly notificationEmitter: NotificationEmitter,
    ) { }

    /** Retorna true quando o handoff disparou (o fluxo não deve rodar). */
    async tryHandle(input: {
        bot: Bot;
        conversation: Conversation;
        text: string;
    }): Promise<boolean> {
        const { bot, conversation, text } = input;

        // Já em modo humano — não notifica de novo a cada mensagem.
        if (!conversation.botActive) return false;

        const org = await this.orgRepo.findById(bot.organizationId);
        if (!org) return false;

        const keywords =
            org.humanHandoffKeywords.length > 0
                ? org.humanHandoffKeywords
                : DEFAULT_KEYWORDS;
        const normalized = normalize(text);
        const matched = keywords.some((k) => normalized.includes(normalize(k)));
        if (!matched) return false;

        // Pausa + PENDING primeiro: mesmo que a confirmação falhe, o pedido de
        // atendimento não pode se perder.
        await this.conversationRepo.update(conversation.id, {
            botActive: false,
            status: "PENDING",
        });

        void this.notificationEmitter.emit({
            organizationId: bot.organizationId,
            type: "HUMAN_HANDOFF",
            title: "Cliente pediu atendimento humano",
            body: `${conversation.contactName} está aguardando — responda na aba Conversas.`,
            link: `/conversations?id=${conversation.id}`,
        });

        await this.sendConfirmation(bot, conversation, org.humanHandoffMessage);

        orgEventBus.emit(bot.organizationId, {
            kind: "chat.conversation",
            conversationId: conversation.id,
        });

        return true;
    }

    private async sendConfirmation(
        bot: Bot,
        conversation: Conversation,
        customMessage: string | null,
    ): Promise<void> {
        const template = customMessage?.trim() || DEFAULT_CONFIRMATION;
        const reply = template
            .split("{{customer_name}}")
            .join(conversation.contactName || "");

        try {
            const { gateway, transport } = senderFor(bot);
            const sent = await gateway.sendText(
                transport,
                jidToSendTarget(conversation.remoteJid),
                reply,
            );
            await this.messageRepo.create({
                conversationId: conversation.id,
                evolutionMessageId: sent.messageId,
                author: "BOT",
                content: reply,
                status: "SENT",
            });
            await this.conversationRepo.update(conversation.id, {
                lastMessagePreview: reply.slice(0, 100),
                lastMessageAt: new Date(),
            });
            orgEventBus.emit(bot.organizationId, {
                kind: "chat.message",
                conversationId: conversation.id,
                direction: "OUT",
            });
        } catch (err) {
            console.warn(
                `HumanHandoff: confirmation send failed for conversation ${conversation.id}:`,
                err,
            );
        }
    }
}
