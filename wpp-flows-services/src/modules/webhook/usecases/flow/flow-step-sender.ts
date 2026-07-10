import { senderFor } from "@/infrastructure/whatsapp";
import type { Bot } from "@/modules/bot/repositories/bot-repo";
import type { FlowStep } from "@/modules/flow/repositories/flow-repo";
import { type SendResult, TYPING_DELAY_MS } from "./flow-shared";
import type {
    FlowStepSenderContext,
    FlowStepStrategy,
} from "./strategies";

/**
 * Thin dispatcher that ships one flow step to the customer. Each step type is
 * handled by a {@link FlowStepStrategy} registered at construction time —
 * adding a new step type is as simple as writing a new strategy and adding it
 * to the array, without touching this class.
 *
 * Also owns the "digitando…" presence pulse the runner fires before every
 * delivery so the indicator and the message are paced together.
 */
export class FlowStepSender {
    constructor(private readonly strategies: FlowStepStrategy[]) {
        if (strategies.length === 0) {
            throw new Error("FlowStepSender requires at least one strategy.");
        }
    }

    /**
     * Fires the "digitando…" indicator and waits {@link TYPING_DELAY_MS} so the
     * customer actually sees it before the message lands. The gateway call is
     * fire-and-forget — awaiting it would serialize two round-trips (indicator
     * + send) and add avoidable latency to every reply.
     *
     * On Cloud the indicator is a mark-read of the customer's triggering
     * message, so it needs `inboundMessageId`; without one there's nothing to
     * show and we skip the pacing sleep too.
     */
    async indicateTyping(
        bot: Bot,
        phoneNumber: string,
        inboundMessageId?: string | null,
    ): Promise<void> {
        if (!inboundMessageId) return;
        const { gateway, transport } = senderFor(bot);
        void gateway
            .indicateTyping(transport, phoneNumber, inboundMessageId)
            .catch((err: unknown) => {
                console.warn("indicateTyping failed (best-effort):", err);
            });
        await new Promise<void>((resolve) => setTimeout(resolve, TYPING_DELAY_MS));
    }

    async sendStep(input: FlowStepSenderContext): Promise<SendResult> {
        const strategy = this.pickStrategy(input.step.type);
        return strategy.send(input);
    }

    private pickStrategy(stepType: FlowStep["type"]): FlowStepStrategy {
        const found = this.strategies.find((s) => s.supports(stepType));
        if (!found) {
            // Defensive — the constructor ensures at least one strategy exists,
            // but a misconfigured factory could leave us without a fallback.
            throw new Error(`No strategy registered for step type ${stepType}`);
        }
        return found;
    }
}
