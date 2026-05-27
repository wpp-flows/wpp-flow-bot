import type { FlowState } from "@/modules/chat/repositories/chat-repo";
import type { FlowStep } from "@/modules/flow/repositories/flow-repo";
import { findStep, nextStep, sortSteps } from "./flow-step-helpers";

export interface Transition {
    step: FlowStep;
    state: FlowState;
}

/**
 * Linear flow walker. With ordering moved to the web menu, WhatsApp flows are
 * MESSAGE-only — every inbound customer message advances the bot to the next
 * step (or stays put if there are no more steps).
 *
 * Kept as a class with the same `applyInput` shape the runner imports so the
 * door is open to reintroducing interactive step types later without rippling
 * through callers.
 */
export class FlowStateMachine {
    applyInput(input: {
        steps: FlowStep[];
        currentStep: FlowStep;
        state: FlowState;
    }): Transition {
        const sorted = sortSteps(input.steps);
        const next = nextStep(sorted, input.currentStep.id);
        return { step: next ?? input.currentStep, state: input.state };
    }

    /** Where does the flow start? (always step[0]). */
    firstStep(steps: FlowStep[]): FlowStep | null {
        return sortSteps(steps)[0] ?? null;
    }

    /** Returns the step in `steps` matching `id`. */
    findStep(steps: FlowStep[], id: string | null): FlowStep | null {
        return findStep(sortSteps(steps), id);
    }
}
