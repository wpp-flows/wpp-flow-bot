import type { Bot } from "@/modules/bot/repositories/bot-repo";
import { PrismaBotRepository } from "@/modules/bot/repositories/prisma/prisma-bot-repo";
import { CloudApiError } from "./cloud-api-client";
import { CloudApiGateway } from "./cloud-api-gateway";
import type { WhatsAppGateway, WhatsAppTransport } from "./gateway";
import { decryptToken } from "./token-crypto";

export type { WhatsAppGateway, WhatsAppTransport, SendResult, SendTemplateInput } from "./gateway";
export type { WhatsAppProvider } from "./gateway";

const cloudApiGateway = new CloudApiGateway();
const botWriteRepo = new PrismaBotRepository();

/**
 * A Graph 401/403 means the client's token was revoked or expired (e.g. the
 * restaurant removed our app in Business Manager). Flag the bot so the
 * dashboard shows "reconectar" instead of silently failing every send, then
 * rethrow so the caller's own error handling still runs.
 */
function flagTokenInvalid(botId: string, err: unknown): never {
    if (
        err instanceof CloudApiError &&
        (err.status === 401 || err.status === 403)
    ) {
        void botWriteRepo
            .update(botId, { tokenStatus: "EXPIRED", status: "ERROR" })
            .catch((updateErr) => {
                console.warn(
                    `Failed to flag expired token for bot ${botId}:`,
                    updateErr,
                );
            });
    }
    throw err;
}

/** Wraps every gateway call with the token-expiry flagging above. */
function withTokenGuard(botId: string, gateway: WhatsAppGateway): WhatsAppGateway {
    return {
        sendText: (t, to, text) =>
            gateway.sendText(t, to, text).catch((err) => flagTokenInvalid(botId, err)),
        sendTemplate: (t, to, template) =>
            gateway
                .sendTemplate(t, to, template)
                .catch((err) => flagTokenInvalid(botId, err)),
        // Best-effort by contract — never throws, so no guard needed.
        indicateTyping: (t, to, inboundId) => gateway.indicateTyping(t, to, inboundId),
    };
}

export function gatewayFor(provider: Bot["provider"]): WhatsAppGateway {
    if (provider !== "CLOUD_API") {
        throw new Error(
            "Provedor Evolution foi descontinuado — reconecte este bot via WhatsApp oficial (Embedded Signup).",
        );
    }
    return cloudApiGateway;
}

/**
 * Builds the send credentials from a Bot row, decrypting the Cloud API token.
 * Kept here (not on the Bot repo) so the crypto dependency stays in the
 * infrastructure layer.
 */
export function botToTransport(bot: Bot): WhatsAppTransport {
    return {
        provider: "CLOUD_API",
        phoneNumberId: bot.phoneNumberId,
        accessToken: bot.accessToken ? decryptToken(bot.accessToken) : null,
    };
}

/** Convenience: resolve gateway + transport for a bot in one call. */
export function senderFor(bot: Bot): {
    gateway: WhatsAppGateway;
    transport: WhatsAppTransport;
} {
    return {
        gateway: withTokenGuard(bot.id, gatewayFor(bot.provider)),
        transport: botToTransport(bot),
    };
}
