import type {
    Conversation,
    ConversationRepository,
} from "@/modules/chat/repositories/chat-repo";
import {
    extractText,
    isPersonalJid,
    parseMessages,
    type EvolutionMessage,
} from "./shared";
import type { WebhookContext, WebhookEventStrategy } from "./webhook-strategy";

export class MessagesUpsertStrategy implements WebhookEventStrategy {
    readonly eventName = "messages.upsert";

    async handle(ctx: WebhookContext, data: unknown): Promise<void> {
        const messages = parseMessages(data);
        for (const msg of messages) {
            await this.handleMessage(ctx, msg);
        }
    }

    private async handleMessage(
        ctx: WebhookContext,
        msg: EvolutionMessage
    ): Promise<void> {
        if (!msg?.key?.remoteJid) return;
        if (!isPersonalJid(msg.key.remoteJid)) return;

        const text = extractText(msg);
        if (!text) return;

        if (msg.key.fromMe && msg.key.id) {
            const existing = await ctx.messageRepo.findByEvolutionId(msg.key.id);
            if (existing) return;
        }

        const conversation = await this.upsertConversation(ctx.conversationRepo, {
            organizationId: ctx.bot.organizationId,
            botId: ctx.bot.id,
            remoteJid: msg.key.remoteJid,
            contactName: msg.pushName ?? msg.key.remoteJid.replace(/@.*$/, ""),
            preview: text,
        });

        const recorded = await ctx.messageRepo.create({
            conversationId: conversation.id,
            evolutionMessageId: msg.key.id,
            author: msg.key.fromMe ? "AGENT" : "USER",
            content: text,
            status: "DELIVERED",
        });

        const nextUnread = msg.key.fromMe ? 0 : conversation.unreadCount + 1;
        const updated = await ctx.conversationRepo.update(conversation.id, {
            lastMessagePreview: text.slice(0, 100),
            lastMessageAt: recorded.createdAt,
            unreadCount: nextUnread,
        });

        if (msg.key.fromMe) return;
        await ctx.flowRunner.handleInbound({ bot: ctx.bot, conversation: updated });
    }

    private async upsertConversation(
        repo: ConversationRepository,
        input: {
            organizationId: string;
            botId: string;
            remoteJid: string;
            contactName: string;
            preview: string;
        }
    ): Promise<Conversation> {
        const existing = await repo.findByBotAndRemoteJid(input.botId, input.remoteJid);
        if (existing) return existing;

        const phone = input.remoteJid.replace(/@.*$/, "");
        return repo.create({
            organizationId: input.organizationId,
            botId: input.botId,
            remoteJid: input.remoteJid,
            contactName: input.contactName,
            contactPhone: phone,
            lastMessagePreview: input.preview.slice(0, 100),
            lastMessageAt: new Date(),
        });
    }
}
