import type { FlowState } from "@/modules/chat/repositories/chat-repo";
import type { FlowStep } from "@/modules/flow/repositories/flow-repo";
import type { ItemRepository } from "@/modules/menu/repositories/menu-repo";
import { appendToCart, initialState } from "./flow-cart";
import {
    findFirstStepOfType,
    nextStep,
    phaseForStep,
    previousStep,
} from "./flow-step-helpers";
import {
    ADD_MORE_ID,
    BACK_ID,
    CANCEL_ID,
    CATEGORY_PREFIX,
    CONFIRM_ID,
    ITEM_PREFIX,
} from "./flow-shared";

export interface Transition {
    step: FlowStep;
    state: FlowState;
}

/**
 * Pure-ish routing for the flow runner. Given the current step, state and the
 * customer's selection id, returns the next step + state. The only I/O is
 * fetching a menu item when an `item:<id>` selection lands on a MENU step.
 */
export class FlowStateMachine {
    constructor(private readonly itemRepo: ItemRepository) {}

    async applyInput(input: {
        organizationId: string;
        steps: FlowStep[];
        currentStep: FlowStep;
        state: FlowState;
        selectionId: string | null;
    }): Promise<Transition> {
        const { steps, currentStep, state, selectionId } = input;

        // INPUT step expects a typed reply, handled by the runner's capture
        // path. Reaching this branch means the awaiting flag was lost (e.g. a
        // server restart) — re-send the prompt so the customer knows what we want.
        // PAYMENT step waits on an external webhook, not on customer input.
        if (currentStep.type === "INPUT" || currentStep.type === "PAYMENT") {
            return { step: currentStep, state };
        }

        // Non-interactive steps (MESSAGE, etc.) advance on any inbound — they
        // don't ship buttons/lists so the user has nothing to "select". Without
        // this the first MESSAGE step would loop forever.
        if (currentStep.type !== "MENU" && currentStep.type !== "CONFIRMATION") {
            return this.applyLinearInput({ steps, currentStep, state, selectionId });
        }

        // Interactive steps: if the user didn't pick a button/row, just nudge
        // them by re-delivering the current step.
        if (!selectionId) return { step: currentStep, state };

        if (currentStep.type === "MENU") {
            return this.applyMenuInput({
                organizationId: input.organizationId,
                steps,
                currentStep,
                state,
                selectionId,
            });
        }

        return this.applyConfirmationInput({
            steps,
            currentStep,
            state,
            selectionId,
        });
    }

    private async applyMenuInput(input: {
        organizationId: string;
        steps: FlowStep[];
        currentStep: FlowStep;
        state: FlowState;
        selectionId: string;
    }): Promise<Transition> {
        const { steps, currentStep, state, selectionId } = input;

        if (selectionId === BACK_ID) {
            // CATEGORY → no-op (we're already at the top).
            // PRODUCT  → back to category list.
            if (state.phase === "PRODUCT") {
                return {
                    step: currentStep,
                    state: { ...state, phase: "CATEGORY", selectedCategoryId: null },
                };
            }
            return { step: currentStep, state };
        }

        if (selectionId.startsWith(CATEGORY_PREFIX)) {
            const categoryId = selectionId.slice(CATEGORY_PREFIX.length);
            return {
                step: currentStep,
                state: {
                    ...state,
                    phase: "PRODUCT",
                    selectedCategoryId: categoryId,
                },
            };
        }

        if (selectionId.startsWith(ITEM_PREFIX)) {
            const itemId = selectionId.slice(ITEM_PREFIX.length);
            const item = await this.itemRepo.findByIdInOrg(
                input.organizationId,
                itemId,
            );
            const cart = item ? appendToCart(state.cart, item) : state.cart;

            // Move to the next step (typically CONFIRMATION). If there isn't
            // one we stay in PRODUCT phase so the user can keep ordering.
            const next = nextStep(steps, currentStep.id);
            if (!next) {
                return { step: currentStep, state: { ...state, cart } };
            }
            return {
                step: next,
                state: { ...state, cart, phase: phaseForStep(next) },
            };
        }

        return { step: currentStep, state };
    }

    private applyConfirmationInput(input: {
        steps: FlowStep[];
        currentStep: FlowStep;
        state: FlowState;
        selectionId: string;
    }): Transition {
        const { steps, currentStep, state, selectionId } = input;

        if (selectionId === BACK_ID) {
            const prev = previousStep(steps, currentStep.id);
            if (!prev) return { step: currentStep, state };
            return { step: prev, state: { ...state, phase: phaseForStep(prev) } };
        }

        if (selectionId === ADD_MORE_ID) {
            const menu = findFirstStepOfType(steps, "MENU") ?? currentStep;
            return {
                step: menu,
                state: { ...state, phase: "CATEGORY", selectedCategoryId: null },
            };
        }

        if (selectionId === CANCEL_ID) {
            const first = steps[0];
            if (!first) return { step: currentStep, state };
            return { step: first, state: initialState() };
        }

        if (selectionId === CONFIRM_ID) {
            const next = nextStep(steps, currentStep.id);
            if (!next) {
                return { step: currentStep, state: { ...state, phase: "DONE" } };
            }
            return { step: next, state: { ...state, phase: phaseForStep(next) } };
        }

        return { step: currentStep, state };
    }

    private applyLinearInput(input: {
        steps: FlowStep[];
        currentStep: FlowStep;
        state: FlowState;
        selectionId: string | null;
    }): Transition {
        const { steps, currentStep, state, selectionId } = input;

        if (selectionId === BACK_ID) {
            const prev = previousStep(steps, currentStep.id);
            if (!prev) return { step: currentStep, state };
            return { step: prev, state: { ...state, phase: phaseForStep(prev) } };
        }

        const next = nextStep(steps, currentStep.id);
        if (!next) return { step: currentStep, state };
        return { step: next, state: { ...state, phase: phaseForStep(next) } };
    }
}
