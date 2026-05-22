import type {
    BundleProgress,
    BundlePick,
    FlowState,
} from "@/modules/chat/repositories/chat-repo";
import type { FlowStep } from "@/modules/flow/repositories/flow-repo";
import type { ItemRepository } from "@/modules/menu/repositories/menu-repo";
import type {
    Promotion,
    PromotionRepository,
} from "@/modules/promotion/repositories/promotion-repo";
import { appendBundleToCart, appendToCart, initialState } from "./flow-cart";
import {
    findFirstStepOfType,
    nextStep,
    phaseForStep,
    previousStep,
} from "./flow-step-helpers";
import {
    ADD_MORE_ID,
    BACK_ID,
    BUNDLE_PREFIX,
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
 * customer's selection id, returns the next step + state. I/O is limited to
 * fetching a menu item when an `item:<id>` selection lands on a MENU step and
 * fetching a bundle when a `bundle:<id>` or in-bundle pick happens.
 */
export class FlowStateMachine {
    constructor(
        private readonly itemRepo: ItemRepository,
        private readonly promotionRepo: PromotionRepository,
    ) { }

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

        if (state.phase === "BUNDLE" && state.bundleProgress) {
            return this.applyBundleInput({
                organizationId: input.organizationId,
                steps,
                currentStep,
                state,
                selectionId,
                progress: state.bundleProgress,
            });
        }

        if (selectionId === BACK_ID) {
            // PRODUCT → CATEGORY (works for the bundle list view too, which
            // lives in PRODUCT phase with the synthetic category id).
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

        if (selectionId.startsWith(BUNDLE_PREFIX)) {
            return this.startBundle({
                organizationId: input.organizationId,
                currentStep,
                state,
                bundleId: selectionId.slice(BUNDLE_PREFIX.length),
            });
        }

        if (selectionId.startsWith(ITEM_PREFIX)) {
            const itemId = selectionId.slice(ITEM_PREFIX.length);
            const item = await this.itemRepo.findByIdInOrg(
                input.organizationId,
                itemId,
            );
            const cart = item ? appendToCart(state.cart, item) : state.cart;

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


    private async startBundle(input: {
        organizationId: string;
        currentStep: FlowStep;
        state: FlowState;
        bundleId: string;
    }): Promise<Transition> {
        const { currentStep, state, bundleId } = input;
        const bundle = await this.promotionRepo.findByIdInOrg(
            input.organizationId,
            bundleId,
        );
        if (!bundle?.bundle || bundle.bundle.components.length === 0) {
            return {
                step: currentStep,
                state: { ...state, phase: "CATEGORY", selectedCategoryId: null },
            };
        }
        const progress: BundleProgress = {
            bundleId: bundle.id,
            componentIdx: 0,
            picks: [],
            questionIdx: 0,
            answers: {},
            awaitingAnswer: false,
        };
        return {
            step: currentStep,
            state: { ...state, phase: "BUNDLE", bundleProgress: progress },
        };
    }

    /**
     * Handles inputs while the customer is inside a bundle sub-flow:
     *   - BACK: cancel the bundle and return to the category list.
     *   - item:<id>: add to picks for the current component. Advance through
     *     components → questions → completion as slots fill up.
     */
    private async applyBundleInput(input: {
        organizationId: string;
        steps: FlowStep[];
        currentStep: FlowStep;
        state: FlowState;
        selectionId: string;
        progress: BundleProgress;
    }): Promise<Transition> {
        const { steps, currentStep, state, selectionId, progress } = input;

        if (selectionId === BACK_ID) {
            return {
                step: currentStep,
                state: {
                    ...state,
                    phase: "CATEGORY",
                    selectedCategoryId: null,
                    bundleProgress: null,
                },
            };
        }

        if (!selectionId.startsWith(ITEM_PREFIX)) {
            return { step: currentStep, state };
        }

        const bundle = await this.promotionRepo.findByIdInOrg(
            input.organizationId,
            progress.bundleId,
        );
        if (!bundle?.bundle) {
            // bundle vanished mid-flow — cancel cleanly.
            return {
                step: currentStep,
                state: {
                    ...state,
                    phase: "CATEGORY",
                    selectedCategoryId: null,
                    bundleProgress: null,
                },
            };
        }

        const component = bundle.bundle.components[progress.componentIdx];
        if (!component) return { step: currentStep, state };

        const itemId = selectionId.slice(ITEM_PREFIX.length);
        if (!component.itemIds.includes(itemId)) {
            // picked something outside the pool — keep them on the same picker.
            return { step: currentStep, state };
        }
        const item = await this.itemRepo.findByIdInOrg(
            input.organizationId,
            itemId,
        );
        if (!item) return { step: currentStep, state };

        const pick: BundlePick = {
            componentId: component.id,
            itemId: item.id,
            itemName: item.name,
        };
        const picks = [...progress.picks, pick];

        // how many picks have we made for THIS component now?
        const componentPicks = picks.filter(
            (p) => p.componentId === component.id,
        ).length;
        const componentSatisfied = componentPicks >= component.count;

        const nextComponentIdx = componentSatisfied
            ? progress.componentIdx + 1
            : progress.componentIdx;
        const allComponentsDone = nextComponentIdx >= bundle.bundle.components.length;

        // still more picks needed → stay on MENU with updated progress.
        if (!allComponentsDone) {
            return {
                step: currentStep,
                state: {
                    ...state,
                    bundleProgress: {
                        ...progress,
                        picks,
                        componentIdx: nextComponentIdx,
                    },
                },
            };
        }

        // all components satisfied → either move to questions or complete.
        const hasQuestions = bundle.bundle.questions.length > 0;
        if (hasQuestions) {
            return {
                step: currentStep,
                state: {
                    ...state,
                    bundleProgress: {
                        ...progress,
                        picks,
                        componentIdx: nextComponentIdx,
                        awaitingAnswer: true,
                    },
                },
            };
        }
        return this.completeBundle({
            steps,
            currentStep,
            state,
            bundle,
            progress: { ...progress, picks, componentIdx: nextComponentIdx },
        });
    }

    completeBundle(input: {
        steps: FlowStep[];
        currentStep: FlowStep;
        state: FlowState;
        bundle: Promotion;
        progress: BundleProgress;
    }): Transition {
        const { steps, currentStep, state, bundle, progress } = input;
        const cart = appendBundleToCart(state.cart, bundle, progress);
        const next = nextStep(steps, currentStep.id);
        const baseState: FlowState = {
            ...state,
            cart,
            bundleProgress: null,
            selectedCategoryId: null,
        };
        if (!next) {
            return {
                step: currentStep,
                state: { ...baseState, phase: "CATEGORY" },
            };
        }
        return {
            step: next,
            state: { ...baseState, phase: phaseForStep(next) },
        };
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

