import type { Bot } from "@/modules/bot/repositories/bot-repo";
import type { FlowState } from "@/modules/chat/repositories/chat-repo";
import type { FlowStep } from "@/modules/flow/repositories/flow-repo";
import type { RenderContext } from "../../render-message";
import type { SendResult } from "../flow-shared";

export interface FlowStepSenderContext {
    bot: Bot;
    phoneNumber: string;
    step: FlowStep;
    state: FlowState;
    canGoBack: boolean;
    ctx: RenderContext;
}

/**
 * Strategy that renders one (or more) FlowStep type. The registry in
 * {@link FlowStepSender} iterates the array passed to its constructor and
 * picks the first strategy whose {@link supports} returns true. Put more
 * specific strategies before generic ones; end the list with the plain
 * fallback so unknown types still resolve.
 */
export interface FlowStepStrategy {
    supports(stepType: FlowStep["type"]): boolean;
    send(input: FlowStepSenderContext): Promise<SendResult>;
}
