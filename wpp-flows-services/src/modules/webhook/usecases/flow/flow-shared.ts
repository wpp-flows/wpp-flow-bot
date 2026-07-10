/**
 * Safety cap on auto-chained step deliveries per inbound message. With the
 * MESSAGE-only flow this caps the welcome-burst the bot can produce in one
 * shot — protects against an accidental loop of consecutive MESSAGE steps.
 */
export const MAX_AUTO_CHAIN = 10;

/**
 * How long the "digitando…" indicator stays up before the actual message goes
 * out. Short on purpose — long enough to read as human, without adding
 * noticeable latency to the reply.
 */
export const TYPING_DELAY_MS = 600;

export interface SendResult {
    /** Normalized provider message id (Cloud API wamid). */
    messageId: string;
    preview: string;
}

/**
 * Best-effort extraction of a user-facing error message from a failed send.
 * Understands the Graph API error envelope (`body.error.message`) and falls
 * back to the generic Error message.
 */
export function describeSendError(err: unknown): string {
    const e = err as {
        body?: { error?: { message?: string; code?: number } };
        message?: string;
    };
    const graph = e?.body?.error;
    if (graph?.message) {
        return graph.code ? `${graph.message} (code ${graph.code})` : graph.message;
    }
    return e?.message ?? "unknown WhatsApp API error";
}
