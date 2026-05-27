import type { Bot } from "@/modules/bot/repositories/bot-repo";
import type { FlowStep } from "@/modules/flow/repositories/flow-repo";
import type { RenderContext } from "../../render-message";
import type { SendResult } from "../flow-shared";

export interface FlowStepSenderContext {
    bot: Bot;
    phoneNumber: string;
    step: FlowStep;
    ctx: RenderContext;
}

/**
 * Strategy that renders a FlowStep. With MESSAGE the only step type today,
 * the lineup is one entry — but the abstraction stays in place so future
 * interactive step types can plug in via `supports()` without changing the
 * runner.
 */
export interface FlowStepStrategy {
    supports(stepType: FlowStep["type"]): boolean;
    send(input: FlowStepSenderContext): Promise<SendResult>;
}
