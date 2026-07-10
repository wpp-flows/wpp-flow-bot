import { env } from "@/infrastructure/config/env";

/**
 * Thin wrapper over the Meta Graph API for WhatsApp Cloud. Stateless — every
 * call takes the target `phoneNumberId` + a bearer `accessToken` (the client's
 * long-lived token from Embedded Signup, or the System User token in
 * single-tenant/dev). Higher-level provider logic lives in cloud-api-gateway.
 */

export class CloudApiError extends Error {
    constructor(
        message: string,
        public readonly status: number,
        public readonly body: unknown,
    ) {
        super(message);
    }
}

export interface CloudSendResponse {
    messaging_product: "whatsapp";
    contacts?: { input: string; wa_id: string }[];
    messages?: { id: string }[];
}

function graphBase(): string {
    return `https://graph.facebook.com/${env.META_GRAPH_VERSION}`;
}

export function isMetaConfigured(): boolean {
    // The absolute minimum to talk to Graph at all. Per-bot tokens cover the
    // send path; the app-level bits (app id/secret, config id) are only needed
    // for Embedded Signup + webhook signature verification.
    return Boolean(env.META_GRAPH_VERSION);
}

async function graphRequest<T>(
    path: string,
    accessToken: string,
    init: { method: "GET" | "POST"; body?: unknown } = { method: "GET" },
): Promise<T> {
    const url = `${graphBase()}${path}`;
    const res = await fetch(url, {
        method: init.method,
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: init.body == null ? undefined : JSON.stringify(init.body),
    });
    const text = await res.text();
    const data = text ? safeJson(text) : null;
    if (!res.ok) {
        console.error(`Graph ${init.method} ${path} → ${res.status}. Body:`, text);
        throw new CloudApiError(
            `Graph ${init.method} ${path} → ${res.status}`,
            res.status,
            data,
        );
    }
    return data as T;
}

export const cloudApiClient = {
    async sendMessage(
        phoneNumberId: string,
        accessToken: string,
        payload: Record<string, unknown>,
    ): Promise<CloudSendResponse> {
        return graphRequest<CloudSendResponse>(
            `/${encodeURIComponent(phoneNumberId)}/messages`,
            accessToken,
            {
                method: "POST",
                body: { messaging_product: "whatsapp", ...payload },
            },
        );
    },

    async markRead(
        phoneNumberId: string,
        accessToken: string,
        inboundMessageId: string,
        typing: boolean,
    ): Promise<void> {
        await graphRequest(
            `/${encodeURIComponent(phoneNumberId)}/messages`,
            accessToken,
            {
                method: "POST",
                body: {
                    messaging_product: "whatsapp",
                    status: "read",
                    message_id: inboundMessageId,
                    ...(typing ? { typing_indicator: { type: "text" } } : {}),
                },
            },
        );
    },
};

function safeJson(text: string): unknown {
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}
