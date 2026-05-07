import type { WebhookContext, WebhookEventStrategy } from "./webhook-strategy";

interface QrCodeUpdatedData {
    qrcode?: { base64?: string; code?: string };
    base64?: string;
    code?: string;
}

export class QrCodeUpdatedStrategy implements WebhookEventStrategy {
    readonly eventName = "qrcode.updated";

    async handle(ctx: WebhookContext, data: unknown): Promise<void> {
        const payload = (data ?? {}) as QrCodeUpdatedData;
        const qr = payload.qrcode ?? payload;
        const code = qr?.base64 ?? qr?.code;
        if (!code) return;

        await ctx.botRepo.update(ctx.bot.id, {
            qrCode: code,
            status: "CONNECTING",
        });
    }
}
