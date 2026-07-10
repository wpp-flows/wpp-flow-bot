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
import { senderFor } from "@/infrastructure/whatsapp";
import { orgEventBus } from "@/infrastructure/events/event-bus";
import type { OrganizationRepository } from "@/modules/organization/repositories/organization-repo";
import {
    buildOutOfHoursMessage,
    isWithinWorkingHours,
} from "@/modules/organization/working-hours";
import { MAX_AUTO_CHAIN, describeSendError } from "./flow/flow-shared";
import type { FlowStateMachine } from "./flow/flow-state-machine";
import type { FlowStepSender } from "./flow/flow-step-sender";
import { findStep, nextStep, sortSteps } from "./flow/flow-step-helpers";
import { type RenderContext } from "./render-message";
import { jidToSendTarget } from "@/shared/whatsapp-jid";

/** Min interval between out-of-hours replies for the same conversation. */
const OOH_COOLDOWN_MS = 30 * 60 * 1000;

/**
 * MESSAGE-only flow runner. With the digital-menu pivot, the WhatsApp bot's
 * job shrinks to: greet, hand off to the menu URL, and stay out of the way.
 * Each inbound from the customer advances one step until the flow endss.
 *
 * Two guard rails sit at the entry point:
 *  1. **Working hours** — outside the org's schedule, the bot replies with a
 *     templated out-of-hours message at most once per `OOH_COOLDOWN_MS`.
 *  2. **Bot cooldown** — once the bot replies, it stays silent for the
 *     org-configured `botCooldownMinutes`. Lets operators step in via the
 *     dashboard without the bot spamming over them.
 */
export class FlowRunner {
    private static readonly oohLastSentAt = new Map<string, number>();

    constructor(
        private readonly flowRepo: FlowRepository,
        private readonly conversationRepo: ConversationRepository,
        private readonly messageRepo: MessageRepository,
        private readonly customerRepo: CustomerRepository,
        private readonly orgRepo: OrganizationRepository,
        private readonly stateMachine: FlowStateMachine,
        private readonly stepSender: FlowStepSender,
    ) { }

    async handleInbound(input: {
        bot: Bot;
        conversation: Conversation;
        /**
         * wamid of the customer message that triggered this run. Cloud shows
         * "typing…" by marking that message read, so without it the indicator
         * is silently skipped.
         */
        inboundMessageId?: string | null;
    }): Promise<void> {
        const { bot, conversation } = input;
        if (!bot.isActive) return;
        if (!conversation.botActive) return;

        const org = await this.orgRepo.findById(bot.organizationId);

        // Working-hours gate: out-of-hours customers get the templated reply
        // (capped at one per OOH_COOLDOWN_MS so the bot doesn't spam them
        // through the night).
        if (org && !isWithinWorkingHours(org)) {
            await this.maybeSendOutOfHoursReply(bot, conversation, org);
            return;
        }

        // Cooldown gate: if the bot replied recently, stay quiet so a human
        // can take over. The inbound message is still recorded by the upsert
        // strategy — we just don't drive the flow.
        if (this.isWithinBotCooldown(conversation, org?.botCooldownMinutes ?? 0)) {
            return;
        }

        const flow = await this.resolveFlow(bot);
        if (!flow || flow.steps.length === 0) return;

        const customer = await this.resolveCustomer(conversation);
        const sortedSteps = sortSteps(flow.steps);
        const currentStep = findStep(sortedSteps, conversation.currentStepId);

        // Cold start: no current step → deliver step[0]. Otherwise advance.
        const transition = currentStep
            ? this.stateMachine.applyInput({
                steps: sortedSteps,
                currentStep,
                state: conversation.flowState ?? {},
            })
            : { step: sortedSteps[0]!, state: conversation.flowState ?? {} };

        await this.deliverChain({
            bot,
            conversation,
            customer,
            step: transition.step,
            state: transition.state,
            allSteps: sortedSteps,
            organization: org,
            inboundMessageId: input.inboundMessageId ?? null,
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
     * Delivers a step and auto-chains the next one (every MESSAGE step is
     * non-interactive, so the runner walks straight through). Stops at the
     * end of the flow or at {@link MAX_AUTO_CHAIN} as a safety cap.
     */
    private async deliverChain(input: {
        bot: Bot;
        conversation: Conversation;
        customer: Customer | null;
        step: FlowStep;
        state: FlowState;
        allSteps: FlowStep[];
        organization: { slug: string; name: string } | null;
        inboundMessageId: string | null;
    }): Promise<void> {
        let step = input.step;
        const state = input.state;
        // Mark-read (which is what renders "typing…" on Cloud) only makes
        // sense once per inbound — chained follow-up steps skip it.
        let inboundMessageId = input.inboundMessageId;

        for (let i = 0; i < MAX_AUTO_CHAIN; i++) {
            const ok = await this.deliverStep({
                bot: input.bot,
                conversation: input.conversation,
                customer: input.customer,
                step,
                state,
                organization: input.organization,
                inboundMessageId,
            });
            if (!ok) return;
            inboundMessageId = null;

            const next = nextStep(input.allSteps, step.id);
            if (!next) {
                await this.resetConversationForRestart(input.conversation);
                return;
            }
            step = next;
        }
    }

    private async resetConversationForRestart(
        conversation: Conversation,
    ): Promise<void> {
        await this.conversationRepo.update(conversation.id, {
            currentStepId: null,
            flowState: null,
        });
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
        org: {
            workingDaysOfWeek: number[];
            workingStartTime: string | null;
            workingEndTime: string | null;
            outOfHoursMessage: string | null;
        },
    ): Promise<void> {
        const last = FlowRunner.oohLastSentAt.get(conversation.id) ?? 0;
        const now = Date.now();
        if (now - last < OOH_COOLDOWN_MS) return;
        FlowRunner.oohLastSentAt.set(conversation.id, now);
        await this.sendPlainBotMessage(bot, conversation, buildOutOfHoursMessage(org));
    }

    private isWithinBotCooldown(
        conversation: Conversation,
        cooldownMinutes: number,
    ): boolean {
        if (cooldownMinutes <= 0) return false;
        if (!conversation.lastBotReplyAt) return false;
        const elapsed = Date.now() - conversation.lastBotReplyAt.getTime();
        return elapsed < cooldownMinutes * 60 * 1000;
    }

    /** Sends a one-off bot message + persists it on the conversation thread. */
    private async sendPlainBotMessage(
        bot: Bot,
        conversation: Conversation,
        text: string,
    ): Promise<void> {
        try {
            const { gateway, transport } = senderFor(bot);
            const sent = await gateway.sendText(
                transport,
                jidToSendTarget(conversation.remoteJid),
                text,
            );
            await this.messageRepo.create({
                conversationId: conversation.id,
                evolutionMessageId: sent.messageId,
                author: "BOT",
                content: text,
                status: "SENT",
            });
            const now = new Date();
            await this.conversationRepo.update(conversation.id, {
                lastMessagePreview: text.slice(0, 100),
                lastMessageAt: now,
                lastBotReplyAt: now,
            });
            orgEventBus.emit(bot.organizationId, {
                kind: "chat.message",
                conversationId: conversation.id,
                direction: "OUT",
            });
        } catch (err) {
            console.warn("Failed to send out-of-hours message:", err);
        }
    }

    /** Delivers exactly one step. Returns false when the send failed. */
    private async deliverStep(input: {
        bot: Bot;
        conversation: Conversation;
        customer: Customer | null;
        step: FlowStep;
        state: FlowState;
        organization: { slug: string; name: string } | null;
        inboundMessageId: string | null;
    }): Promise<boolean> {
        const { bot, conversation, customer, step, state, organization } = input;
        const phoneNumber = jidToSendTarget(conversation.remoteJid);
        const ctx: RenderContext = {
            conversation,
            bot,
            state,
            customer,
            organization,
        };

        try {
            await this.stepSender.indicateTyping(
                bot,
                phoneNumber,
                input.inboundMessageId,
            );
            const sent = await this.stepSender.sendStep({
                bot,
                phoneNumber,
                step,
                ctx,
            });

            const message = await this.messageRepo.create({
                conversationId: conversation.id,
                evolutionMessageId: sent.messageId,
                author: "BOT",
                content: sent.preview,
                status: "SENT",
            });

            await this.conversationRepo.update(conversation.id, {
                currentStepId: step.id,
                flowState: state,
                lastMessagePreview: sent.preview.slice(0, 100),
                lastMessageAt: message.createdAt,
                lastBotReplyAt: message.createdAt,
            });

            orgEventBus.emit(bot.organizationId, {
                kind: "chat.message",
                conversationId: conversation.id,
                direction: "OUT",
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
}
