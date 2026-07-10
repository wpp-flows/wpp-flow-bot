import { orgEventBus } from "@/infrastructure/events/event-bus";
import type { Bot, BotRepository } from "@/modules/bot/repositories/bot-repo";
import type {
    Conversation,
    ConversationRepository,
    MessageRepository,
    MessageStatus,
} from "@/modules/chat/repositories/chat-repo";

const CLOUD_STATUS_MAP: Record<string, MessageStatus> = {
    sent: "SENT",
    delivered: "DELIVERED",
    read: "READ",
    failed: "FAILED",
};
import type { FlowRunner } from "../flow-runner";
import type { PostPaymentHandler } from "../post-payment/post-payment-handler";

/**
 * Handles one Meta Cloud API webhook body. Meta sends a single stream for ALL
 * of our restaurants, so every change is routed to the right bot/org by its
 * `metadata.phone_number_id` — that's the whole multi-tenant identification.
 *
 * Two change shapes matter:
 *  - `value.messages[]`  → inbound customer messages (drives conversations + flow)
 *  - `value.statuses[]`  → delivery receipts for our outbound (sent/delivered/
 *                          read/failed), mapped onto Message.status by wamid.
 */

interface CloudMetadata {
    display_phone_number?: string;
    phone_number_id?: string;
}

interface CloudContact {
    profile?: { name?: string };
    wa_id?: string;
}

interface CloudMessage {
    from?: string;
    id?: string;
    timestamp?: string;
    type?: string;
    text?: { body?: string };
    button?: { text?: string };
    interactive?: {
        button_reply?: { title?: string };
        list_reply?: { title?: string };
    };
}

interface CloudChangeValue {
    metadata?: CloudMetadata;
    contacts?: CloudContact[];
    messages?: CloudMessage[];
    statuses?: { id?: string; status?: string }[];
}

export interface CloudWebhookBody {
    object?: string;
    entry?: {
        id?: string;
        changes?: { field?: string; value?: CloudChangeValue }[];
    }[];
}

export class HandleCloudEventUseCase {
    constructor(
        private readonly botRepo: BotRepository,
        private readonly conversationRepo: ConversationRepository,
        private readonly messageRepo: MessageRepository,
        private readonly flowRunner: FlowRunner,
        private readonly postPaymentHandler: PostPaymentHandler,
    ) { }

    async execute(body: CloudWebhookBody): Promise<void> {
        if (body.object !== "whatsapp_business_account") return;
        for (const entry of body.entry ?? []) {
            for (const change of entry.changes ?? []) {
                if (change.field !== "messages" || !change.value) continue;
                await this.handleChange(change.value);
            }
        }
    }

    private async handleChange(value: CloudChangeValue): Promise<void> {
        const phoneNumberId = value.metadata?.phone_number_id;
        if (!phoneNumberId) return;

        const bot = await this.botRepo.findByPhoneNumberId(phoneNumberId);
        if (!bot) {
            console.warn(`Cloud webhook for unknown phone_number_id: ${phoneNumberId}`);
            return;
        }

        // Statuses and messages can arrive in the same change — handle both,
        // never early-return on one or the other.
        for (const status of value.statuses ?? []) {
            await this.applyStatus(status);
        }

        const contactName = value.contacts?.[0]?.profile?.name;
        for (const msg of value.messages ?? []) {
            await this.handleMessage(bot, msg, contactName);
        }
    }

    /** Maps a Cloud delivery receipt onto our stored outbound message. */
    private async applyStatus(status: {
        id?: string;
        status?: string;
    }): Promise<void> {
        if (!status.id || !status.status) return;
        const mapped = CLOUD_STATUS_MAP[status.status.toLowerCase()];
        if (!mapped) return;
        try {
            await this.messageRepo.updateStatus(status.id, mapped);
        } catch (err) {
            console.warn(`Cloud status update failed for ${status.id}:`, err);
        }
    }

    private async handleMessage(
        bot: Bot,
        msg: CloudMessage,
        contactName: string | undefined,
    ): Promise<void> {
        const waId = msg.from;
        const text = extractCloudText(msg);
        if (!waId || !text) return;

        // Idempotency: Meta retries webhooks. Skip a wamid we already stored.
        if (msg.id) {
            const existing = await this.messageRepo.findByEvolutionId(msg.id);
            if (existing) return;
        }

        const remoteJid = `${waId}@s.whatsapp.net`;
        const conversation = await this.upsertConversation(bot, {
            remoteJid,
            contactPhone: waId,
            contactName: contactName ?? waId,
            preview: text,
        });

        // Backfill a real display name over a bare-number placeholder.
        if (
            contactName &&
            contactName !== conversation.contactName &&
            /^\d+$/.test(conversation.contactName ?? "")
        ) {
            await this.conversationRepo.update(conversation.id, { contactName });
            conversation.contactName = contactName;
        }

        const recorded = await this.messageRepo.create({
            conversationId: conversation.id,
            evolutionMessageId: msg.id,
            author: "USER",
            content: text,
            status: "DELIVERED",
        });

        const now = recorded.createdAt;
        const updated = await this.conversationRepo.update(conversation.id, {
            lastMessagePreview: text.slice(0, 100),
            lastMessageAt: now,
            // Opens Meta's 24h free-form window for proactive replies.
            lastInboundAt: now,
            unreadCount: conversation.unreadCount + 1,
        });

        orgEventBus.emit(bot.organizationId, {
            kind: "chat.message",
            conversationId: conversation.id,
            direction: "IN",
        });

        // Post-payment deep-link ack first, then the flow runner. The inbound
        // wamid rides along so Cloud can show "typing…" (it's implemented as a
        // mark-read on the customer's last message).
        const handled = await this.postPaymentHandler.tryHandle({
            bot,
            conversation: updated,
            text,
        });
        if (handled) return;

        await this.flowRunner.handleInbound({
            bot,
            conversation: updated,
            inboundMessageId: msg.id ?? null,
        });
    }

    private async upsertConversation(
        bot: Bot,
        input: {
            remoteJid: string;
            contactPhone: string;
            contactName: string;
            preview: string;
        },
    ): Promise<Conversation> {
        const existing = await this.conversationRepo.findByBotAndRemoteJid(
            bot.id,
            input.remoteJid,
        );
        if (existing) return existing;
        return this.conversationRepo.create({
            organizationId: bot.organizationId,
            botId: bot.id,
            remoteJid: input.remoteJid,
            contactName: input.contactName,
            contactPhone: input.contactPhone,
            lastMessagePreview: input.preview.slice(0, 100),
            lastMessageAt: new Date(),
        });
    }
}

function extractCloudText(msg: CloudMessage): string | null {
    if (msg.type === "text") return msg.text?.body?.trim() || null;
    if (msg.type === "button") return msg.button?.text?.trim() || null;
    if (msg.type === "interactive") {
        return (
            msg.interactive?.button_reply?.title?.trim() ||
            msg.interactive?.list_reply?.title?.trim() ||
            null
        );
    }
    return null;
}
