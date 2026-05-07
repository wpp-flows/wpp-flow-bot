import type { BotRepository } from "@/modules/bot/repositories/bot-repo";
import type {
    ConversationRepository,
    MessageRepository,
} from "@/modules/chat/repositories/chat-repo";
import type { FlowRunner } from "./flow-runner";
import {
    defaultWebhookStrategies,
    normalizeEventName,
    type WebhookEventStrategy,
} from "./strategies";

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
        private readonly flowRunner: FlowRunner,
        strategies: WebhookEventStrategy[] = defaultWebhookStrategies()
    ) {
        this.registry = new Map(strategies.map((s) => [s.eventName, s]));
    }

    async execute(event: EvolutionWebhookEvent): Promise<void> {
        const bot = await this.botRepo.findByInstanceName(event.instance);
        if (!bot) {
            console.warn(`Webhook for unknown instance: ${event.instance}`);
            return;
        }

        const strategy = this.registry.get(normalizeEventName(event.event));
        if (!strategy) return;

        await strategy.handle(
            {
                bot,
                botRepo: this.botRepo,
                conversationRepo: this.conversationRepo,
                messageRepo: this.messageRepo,
                flowRunner: this.flowRunner,
            },
            event.data
        );
    }
}
