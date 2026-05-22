import type { Bot, BotRepository } from "@/modules/bot/repositories/bot-repo";
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
import type { OrderRepository } from "@/modules/order/repositories/order-repo";
import type { CreateOrderFromCartUseCase } from "@/modules/order/usecases/order-usecases";
import type { PromotionRepository } from "@/modules/promotion/repositories/promotion-repo";
import { evaluateDiscount } from "@/modules/promotion/usecases/promotion-evaluator";
import { evolutionApi } from "@/infrastructure/evolution/client";
import {
    buildOutOfHoursMessage,
    isBotWithinWorkingHours,
} from "@/modules/bot/working-hours";
import { initialState } from "./flow/flow-cart";
import { resolveTypedSelection } from "./flow/flow-option-map";
import {
    paymentTimeoutScheduler,
    type PaymentTimeoutPayload,
} from "./flow/scheduler/payment-timeout-scheduler";
import {
    CANCEL_ID,
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
    readPaymentCancelMessage,
    readPaymentTimeoutMessage,
    readPaymentTimeoutMinutes,
    sortSteps,
} from "./flow/flow-step-helpers";
import { type RenderContext } from "./render-message";
import { jidToSendTarget } from "./strategies/shared";

/** Min interval between out-of-hours replies for the same conversation. */
const OOH_COOLDOWN_MS = 30 * 60 * 1000;

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
    private static readonly oohLastSentAt = new Map<string, number>();

    constructor(
        private readonly flowRepo: FlowRepository,
        private readonly conversationRepo: ConversationRepository,
        private readonly messageRepo: MessageRepository,
        private readonly customerRepo: CustomerRepository,
        private readonly botRepo: BotRepository,
        private readonly orderRepo: OrderRepository,
        private readonly createOrderFromCart: CreateOrderFromCartUseCase,
        private readonly promotionRepo: PromotionRepository,
        private readonly notificationEmitter: NotificationEmitter,
        private readonly stateMachine: FlowStateMachine,
        private readonly stepSender: FlowStepSender,
    ) {

        paymentTimeoutScheduler.setHandler((payload) =>
            this.handlePaymentTimeoutFromPayload(payload),
        );
    }

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

        if (!isBotWithinWorkingHours(bot)) {
            await this.maybeSendOutOfHoursReply(bot, conversation);
            return;
        }

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

        // Parked on PAYMENT waiting for the MP webhook → either the customer
        // is bailing ("cancelar") or just nudging us; in the second case we
        // re-send the link.
        if (currentStep.type === "PAYMENT" && state.awaitingPaymentForOrderId) {
            const resolved =
                selectionId ?? resolveTypedSelection(text, state.lastOptionMap);
            if (resolved === CANCEL_ID) {
                await this.handlePaymentCancel({
                    bot,
                    conversation,
                    step: currentStep,
                    state,
                });
                return;
            }
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

        // Bundle question capture: when a BUNDLE sub-flow is awaiting a typed
        // answer to one of its per-bundle questions, route the inbound text in
        // the same shape as INPUT step capture above.
        if (
            currentStep.type === "MENU" &&
            state.phase === "BUNDLE" &&
            state.bundleProgress?.awaitingAnswer
        ) {
            await this.captureBundleAnswerAndAdvance({
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

    /**
     * Captures a bundle question answer and either re-renders the MENU step
     * (when more questions remain) or completes the bundle and advances to the
     * next flow step. Mirrors {@link captureInputAndAdvance} but for the bundle
     * sub-flow's question-walk.
     */
    private async captureBundleAnswerAndAdvance(input: {
        bot: Bot;
        conversation: Conversation;
        customer: Customer | null;
        step: FlowStep;
        state: FlowState;
        allSteps: FlowStep[];
        text: string | null | undefined;
    }): Promise<void> {
        const progress = input.state.bundleProgress;
        if (!progress) return;
        const bundle = await this.promotionRepo.findByIdInOrg(
            input.bot.organizationId,
            progress.bundleId,
        );
        if (!bundle?.bundle) return;

        const question = bundle.bundle.questions[progress.questionIdx];
        if (!question) return;

        const value = (input.text ?? "").trim();
        const nextAnswers = { ...progress.answers, [question.fieldKey]: value };
        const nextQuestionIdx = progress.questionIdx + 1;
        const moreQuestions = nextQuestionIdx < bundle.bundle.questions.length;

        if (moreQuestions) {
            // Stay on the same MENU step and re-render — the strategy reads
            // bundleProgress.questionIdx and prompts the next question.
            await this.deliverChain({
                bot: input.bot,
                conversation: input.conversation,
                customer: input.customer,
                step: input.step,
                state: {
                    ...input.state,
                    bundleProgress: {
                        ...progress,
                        answers: nextAnswers,
                        questionIdx: nextQuestionIdx,
                        awaitingAnswer: true,
                    },
                },
                allSteps: input.allSteps,
            });
            return;
        }

        // No more questions — finalize the bundle and advance.
        const transition = this.stateMachine.completeBundle({
            steps: input.allSteps,
            currentStep: input.step,
            state: input.state,
            bundle,
            progress: {
                ...progress,
                answers: nextAnswers,
                questionIdx: nextQuestionIdx,
                awaitingAnswer: false,
            },
        });
        await this.deliverChain({
            bot: input.bot,
            conversation: input.conversation,
            customer: input.customer,
            step: transition.step,
            state: transition.state,
            allSteps: input.allSteps,
        });
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

        if (
            captured.orderId &&
            (fieldKey === "address" || fieldKey === "observation")
        ) {
            try {
                await this.orderRepo.updateDetails(captured.orderId, {
                    [fieldKey]: value || null,
                });
            } catch (err) {
                console.warn(
                    `Failed to patch order ${captured.orderId} with ${fieldKey}:`,
                    err,
                );
            }
        }

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
            if (!next) {
                await this.resetConversationForRestart(input.conversation);
                return;
            }
            step = next;
            state = { ...state, phase: phaseForStep(next), lastOptionMap: undefined };
        }
    }

    private async resetConversationForRestart(
        conversation: Conversation,
    ): Promise<void> {
        await this.conversationRepo.update(conversation.id, {
            currentStepId: null,
            flowState: initialState(),
        });
    }

    /**
     * Customer typed "cancelar" at the PAYMENT step. Marks the order CANCELED,
     * sends the step's configured `cancelMessage`, and resets the conversation
     * so the next inbound starts the flow fresh.
     */
    private async handlePaymentCancel(input: {
        bot: Bot;
        conversation: Conversation;
        step: FlowStep;
        state: FlowState;
    }): Promise<void> {
        const orderId = input.state.awaitingPaymentForOrderId ?? input.state.orderId;
        if (orderId) {
            paymentTimeoutScheduler.clear(orderId);
            await this.cancelOrderQuietly(orderId);
        }
        await this.sendPlainBotMessage(
            input.bot,
            input.conversation,
            readPaymentCancelMessage(input.step),
        );
        await this.resetConversationForRestart(input.conversation);
    }

    /**
     * Schedules the auto-cancel timer for a PAYMENT step. Persisted in Redis
     * so the timer survives process restarts and gets picked up by whichever
     * instance polls first. The MP webhook clears the entry when payment
     * confirms (so a paid order never auto-cancels).
     */
    private schedulePaymentTimeout(input: {
        bot: Bot;
        conversation: Conversation;
        step: FlowStep;
        orderId: string;
    }): void {
        const minutes = readPaymentTimeoutMinutes(input.step);
        const delayMs = minutes * 60_000;
        // fire-and-forget — failures to persist are logged inside the scheduler
        // and shouldn't block the customer's outgoing payment message.
        void paymentTimeoutScheduler
            .schedule(
                {
                    organizationId: input.bot.organizationId,
                    botId: input.bot.id,
                    conversationId: input.conversation.id,
                    stepId: input.step.id,
                    orderId: input.orderId,
                },
                delayMs,
            )
            .catch((err) =>
                console.error("Failed to schedule payment timeout:", err),
            );
    }

    /**
     * Entry point the Redis poller calls when a payment-timeout job is due.
     * Re-fetches bot + conversation + step by id (the payload only carries
     * ids — fresh state is the source of truth), then delegates to the
     * existing in-process handler.
     */
    async handlePaymentTimeoutFromPayload(
        payload: PaymentTimeoutPayload,
    ): Promise<void> {
        const bot = await this.botRepo.findById(payload.botId);
        if (bot?.organizationId !== payload.organizationId) return;
        const conversation = await this.conversationRepo.findByIdInOrg(
            payload.organizationId,
            payload.conversationId,
        );
        if (!conversation) return;
        const flow = await this.resolveFlow(bot);
        if (!flow) return;
        const step = flow.steps.find((s) => s.id === payload.stepId);
        if (!step) return;
        await this.handlePaymentTimeout({
            bot,
            conversation,
            step,
            orderId: payload.orderId,
        });
    }

    /**
     * Fires when the customer never paid within the configured window. If the
     * order is still PENDING we cancel it, send the timeout message, and reset
     * the conversation. If the order moved to PAID/CANCELED in the meantime,
     * we no-op.
     */
    private async handlePaymentTimeout(input: {
        bot: Bot;
        conversation: Conversation;
        step: FlowStep;
        orderId: string;
    }): Promise<void> {
        const order = await this.orderRepo.findByIdInOrg(
            input.bot.organizationId,
            input.orderId,
        );
        if (order?.paymentStatus !== "PENDING" || order.status === "CANCELED") {
            return;
        }
        await this.cancelOrderQuietly(input.orderId);
        // re-read the conversation in case it's drifted while the timer was
        // pending (e.g. customer started a new flow on another step).
        const conversation = await this.conversationRepo.findByIdInOrg(
            input.bot.organizationId,
            input.conversation.id,
        );
        if (!conversation) return;
        await this.sendPlainBotMessage(
            input.bot,
            conversation,
            readPaymentTimeoutMessage(input.step),
        );
        await this.resetConversationForRestart(conversation);
    }

    /**
     * Cancels an order without firing the canonical status-change notification —
     * we send our own configurable message on the PAYMENT path. Also flips
     * paymentStatus to FAILED so the dashboard treats it as unpaid.
     */
    private async cancelOrderQuietly(orderId: string): Promise<void> {
        try {
            await this.orderRepo.updateStatus(orderId, "CANCELED");
            await this.orderRepo.updatePayment(orderId, {
                paymentStatus: "FAILED",
            });
        } catch (err) {
            console.warn(`Failed to cancel order ${orderId}:`, err);
        }
    }

    /**
     * Sends the out-of-hours reply once per `OOH_COOLDOWN_MS` per conversation.
     * Without the cooldown a customer messaging during the night would get the
     * same line on every send. Map lives in memory — resetting on restart is
     * harmless (worst case: one extra reply right after a deploy).
     */
    private async maybeSendOutOfHoursReply(
        bot: Bot,
        conversation: Conversation,
    ): Promise<void> {
        const last = FlowRunner.oohLastSentAt.get(conversation.id) ?? 0;
        const now = Date.now();
        if (now - last < OOH_COOLDOWN_MS) return;
        FlowRunner.oohLastSentAt.set(conversation.id, now);
        await this.sendPlainBotMessage(bot, conversation, buildOutOfHoursMessage(bot));
    }

    /** Sends a one-off bot message + persists it on the conversation thread. */
    private async sendPlainBotMessage(
        bot: Bot,
        conversation: Conversation,
        text: string,
    ): Promise<void> {
        try {
            const sent = await evolutionApi.sendText({
                instanceName: bot.evolutionInstanceName,
                number: jidToSendTarget(conversation.remoteJid),
                text,
            });
            await this.messageRepo.create({
                conversationId: conversation.id,
                evolutionMessageId: sent.key.id,
                author: "BOT",
                content: text,
                status: "SENT",
            });
            await this.conversationRepo.update(conversation.id, {
                lastMessagePreview: text.slice(0, 100),
                lastMessageAt: new Date(),
            });
        } catch (err) {
            console.warn("Failed to send payment cancel/timeout message:", err);
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

            // PAYMENT step delivered with an order parked for payment — kick
            // off the auto-cancel timer. Subsequent re-renders re-schedule
            // (the scheduler replaces an existing timer for the same orderId).
            const parkedOrderId = sent.statePatch?.awaitingPaymentForOrderId;
            if (step.type === "PAYMENT" && parkedOrderId) {
                this.schedulePaymentTimeout({
                    bot,
                    conversation,
                    step,
                    orderId: parkedOrderId,
                });
            }
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
