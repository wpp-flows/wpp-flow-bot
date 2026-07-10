/**
 * Provider-agnostic WhatsApp transport. Everything that sends or receives a
 * WhatsApp message goes through this interface, so the underlying provider
 * (Evolution/Baileys today, Meta Cloud API going forward) is swappable per-bot.
 *
 * The gateway is intentionally low-level: `sendText` vs `sendTemplate` are
 * distinct because Meta's 24-hour customer-service window means a proactive
 * message outside the window MUST be a pre-approved template. The decision of
 * which to use lives with the caller (it knows the conversation's last-inbound
 * timestamp); the gateway just executes.
 */

export type WhatsAppProvider = "EVOLUTION" | "CLOUD_API";

/**
 * The minimal per-bot credentials a send needs. Built from a Bot row via
 * {@link botToTransport}; the `accessToken` is already decrypted.
 */
export interface WhatsAppTransport {
    provider: WhatsAppProvider;
    /** EVOLUTION */
    evolutionInstanceName?: string | null;
    /** CLOUD_API */
    phoneNumberId?: string | null;
    accessToken?: string | null;
}

export interface SendResult {
    /** Normalized provider message id (Evolution key.id / Cloud wamid). */
    messageId: string;
}

export interface SendTemplateInput {
    /** Approved template name, e.g. "order_received". */
    name: string;
    /** BCP-47 code Meta expects, e.g. "pt_BR". */
    languageCode: string;
    /** Ordered body variables filling {{1}}, {{2}}, … */
    bodyParams?: string[];
}

export interface WhatsAppGateway {
    sendText(
        transport: WhatsAppTransport,
        toPhone: string,
        text: string,
    ): Promise<SendResult>;

    /**
     * Sends a pre-approved template. Only meaningful for CLOUD_API; the
     * Evolution adapter has no template concept and throws, so callers should
     * branch on provider (or rely on the 24h-window helper never asking
     * Evolution for a template).
     */
    sendTemplate(
        transport: WhatsAppTransport,
        toPhone: string,
        template: SendTemplateInput,
    ): Promise<SendResult>;

    /** Best-effort "typing…" presence. Failures never abort a send. */
    indicateTyping(
        transport: WhatsAppTransport,
        toPhone: string,
        inboundMessageId?: string | null,
    ): Promise<void>;
}
