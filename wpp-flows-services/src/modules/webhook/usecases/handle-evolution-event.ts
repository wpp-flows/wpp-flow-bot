import type { BotRepository } from "@/modules/bot/repositories/bot-repo";
import type {
    ConversationRepository,
    MessageRepository,
} from "@/modules/chat/repositories/chat-repo";
import type { CustomerRepository } from "@/modules/customer/repositories/customer-repo";
import type { NotificationEmitter } from "@/modules/notification/usecases/notification-emitter";
import type { FlowRunner } from "./flow-runner";
import {
    normalizeEventName,
    type WebhookEventStrategy,
} from "./strategies";
import type { PostPaymentHandler } from "./post-payment/post-payment-handler";

export interface EvolutionWebhookEvent {
    event: string;
    instance: string;
    data: unknown;
}

export class HandleEvolutionEventUseCase {
    private readonly registry: Map<string, WebhookEventStrategy>;

    constructor(
        private readonly botRepo: BotRepository,
        private readonly conversationRepo: ConversationRepository,
        private readonly messageRepo: MessageRepository,
        private readonly customerRepo: CustomerRepository,
        private readonly flowRunner: FlowRunner,
        private readonly notificationEmitter: NotificationEmitter,
        private readonly postPaymentHandler: PostPaymentHandler,
        private readonly strategies: WebhookEventStrategy[]
    ) {
        this.registry = new Map(this.strategies.map((s) => [s.eventName, s]));
    }

    async execute(event: EvolutionWebhookEvent): Promise<void> {
        const bot = await this.botRepo.findByInstanceName(event.instance);
        if (!bot) {
            console.warn(`Webhook for unknown instance: ${event.instance}`);
            return;
        }

        console.log(`Received event "${event.event}" for bot "${bot.name}"`);

        const strategy = this.registry.get(normalizeEventName(event.event));
        if (!strategy) return;

        await strategy.handle(
            {
                bot,
                botRepo: this.botRepo,
                conversationRepo: this.conversationRepo,
                messageRepo: this.messageRepo,
                customerRepo: this.customerRepo,
                flowRunner: this.flowRunner,
                notificationEmitter: this.notificationEmitter,
                postPaymentHandler: this.postPaymentHandler,
            },
            event.data
        );
    }
}
