import { evolutionApi } from "@/infrastructure/evolution/client";
import { NotFoundError } from "@/shared/exceptions/http";
import type { BotRepository } from "@/modules/bot/repositories/bot-repo";
import { jidToSendTarget } from "@/modules/webhook/usecases/strategies/shared";
import type {
    Conversation,
    ConversationFilters,
    ConversationRepository,
    Message,
    MessageRepository,
} from "../repositories/chat-repo";

export class ListConversationsUseCase {
    constructor(private readonly repo: ConversationRepository) {}
    execute(input: {
        organizationId: string;
        filters: ConversationFilters;
    }): Promise<Conversation[]> {
        return this.repo.listByOrg(input.organizationId, input.filters);
    }
}

export class GetConversationUseCase {
    constructor(private readonly repo: ConversationRepository) {}
    async execute(input: {
        organizationId: string;
        id: string;
    }): Promise<Conversation> {
        const found = await this.repo.findByIdInOrg(input.organizationId, input.id);
        if (!found) throw new NotFoundError("Conversation");
        return found;
    }
}

export class ListMessagesUseCase {
    constructor(
        private readonly conversationRepo: ConversationRepository,
        private readonly messageRepo: MessageRepository
    ) {}
    async execute(input: {
        organizationId: string;
        conversationId: string;
        limit?: number;
    }): Promise<Message[]> {
        const conv = await this.conversationRepo.findByIdInOrg(
            input.organizationId,
            input.conversationId
        );
        if (!conv) throw new NotFoundError("Conversation");
        if (conv.unreadCount > 0) {
            await this.conversationRepo.update(conv.id, { unreadCount: 0 });
        }
        return this.messageRepo.listByConversation(input.conversationId, {
            limit: input.limit,
        });
    }
}

export class SendMessageUseCase {
    constructor(
        private readonly conversationRepo: ConversationRepository,
        private readonly messageRepo: MessageRepository,
        private readonly botRepo: BotRepository
    ) {}

    async execute(input: {
        organizationId: string;
        conversationId: string;
        content: string;
        author?: "AGENT" | "BOT";
    }): Promise<Message> {
        const conv = await this.conversationRepo.findByIdInOrg(
            input.organizationId,
            input.conversationId
        );
        if (!conv) throw new NotFoundError("Conversation");

        const bot = await this.botRepo.findByIdInOrg(input.organizationId, conv.botId);
        if (!bot) throw new NotFoundError("Bot");

        const evolutionResp = await evolutionApi.sendText({
            instanceName: bot.evolutionInstanceName,
            number: jidToSendTarget(conv.remoteJid),
            text: input.content,
        });

        const message = await this.messageRepo.create({
            conversationId: conv.id,
            evolutionMessageId: evolutionResp.key.id,
            author: input.author ?? "AGENT",
            content: input.content,
            status: "SENT",
        });

        await this.conversationRepo.update(conv.id, {
            lastMessagePreview: input.content.slice(0, 100),
            lastMessageAt: message.createdAt,
        });

        return message;
    }
}

export class SetBotActiveUseCase {
    constructor(private readonly conversationRepo: ConversationRepository) {}
    async execute(input: {
        organizationId: string;
        conversationId: string;
        botActive: boolean;
    }): Promise<Conversation> {
        const conv = await this.conversationRepo.findByIdInOrg(
            input.organizationId,
            input.conversationId
        );
        if (!conv) throw new NotFoundError("Conversation");
        return this.conversationRepo.update(conv.id, {
            botActive: input.botActive,
        });
    }
}

export class UpdateConversationStatusUseCase {
    constructor(private readonly conversationRepo: ConversationRepository) {}
    async execute(input: {
        organizationId: string;
        conversationId: string;
        status: Conversation["status"];
    }): Promise<Conversation> {
        const conv = await this.conversationRepo.findByIdInOrg(
            input.organizationId,
            input.conversationId
        );
        if (!conv) throw new NotFoundError("Conversation");
        return this.conversationRepo.update(conv.id, { status: input.status });
    }
}

/** Marca como lido sem depender do GET /messages (evita corrida ao trocar de conversa rápido). */
export class MarkConversationReadUseCase {
    constructor(private readonly conversationRepo: ConversationRepository) {}
    async execute(input: {
        organizationId: string;
        conversationId: string;
    }): Promise<Conversation> {
        const conv = await this.conversationRepo.findByIdInOrg(
            input.organizationId,
            input.conversationId
        );
        if (!conv) throw new NotFoundError("Conversation");
        if (conv.unreadCount === 0) return conv;
        return this.conversationRepo.update(conv.id, { unreadCount: 0 });
    }
}
