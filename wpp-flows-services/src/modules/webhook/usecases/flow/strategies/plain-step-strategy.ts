import { evolutionApi } from "@/infrastructure/evolution/client";
import type { FlowStep } from "@/modules/flow/repositories/flow-repo";
import { renderMessage } from "../../render-message";
import type { SendResult } from "../flow-shared";
import type {
    FlowStepSenderContext,
    FlowStepStrategy,
} from "./step-strategy";

/**
 * Renders any step as a plain WhatsApp text. Acts as the fallback strategy:
 * it returns `true` from {@link supports} for every step type, so registering
 * it last in the strategies array guarantees a renderer is always found.
 *
 * Used by MESSAGE and INPUT steps. PAYMENT also routes here when MP isn't
 * configured (see {@link PaymentStepStrategy}'s internal fallback).
 */
export class PlainStepStrategy implements FlowStepStrategy {
    supports(): boolean {
        return true;
    }

    async send(input: FlowStepSenderContext): Promise<SendResult> {
        const { bot, phoneNumber, step, ctx } = input;
        const text = renderMessage(renderPlainStep(step), ctx);
        const evolutionResp = await evolutionApi.sendText({
            instanceName: bot.evolutionInstanceName,
            number: phoneNumber,
            text,
        });
        return { evolutionResp, preview: text, optionMap: {} };
    }
}

function renderPlainStep(step: FlowStep): string {
    if (step.type === "PAYMENT") {
        const meta = step.metadata as
            | { paymentLink?: string; total?: number | string }
            | null;
        if (meta?.paymentLink) {
            return `${step.content}\n\nPay here: ${meta.paymentLink}`;
        }
    }
    return step.content;
}
