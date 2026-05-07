import { evolutionApi } from "@/infrastructure/evolution/client";
import type { Bot, BotRepository } from "@/modules/bot/repositories/bot-repo";
import type {
    Conversation,
    ConversationRepository,
    MessageRepository,
} from "@/modules/chat/repositories/chat-repo";
import type {
    FlowRepository,
    FlowStep,
    FlowWithSteps,
} from "@/modules/flow/repositories/flow-repo";
import { jidToSendTarget } from "./strategies/shared";

/**
 * Sequential, pre-persisted, non-AI flow runner.
 *
 * Behaviour:
 *  - First inbound on a conversation: send step[0] of the active flow.
 *  - Subsequent inbound: advance to the next step and send it.
 *  - When steps are exhausted, the flow stops (currentStepId stays on the last step).
 *  - If the user "stops the bot" on a conversation (botActive=false), the runner skips it.
 */
export class FlowRunner {
    constructor(
        private readonly botRepo: BotRepository,
        private readonly flowRepo: FlowRepository,
        private readonly conversationRepo: ConversationRepository,
        private readonly messageRepo: MessageRepository
    ) {}

    async handleInbound(input: {
        bot: Bot;
        conversation: Conversation;
    }): Promise<void> {
        const { bot, conversation } = input;
        if (!conversation.botActive) return;

        const flow = await this.resolveFlow(bot);
        if (!flow || flow.steps.length === 0) return;

        const nextStep = this.pickNextStep(flow, conversation.currentStepId);
        if (!nextStep) return;

        await this.deliverStep({ bot, conversation, step: nextStep });
    }

    private async resolveFlow(bot: Bot): Promise<FlowWithSteps | null> {
        if (bot.flowId) {
            const explicit = await this.flowRepo.findByIdInOrg(
                bot.organizationId,
                bot.flowId
            );
            if (explicit) return explicit;
        }
        return this.flowRepo.findActive(bot.organizationId);
    }

    private pickNextStep(
        flow: FlowWithSteps,
        currentStepId: string | null
    ): FlowStep | null {
        const sorted = [...flow.steps].sort((a, b) => a.order - b.order);
        if (sorted.length === 0) return null;
        if (!currentStepId) return sorted[0] ?? null;

        const idx = sorted.findIndex((s) => s.id === currentStepId);
        if (idx < 0) return sorted[0] ?? null;
        return sorted[idx + 1] ?? null;
    }

    private async deliverStep(input: {
        bot: Bot;
        conversation: Conversation;
        step: FlowStep;
    }): Promise<void> {
        const { bot, conversation, step } = input;
        const text = renderStep(step);
        const phoneNumber = jidToSendTarget(conversation.remoteJid);

        try {
            const evolutionResp = await evolutionApi.sendText({
                instanceName: bot.evolutionInstanceName,
                number: phoneNumber,
                text,
            });

            const message = await this.messageRepo.create({
                conversationId: conversation.id,
                evolutionMessageId: evolutionResp.key.id,
                author: "BOT",
                content: text,
                status: "SENT",
            });

            await this.conversationRepo.update(conversation.id, {
                currentStepId: step.id,
                lastMessagePreview: text.slice(0, 100),
                lastMessageAt: message.createdAt,
            });
        } catch (err) {
            console.error("Failed to deliver flow step:", err);
            await this.messageRepo.create({
                conversationId: conversation.id,
                author: "SYSTEM",
                content: `⚠️ Bot couldn't reply: ${describeSendError(err)}`,
                status: "FAILED",
            });
        }
    }
}

function describeSendError(err: unknown): string {
    const e = err as {
        body?: {
            response?: { message?: Array<{ exists?: boolean; jid?: string }> };
        };
        message?: string;
    };
    const detail = e?.body?.response?.message?.[0];
    if (detail?.exists === false) {
        return `the WhatsApp number ${detail.jid ?? ""} does not exist`;
    }
    return e?.message ?? "unknown Evolution API error";
}

function renderStep(step: FlowStep): string {
    switch (step.type) {
        case "MENU": {
            const meta = step.metadata as
                | { options?: Array<{ label: string }> }
                | null;
            const options = meta?.options ?? [];
            const optionLines = options
                .map((opt, i) => `${i + 1}. ${opt.label}`)
                .join("\n");
            return optionLines ? `${step.content}\n\n${optionLines}` : step.content;
        }
        case "CONFIRMATION":
            return `${step.content}\n\nReply *YES* to confirm or *NO* to cancel.`;
        case "PAYMENT": {
            const meta = step.metadata as
                | { paymentLink?: string; total?: number | string }
                | null;
            if (meta?.paymentLink) {
                return `${step.content}\n\nPay here: ${meta.paymentLink}`;
            }
            return step.content;
        }
        case "MESSAGE":
        default:
            return step.content;
    }
}
