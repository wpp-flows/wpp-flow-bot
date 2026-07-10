import { senderFor } from "@/infrastructure/whatsapp";
import { renderMessage } from "../../render-message";
import type { SendResult } from "../flow-shared";
import type {
    FlowStepSenderContext,
    FlowStepStrategy,
} from "./step-strategy";

/**
 * Renders a MESSAGE step as plain WhatsApp text through the provider-agnostic
 * gateway. The strategy pattern stays in place for future interactive step
 * types; today this is the only renderer.
 */
export class PlainStepStrategy implements FlowStepStrategy {
    supports(): boolean {
        return true;
    }

    async send(input: FlowStepSenderContext): Promise<SendResult> {
        const { bot, phoneNumber, step, ctx } = input;
        const text = renderMessage(step.content, ctx);
        const { gateway, transport } = senderFor(bot);
        const res = await gateway.sendText(transport, phoneNumber, text);
        return { messageId: res.messageId, preview: text };
    }
}
