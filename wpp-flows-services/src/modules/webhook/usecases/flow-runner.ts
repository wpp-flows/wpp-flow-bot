import type { Bot } from "@/modules/bot/repositories/bot-repo";
import type {
    Conversation,
    ConversationRepository,
    FlowState,
    MessageRepository,
} from "@/modules/chat/repositories/chat-repo";
import type {
    Customer,
    CustomerRepository,
} from "@/modules/customer/repositories/customer-repo";
import type {
    FlowRepository,
    FlowStep,
    FlowWithSteps,
} from "@/modules/flow/repositories/flow-repo";
import type { NotificationEmitter } from "@/modules/notification/usecases/notification-emitter";
import type { CreateOrderFromCartUseCase } from "@/modules/order/usecases/order-usecases";
import type { PromotionRepository } from "@/modules/promotion/repositories/promotion-repo";
import { evaluateDiscount } from "@/modules/promotion/usecases/promotion-evaluator";
import { initialState } from "./flow/flow-cart";
import { resolveTypedSelection } from "./flow/flow-option-map";
import {
    CONFIRM_ID,
    MAX_AUTO_CHAIN,
    describeSendError,
} from "./flow/flow-shared";
import type { FlowStateMachine } from "./flow/flow-state-machine";
import type { FlowStepSender } from "./flow/flow-step-sender";
import {
    findStep,
    isInteractiveStep,
    nextStep,
    phaseForStep,
    readInputFieldKey,
    sortSteps,
} from "./flow/flow-step-helpers";
import { type RenderContext } from "./render-message";
import { jidToSendTarget } from "./strategies/shared";

/**
 * Interactive, menu-aware flow runner.
 *
 * Orchestrates every inbound message and outbound step:
 *  1. Resolves the active flow + customer.
 *  2. Captures INPUT replies and parked-payment state before routing.
 *  3. Delegates routing to {@link FlowStateMachine} and rendering to {@link FlowStepSender}.
 *  4. Persists the resulting state + message and auto-chains non-interactive steps.
 *
 * Selection-id conventions (see flow/flow-shared.ts): `cat:<id>`, `item:<id>`,
 * `back`, `confirm`, `add_more`, `cancel`.
 */
export class FlowRunner {
    constructor(
        private readonly flowRepo: FlowRepository,
        private readonly conversationRepo: ConversationRepository,
        private readonly messageRepo: MessageRepository,
        private readonly customerRepo: CustomerRepository,
        private readonly createOrderFromCart: CreateOrderFromCartUseCase,
        private readonly promotionRepo: PromotionRepository,
        private readonly notificationEmitter: NotificationEmitter,
        private readonly stateMachine: FlowStateMachine,
        private readonly stepSender: FlowStepSender,
    ) {}

    /**
     * Main entry — called by the messages-upsert strategy for every inbound
     * customer message. Handles three distinct inbound shapes:
     *  - Cold start (no current step): delivers step[0].
     *  - INPUT capture: stores typed value into `flowState.inputs` and advances.
     *  - Parked PAYMENT: re-sends the link and keeps waiting on the MP webhook.
     *  - Default: routes through {@link FlowStateMachine.applyInput}.
     */
    async handleInbound(input: {
        bot: Bot;
        conversation: Conversation;
        selectionId?: string | null;
        text?: string | null;
    }): Promise<void> {
        const { bot, conversation, selectionId, text } = input;
        if (!conversation.botActive) return;

        const flow = await this.resolveFlow(bot);
        if (!flow || flow.steps.length === 0) return;

        const customer = await this.resolveCustomer(conversation);
        const sortedSteps = sortSteps(flow.steps);
        const currentStep = findStep(sortedSteps, conversation.currentStepId);

        // Cold start: no current step → send the first one.
        if (!currentStep) {
            const first = sortedSteps[0];
            if (!first) return;
            await this.deliverChain({
                bot,
                conversation,
                customer,
                step: first,
                state: initialState(),
                allSteps: sortedSteps,
            });
            return;
        }

        const state = conversation.flowState ?? initialState();

        // Parked on PAYMENT waiting for the MP webhook → re-send the link.
        if (currentStep.type === "PAYMENT" && state.awaitingPaymentForOrderId) {
            await this.deliverChain({
                bot,
                conversation,
                customer,
                step: currentStep,
                state,
                allSteps: sortedSteps,
            });
            return;
        }

        // INPUT capture: the inbound text is the customer's typed answer.
        if (
            currentStep.type === "INPUT" &&
            state.awaitingInputForStepId === currentStep.id
        ) {
            await this.captureInputAndAdvance({
                bot,
                conversation,
                customer,
                step: currentStep,
                state,
                allSteps: sortedSteps,
                text,
            });
            return;
        }

        // Normal routing path: turn (selection|typed-text) into a transition,
        // then chain delivery.
        const resolvedSelection =
            selectionId ?? resolveTypedSelection(text, state.lastOptionMap);
        const transition = await this.stateMachine.applyInput({
            organizationId: bot.organizationId,
            steps: sortedSteps,
            currentStep,
            state,
            selectionId: resolvedSelection,
        });

        const nextState = await this.maybeCreateOrderOnConfirm({
            bot,
            conversation,
            customer,
            currentStep,
            state,
            selection: resolvedSelection,
            transition,
        });

        await this.deliverChain({
            bot,
            conversation,
            customer,
            step: transition.step,
            state: nextState,
            allSteps: sortedSteps,
        });
    }

    /**
     * Resumes the flow after an external event clears a wait state (e.g. MP
     * webhook approves a payment). Looks up the conversation, advances past
     * the PAYMENT step it was parked on, and delivers the next step(s).
     */
    async resumeAfterPayment(input: {
        bot: Bot;
        conversation: Conversation;
    }): Promise<void> {
        const { bot, conversation } = input;
        if (!conversation.botActive) return;
        const flow = await this.resolveFlow(bot);
        if (!flow || flow.steps.length === 0) return;

        const sortedSteps = sortSteps(flow.steps);
        const currentStep = findStep(sortedSteps, conversation.currentStepId);
        if (currentStep?.type !== "PAYMENT") return;

        const customer = await this.resolveCustomer(conversation);
        const state = conversation.flowState ?? initialState();
        const next = nextStep(sortedSteps, currentStep.id);
        const clearedState: FlowState = {
            ...state,
            awaitingPaymentForOrderId: null,
        };
        if (!next) {
            await this.persistTerminalState(conversation, currentStep, clearedState);
            return;
        }
        await this.deliverChain({
            bot,
            conversation,
            customer,
            step: next,
            state: { ...clearedState, phase: phaseForStep(next) },
            allSteps: sortedSteps,
        });
    }

    private async resolveFlow(bot: Bot): Promise<FlowWithSteps | null> {
        if (bot.flowId) {
            const explicit = await this.flowRepo.findByIdInOrg(
                bot.organizationId,
                bot.flowId,
            );
            if (explicit) return explicit;
        }
        return this.flowRepo.findActive(bot.organizationId);
    }

    /**
     * Returns the customer linked to this conversation, creating one if the
     * conversation doesn't yet have a link. Failures here are non-fatal — we
     * still want to drive the flow even if the customer table is misbehaving.
     */
    private async resolveCustomer(
        conversation: Conversation,
    ): Promise<Customer | null> {
        try {
            if (conversation.customerId) {
                const existing = await this.customerRepo.findByIdInOrg(
                    conversation.organizationId,
                    conversation.customerId,
                );
                if (existing) return existing;
            }
            if (!conversation.contactPhone) return null;
            const customer = await this.customerRepo.upsert({
                organizationId: conversation.organizationId,
                name: conversation.contactName,
                phone: conversation.contactPhone,
            });
            if (conversation.customerId !== customer.id) {
                await this.conversationRepo.update(conversation.id, {
                    customerId: customer.id,
                });
            }
            return customer;
        } catch (err) {
            console.warn("resolveCustomer failed; continuing without customer:", err);
            return null;
        }
    }

    /** Captures an INPUT step's typed answer and advances to the next step. */
    private async captureInputAndAdvance(input: {
        bot: Bot;
        conversation: Conversation;
        customer: Customer | null;
        step: FlowStep;
        state: FlowState;
        allSteps: FlowStep[];
        text: string | null | undefined;
    }): Promise<void> {
        const fieldKey = readInputFieldKey(input.step);
        const value = (input.text ?? "").trim();
        const captured: FlowState = {
            ...input.state,
            inputs: { ...input.state.inputs, [fieldKey]: value },
            awaitingInputForStepId: null,
        };
        const next = nextStep(input.allSteps, input.step.id);
        if (!next) {
            await this.persistTerminalState(input.conversation, input.step, captured);
            return;
        }
        await this.deliverChain({
            bot: input.bot,
            conversation: input.conversation,
            customer: input.customer,
            step: next,
            state: { ...captured, phase: phaseForStep(next) },
            allSteps: input.allSteps,
        });
    }

    /**
     * Detects the CONFIRMATION → CONFIRM transition: order is finalized.
     * Evaluates active promotions for the discount, persists the order, and
     * emits a NEW_ORDER notification. Returns the state with `orderId` set so
     * downstream PAYMENT steps can charge it.
     */
    private async maybeCreateOrderOnConfirm(input: {
        bot: Bot;
        conversation: Conversation;
        customer: Customer | null;
        currentStep: FlowStep;
        state: FlowState;
        selection: string | null;
        transition: { step: FlowStep; state: FlowState };
    }): Promise<FlowState> {
        const { bot, conversation, customer, currentStep, state, selection, transition } = input;
        const advancedToNextStep = transition.step.id !== currentStep.id;
        const isConfirm =
            currentStep.type === "CONFIRMATION" &&
            selection === CONFIRM_ID &&
            advancedToNextStep &&
            state.cart.length > 0 &&
            customer != null;
        if (!isConfirm) return transition.state;

        try {
            const promotions = await this.promotionRepo.listActive(bot.organizationId);
            const subtotal = state.cart.reduce(
                (sum, it) => sum + Number.parseFloat(it.price || "0") * it.qty,
                0,
            );
            const { amount: discount, appliedPromotionIds } = evaluateDiscount({
                promotions,
                subtotal,
                customerOrderCount: customer.orderCount,
                cart: state.cart.map((c) => ({
                    itemId: c.itemId,
                    price: c.price,
                    qty: c.qty,
                })),
            });
            const order = await this.createOrderFromCart.execute({
                organizationId: bot.organizationId,
                customerId: customer.id,
                conversationId: conversation.id,
                items: state.cart,
                observation: state.inputs?.observation ?? null,
                address: state.inputs?.address ?? null,
                discount: discount > 0 ? discount : null,
                appliedPromotionIds: appliedPromotionIds.length
                    ? appliedPromotionIds
                    : null,
            });
            // Best-effort notification — never blocks the flow.
            void this.notificationEmitter.emit({
                organizationId: bot.organizationId,
                type: "NEW_ORDER",
                title: `Novo pedido #${String(order.sequence).padStart(4, "0")}`,
                body: `${customer.name} — total R$ ${order.total}`,
                link: `/orders?id=${order.id}`,
                requirePreference: "newOrders",
            });
            return { ...transition.state, orderId: order.id };
        } catch (err) {
            console.error("Failed to create order from cart:", err);
            return transition.state;
        }
    }

    /**
     * Delivers a step then, if the step is non-interactive (MESSAGE, etc.),
     * automatically delivers the next step too. Stops when it hits an
     * interactive step (MENU, CONFIRMATION, INPUT, PAYMENT) or runs out of
     * steps. {@link MAX_AUTO_CHAIN} prevents runaway loops on misconfigured flows.
     */
    private async deliverChain(input: {
        bot: Bot;
        conversation: Conversation;
        customer: Customer | null;
        step: FlowStep;
        state: FlowState;
        allSteps: FlowStep[];
    }): Promise<void> {
        let step = input.step;
        let state = input.state;

        for (let i = 0; i < MAX_AUTO_CHAIN; i++) {
            // INPUT must signal that the *next* inbound is the customer's typed answer.
            if (step.type === "INPUT") {
                state = { ...state, awaitingInputForStepId: step.id };
            }

            const ok = await this.deliverStep({
                bot: input.bot,
                conversation: input.conversation,
                customer: input.customer,
                step,
                state,
            });
            if (!ok) return;

            if (isInteractiveStep(step.type)) return;

            const next = nextStep(input.allSteps, step.id);
            if (!next) return;
            step = next;
            state = { ...state, phase: phaseForStep(next), lastOptionMap: undefined };
        }
    }

    /** Delivers exactly one step. Returns false when the send failed. */
    private async deliverStep(input: {
        bot: Bot;
        conversation: Conversation;
        customer: Customer | null;
        step: FlowStep;
        state: FlowState;
    }): Promise<boolean> {
        const { bot, conversation, customer, step, state } = input;
        const phoneNumber = jidToSendTarget(conversation.remoteJid);
        const ctx: RenderContext = { conversation, bot, state, customer };

        try {
            await this.stepSender.indicateTyping(
                bot.evolutionInstanceName,
                phoneNumber,
            );
            const sent = await this.stepSender.sendStep({
                bot,
                phoneNumber,
                step,
                state,
                canGoBack: false,
                ctx,
            });

            const message = await this.messageRepo.create({
                conversationId: conversation.id,
                evolutionMessageId: sent.evolutionResp.key.id,
                author: "BOT",
                content: sent.preview,
                status: "SENT",
            });

            await this.conversationRepo.update(conversation.id, {
                currentStepId: step.id,
                flowState: {
                    ...state,
                    ...(sent.statePatch ?? {}),
                    lastOptionMap: sent.optionMap,
                },
                lastMessagePreview: sent.preview.slice(0, 100),
                lastMessageAt: message.createdAt,
            });
            return true;
        } catch (err) {
            console.error("Failed to deliver flow step:", err);
            await this.messageRepo.create({
                conversationId: conversation.id,
                author: "SYSTEM",
                content: `⚠️ Bot couldn't reply: ${describeSendError(err)}`,
                status: "FAILED",
            });
            return false;
        }
    }

    /**
     * Persists state changes that don't deliver a new outbound message — used
     * when the flow has nothing left to send (terminal step or captured-input
     * dead end).
     */
    private async persistTerminalState(
        conversation: Conversation,
        step: FlowStep,
        state: FlowState,
    ): Promise<void> {
        await this.conversationRepo.update(conversation.id, {
            currentStepId: step.id,
            flowState: state,
        });
    }
}
