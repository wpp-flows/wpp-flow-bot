import type { BotStatus } from "@/modules/bot/repositories/bot-repo";
import type { WebhookContext, WebhookEventStrategy } from "./webhook-strategy";

const STATUS_MAP: Record<string, BotStatus> = {
    open: "ONLINE",
    connecting: "CONNECTING",
    close: "OFFLINE",
    closed: "OFFLINE",
    refused: "ERROR",
};

interface ConnectionUpdateData {
    state?: string;
    instance?: { state?: string };
}

export class ConnectionUpdateStrategy implements WebhookEventStrategy {
    readonly eventName = "connection.update";

    async handle(ctx: WebhookContext, data: unknown): Promise<void> {
        const payload = (data ?? {}) as ConnectionUpdateData;
        const state = payload.state ?? payload.instance?.state;
        if (!state) return;

        const status = STATUS_MAP[state.toLowerCase()] ?? "ERROR";
        const patch: Parameters<typeof ctx.botRepo.update>[1] = { status };
        if (status === "ONLINE") {
            patch.qrCode = null;
            patch.lastConnectedAt = new Date();
        }

        await ctx.botRepo.update(ctx.bot.id, patch);
    }
}
