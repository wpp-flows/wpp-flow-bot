import { cloudApiClient } from "./cloud-api-client";
import type {
    SendResult,
    SendTemplateInput,
    WhatsAppGateway,
    WhatsAppTransport,
} from "./gateway";

/** Cloud API expects a bare digits phone (E.164 without the leading +). */
function toWaNumber(phone: string): string {
    return phone.replace(/\D/g, "");
}

function requireCreds(transport: WhatsAppTransport): {
    phoneNumberId: string;
    accessToken: string;
} {
    if (!transport.phoneNumberId || !transport.accessToken) {
        throw new Error(
            "CLOUD_API bot is missing phoneNumberId/accessToken — complete Embedded Signup first.",
        );
    }
    return {
        phoneNumberId: transport.phoneNumberId,
        accessToken: transport.accessToken,
    };
}

function firstMessageId(res: { messages?: { id: string }[] }): string {
    const id = res.messages?.[0]?.id;
    if (!id) throw new Error("Cloud API send returned no message id.");
    return id;
}

export class CloudApiGateway implements WhatsAppGateway {
    async sendText(
        transport: WhatsAppTransport,
        toPhone: string,
        text: string,
    ): Promise<SendResult> {
        const { phoneNumberId, accessToken } = requireCreds(transport);
        const res = await cloudApiClient.sendMessage(phoneNumberId, accessToken, {
            to: toWaNumber(toPhone),
            type: "text",
            text: { preview_url: true, body: text },
        });
        return { messageId: firstMessageId(res) };
    }

    async sendTemplate(
        transport: WhatsAppTransport,
        toPhone: string,
        template: SendTemplateInput,
    ): Promise<SendResult> {
        const { phoneNumberId, accessToken } = requireCreds(transport);
        const components =
            template.bodyParams && template.bodyParams.length > 0
                ? [
                    {
                        type: "body",
                        parameters: template.bodyParams.map((t) => ({
                            type: "text",
                            text: t,
                        })),
                    },
                ]
                : undefined;
        const res = await cloudApiClient.sendMessage(phoneNumberId, accessToken, {
            to: toWaNumber(toPhone),
            type: "template",
            template: {
                name: template.name,
                language: { code: template.languageCode },
                ...(components ? { components } : {}),
            },
        });
        return { messageId: firstMessageId(res) };
    }

    async indicateTyping(
        transport: WhatsAppTransport,
        _toPhone: string,
        inboundMessageId?: string | null,
    ): Promise<void> {
        // Cloud API's typing indicator is tied to marking the customer's last
        // inbound message as read. Without that message id there's nothing to
        // attach it to, so we skip (best-effort).
        if (!inboundMessageId) return;
        const { phoneNumberId, accessToken } = requireCreds(transport);
        try {
            await cloudApiClient.markRead(
                phoneNumberId,
                accessToken,
                inboundMessageId,
                true,
            );
        } catch (err) {
            console.warn("CloudApiGateway.indicateTyping failed (best-effort):", err);
        }
    }
}
