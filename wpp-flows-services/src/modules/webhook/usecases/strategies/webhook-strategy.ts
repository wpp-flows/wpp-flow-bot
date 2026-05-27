import type { Bot, BotRepository } from "@/modules/bot/repositories/bot-repo";
import type {
    ConversationRepository,
    MessageRepository,
} from "@/modules/chat/repositories/chat-repo";
import type { CustomerRepository } from "@/modules/customer/repositories/customer-repo";
import type { NotificationEmitter } from "@/modules/notification/usecases/notification-emitter";
import type { FlowRunner } from "../flow-runner";
import type { PostPaymentHandler } from "../post-payment/post-payment-handler";

export interface WebhookContext {
    bot: Bot;
    botRepo: BotRepository;
    conversationRepo: ConversationRepository;
    messageRepo: MessageRepository;
    customerRepo: CustomerRepository;
    flowRunner: FlowRunner;
    notificationEmitter: NotificationEmitter;
    postPaymentHandler: PostPaymentHandler;
}

export interface WebhookEventStrategy {
    readonly eventName: string;
    handle(ctx: WebhookContext, data: unknown): Promise<void>;
}

export function normalizeEventName(raw: string): string {
    return raw.toLowerCase().replaceAll("_", ".");
}
