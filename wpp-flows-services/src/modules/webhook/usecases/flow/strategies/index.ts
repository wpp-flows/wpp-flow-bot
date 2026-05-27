import { PlainStepStrategy } from "./plain-step-strategy";
import type { FlowStepStrategy } from "./step-strategy";

export type {
    FlowStepSenderContext,
    FlowStepStrategy,
} from "./step-strategy";
export { PlainStepStrategy } from "./plain-step-strategy";

/**
 * Builds the default step-strategy lineup. Since the WhatsApp flow is
 * MESSAGE-only after the web-menu pivot, there's just one renderer; the
 * strategy pattern stays in place so a future interactive step type can plug
 * in without changing callers.
 */
export function defaultStepStrategies(): FlowStepStrategy[] {
    return [new PlainStepStrategy()];
}
