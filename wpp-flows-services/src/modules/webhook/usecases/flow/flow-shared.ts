import type { EvolutionSendTextResponse } from "@/infrastructure/evolution/client";

/**
 * Safety cap on auto-chained step deliveries per inbound message. With the
 * MESSAGE-only flow this caps the welcome-burst the bot can produce in one
 * shot — protects against an accidental loop of consecutive MESSAGE steps.
 */
export const MAX_AUTO_CHAIN = 10;

/**
 * How long the "digitando…" indicator stays up before the actual message goes
 * out. Long enough to feel human, short enough not to annoy. The same delay is
 * passed to Evolution so the platform releases the presence cleanly.
 */
export const TYPING_DELAY_MS = 1500;

export interface SendResult {
    evolutionResp: EvolutionSendTextResponse;
    preview: string;
}

/**
 * Best-effort extraction of a user-facing error message from a failed
 * Evolution call. Handles the common "non-existent number" detail shape.
 */
export function describeSendError(err: unknown): string {
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
