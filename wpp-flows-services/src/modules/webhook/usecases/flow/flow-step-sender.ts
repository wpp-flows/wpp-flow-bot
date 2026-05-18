import { evolutionApi } from "@/infrastructure/evolution/client";
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
     * Fires the "digitando…" presence and waits {@link TYPING_DELAY_MS} so the
     * customer actually sees the indicator before the message lands.
     * Best-effort — failures don't abort delivery.
     */
    async indicateTyping(instanceName: string, phoneNumber: string): Promise<void> {
        try {
            await evolutionApi.sendPresence({
                instanceName,
                number: phoneNumber,
                presence: "composing",
                delayMs: TYPING_DELAY_MS,
            });
        } catch (err) {
            console.warn("sendPresence failed (best-effort):", err);
        }
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
