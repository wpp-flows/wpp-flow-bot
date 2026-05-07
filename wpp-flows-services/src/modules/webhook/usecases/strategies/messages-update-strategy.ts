import type { MessageStatus } from "@/modules/chat/repositories/chat-repo";
import { parseUpdates } from "./shared";
import type { WebhookContext, WebhookEventStrategy } from "./webhook-strategy";

const MESSAGE_STATUS_MAP: Record<string, MessageStatus> = {
    PENDING: "SENT",
    SERVER_ACK: "SENT",
    DELIVERY_ACK: "DELIVERED",
    READ: "READ",
    PLAYED: "READ",
    ERROR: "FAILED",
};

export class MessagesUpdateStrategy implements WebhookEventStrategy {
    readonly eventName = "messages.update";

    async handle(ctx: WebhookContext, data: unknown): Promise<void> {
        const updates = parseUpdates(data);
        for (const update of updates) {
            if (!update?.keyId || !update.status) continue;
            const mapped = MESSAGE_STATUS_MAP[update.status.toUpperCase()];
            if (!mapped) continue;
            try {
                await ctx.messageRepo.updateStatus(update.keyId, mapped);
            } catch {
                // unknown message id - ignore
            }
        }
    }
}
