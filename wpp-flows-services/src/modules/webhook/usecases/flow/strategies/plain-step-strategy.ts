import { evolutionApi } from "@/infrastructure/evolution/client";
import { renderMessage } from "../../render-message";
import type { SendResult } from "../flow-shared";
import type {
    FlowStepSenderContext,
    FlowStepStrategy,
} from "./step-strategy";

/**
 * Renders a MESSAGE step as plain WhatsApp text. The strategy pattern stays
 * in place for future interactive step types; today this is the only renderer.
 */
export class PlainStepStrategy implements FlowStepStrategy {
    supports(): boolean {
        return true;
    }

    async send(input: FlowStepSenderContext): Promise<SendResult> {
        const { bot, phoneNumber, step, ctx } = input;
        const text = renderMessage(step.content, ctx);
        const evolutionResp = await evolutionApi.sendText({
            instanceName: bot.evolutionInstanceName,
            number: phoneNumber,
            text,
        });
        return { evolutionResp, preview: text };
    }
}
