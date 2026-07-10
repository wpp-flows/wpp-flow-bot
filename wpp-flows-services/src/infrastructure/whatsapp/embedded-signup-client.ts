import { env } from "@/infrastructure/config/env";
import { CloudApiError } from "./cloud-api-client";

/**
 * Graph API calls specific to Embedded Signup onboarding. These use the app's
 * own credentials (client_id/secret, System User token) rather than a per-bot
 * token — the per-bot token is what we obtain *here* and then persist.
 */

function graphBase(): string {
    return `https://graph.facebook.com/${env.META_GRAPH_VERSION}`;
}

export function isEmbeddedSignupConfigured(): boolean {
    return Boolean(env.META_APP_ID && env.META_APP_SECRET);
}

async function graph<T>(
    path: string,
    init: { method: "GET" | "POST"; token?: string; body?: unknown },
): Promise<T> {
    const url = `${graphBase()}${path}`;
    const res = await fetch(url, {
        method: init.method,
        headers: {
            ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
            "Content-Type": "application/json",
        },
        body: init.body == null ? undefined : JSON.stringify(init.body),
    });
    const text = await res.text();
    const data = text ? safeJson(text) : null;
    if (!res.ok) {
        console.error(`Graph(signup) ${init.method} ${path} → ${res.status}:`, text);
        throw new CloudApiError(
            `Graph(signup) ${init.method} ${path} → ${res.status}`,
            res.status,
            data,
        );
    }
    return data as T;
}

export interface PhoneNumberDetails {
    id: string;
    display_phone_number?: string;
    verified_name?: string;
}

export const embeddedSignupClient = {
    /**
     * Exchanges the Embedded Signup authorization code for the client's
     * long-lived access token (business integration system user token).
     */
    async exchangeCode(code: string): Promise<string> {
        const params = new URLSearchParams({
            client_id: env.META_APP_ID ?? "",
            client_secret: env.META_APP_SECRET ?? "",
            code,
        });
        const data = await graph<{ access_token?: string }>(
            `/oauth/access_token?${params.toString()}`,
            { method: "GET" },
        );
        if (!data.access_token) {
            throw new Error("Embedded Signup code exchange returned no access_token.");
        }
        return data.access_token;
    },

    /** Subscribes our app to the client's WABA so we receive its webhooks. */
    async subscribeApp(wabaId: string, accessToken: string): Promise<void> {
        await graph(`/${encodeURIComponent(wabaId)}/subscribed_apps`, {
            method: "POST",
            token: accessToken,
        });
    },

    /**
     * Registers the phone number for Cloud API with a 2FA PIN. Best-effort:
     * a number already registered returns an error we tolerate.
     */
    async registerPhone(
        phoneNumberId: string,
        accessToken: string,
        pin: string,
    ): Promise<void> {
        await graph(`/${encodeURIComponent(phoneNumberId)}/register`, {
            method: "POST",
            token: accessToken,
            body: { messaging_product: "whatsapp", pin },
        });
    },

    async getPhoneNumber(
        phoneNumberId: string,
        accessToken: string,
    ): Promise<PhoneNumberDetails> {
        return graph<PhoneNumberDetails>(
            `/${encodeURIComponent(phoneNumberId)}?fields=display_phone_number,verified_name`,
            { method: "GET", token: accessToken },
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
