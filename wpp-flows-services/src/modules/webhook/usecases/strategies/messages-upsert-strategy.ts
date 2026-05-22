import type {
    Conversation,
    ConversationRepository,
} from "@/modules/chat/repositories/chat-repo";
import {
    extractSelectionId,
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
        if (messages.length === 0) {
            console.warn("messages.upsert: no messages in payload", data);
            return;
        }
        for (const msg of messages) {
            await this.handleMessage(ctx, msg);
        }
    }

    private async handleMessage(
        ctx: WebhookContext,
        msg: EvolutionMessage
    ): Promise<void> {
        if (!msg?.key?.remoteJid) {
            console.warn("messages.upsert: skip — missing remoteJid", msg);
            return;
        }
        if (!isPersonalJid(msg.key.remoteJid)) {
            console.warn(
                `messages.upsert: skip non-personal JID ${msg.key.remoteJid}`
            );
            return;
        }

        const text = extractText(msg);
        if (!text) {
            console.warn(
                `messages.upsert: skip ${msg.key.remoteJid} — no text in supported fields. message=`,
                JSON.stringify(msg.message)
            );
            return;
        }

        if (msg.key.fromMe && msg.key.id) {
            const existing = await ctx.messageRepo.findByEvolutionId(msg.key.id);
            if (existing) return;
        }

        const incomingCustomerName = msg.key.fromMe ? undefined : msg.pushName;
        const conversation = await this.upsertConversation(ctx.conversationRepo, {
            organizationId: ctx.bot.organizationId,
            botId: ctx.bot.id,
            remoteJid: msg.key.remoteJid,
            contactName:
                incomingCustomerName ?? msg.key.remoteJid.replace(/@.*$/, ""),
            preview: text,
        });

        if (
            incomingCustomerName &&
            incomingCustomerName !== conversation.contactName &&
            /^\d+$/.test(conversation.contactName ?? "")
        ) {
            await ctx.conversationRepo.update(conversation.id, {
                contactName: incomingCustomerName,
            });
            conversation.contactName = incomingCustomerName;
        }

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
        const selectionId = extractSelectionId(msg);
        await ctx.flowRunner.handleInbound({
            bot: ctx.bot,
            conversation: updated,
            selectionId,
            text,
        });
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
