import type { Bot, BotRepository } from "@/modules/bot/repositories/bot-repo";
import type {
    ConversationRepository,
    MessageRepository,
} from "@/modules/chat/repositories/chat-repo";
import type { FlowRunner } from "../flow-runner";

export interface WebhookContext {
    bot: Bot;
    botRepo: BotRepository;
    conversationRepo: ConversationRepository;
    messageRepo: MessageRepository;
    flowRunner: FlowRunner;
}

export interface WebhookEventStrategy {
    readonly eventName: string;
    handle(ctx: WebhookContext, data: unknown): Promise<void>;
}

export function normalizeEventName(raw: string): string {
    return raw.toLowerCase().replaceAll("_", ".");
}
