import type { EvolutionSendTextResponse } from "@/infrastructure/evolution/client";
import type { FlowState } from "@/modules/chat/repositories/chat-repo";

/** Button / row selection ids the runner uses to route customer interactions. */
export const BACK_ID = "back";
export const CONFIRM_ID = "confirm";
export const ADD_MORE_ID = "add_more";
export const CANCEL_ID = "cancel";
export const CATEGORY_PREFIX = "cat:";
export const ITEM_PREFIX = "item:";
export const BUNDLE_PREFIX = "bundle:";

export const BUNDLE_CATEGORY_ID = "promotions";

/**
 * Safety cap on auto-chained step deliveries per inbound message. Prevents an
 * accidental loop of non-interactive steps from spamming the customer.
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
    optionMap: Record<string, string>;
    /**
     * Optional state patch that the runner merges into the persisted `flowState`.
     * Used by the payment sender to flip `awaitingPaymentForOrderId` after the
     * link is sent.
     */
    statePatch?: Partial<FlowState>;
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
