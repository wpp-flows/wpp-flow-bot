/**
 * Minimal Mercado Pago Checkout Pro client. Each organization brings its own
 * access token, so this class is instantiated per-call rather than once at
 * boot. Only the endpoints we actually use are wrapped.
 *
 * Docs: https://www.mercadopago.com.br/developers/en/reference
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const MP_BASE = "https://api.mercadopago.com";

export interface MpPreferenceItem {
    title: string;
    quantity: number;
    unit_price: number;
    currency_id?: string;
}

export interface MpPreferenceInput {
    items: MpPreferenceItem[];
    /** Free-form id we attach so webhooks can be matched back to the order. */
    external_reference: string;
    notification_url?: string;
    back_urls?: {
        success?: string;
        failure?: string;
        pending?: string;
    };
    payer?: {
        name?: string;
        phone?: { area_code?: string; number?: string };
    };
    statement_descriptor?: string;
}

export interface MpPreferenceResponse {
    id: string;
    init_point: string;
    sandbox_init_point: string;
    external_reference: string;
}

export interface MpPaymentResponse {
    id: number;
    status:
        | "pending"
        | "approved"
        | "authorized"
        | "in_process"
        | "in_mediation"
        | "rejected"
        | "cancelled"
        | "refunded"
        | "charged_back";
    status_detail?: string;
    transaction_amount: number;
    currency_id?: string;
    external_reference?: string;
    payment_method_id?: string;
    payment_type_id?: string;
    date_approved?: string | null;
}

export type MpPixKeyType = "cpf" | "cnpj" | "email" | "phone" | "random";

export interface MpWithdrawalInput {
    amount: number;
    pixKey: string;
    pixKeyType: MpPixKeyType;
    description?: string;
    externalReference: string;
}

export interface MpWithdrawalResponse {
    id: string;
    status: "approved" | "pending" | "rejected" | string;
    status_detail?: string;
}

/**
 * Verifies the Mercado Pago `x-signature` header on a webhook call.
 *
 * MP signs `id={data.id};request-id={x-request-id};ts={ts}` with HMAC-SHA256
 * using the org's webhook secret. The header arrives as
 * `ts=<timestamp>,v1=<hex-hmac>`. Returns true when the computed hmac matches
 * `v1` in constant time.
 */
export function verifyMercadoPagoSignature(input: {
    secret: string;
    signatureHeader: string | undefined;
    requestId: string | undefined;
    dataId: string | undefined;
}): boolean {
    if (!input.secret || !input.signatureHeader || !input.dataId) return false;
    const parts = input.signatureHeader.split(",").map((p) => p.trim());
    const map = new Map<string, string>();
    for (const part of parts) {
        const eq = part.indexOf("=");
        if (eq > 0) map.set(part.slice(0, eq), part.slice(eq + 1));
    }
    const ts = map.get("ts");
    const v1 = map.get("v1");
    if (!ts || !v1) return false;
    const payload = `id=${input.dataId};request-id=${input.requestId ?? ""};ts=${ts};`;
    const expected = createHmac("sha256", input.secret).update(payload).digest("hex");
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(v1, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
}

export class MercadoPagoError extends Error {
    constructor(
        message: string,
        public status: number,
        public body?: unknown,
    ) {
        super(message);
    }
}

export class MercadoPagoClient {
    constructor(private readonly accessToken: string) {
        if (!accessToken) {
            throw new Error("MercadoPagoClient requires an access token.");
        }
    }

    private async request<T>(
        path: string,
        init: RequestInit = {},
    ): Promise<T> {
        const url = `${MP_BASE}${path}`;
        const res = await fetch(url, {
            ...init,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.accessToken}`,
                ...(init.headers ?? {}),
            },
        });
        const text = await res.text();
        const data = text ? safeJson(text) : null;
        if (!res.ok) {
            console.error(
                `MercadoPago ${res.status} on ${path}. Body:`,
                JSON.stringify(data, null, 2),
            );
            throw new MercadoPagoError(
                `MercadoPago ${res.status} on ${path}`,
                res.status,
                data,
            );
        }
        return data as T;
    }

    createPreference(
        input: MpPreferenceInput,
    ): Promise<MpPreferenceResponse> {
        return this.request<MpPreferenceResponse>("/checkout/preferences", {
            method: "POST",
            body: JSON.stringify(input),
        });
    }

    getPayment(paymentId: string | number): Promise<MpPaymentResponse> {
        return this.request<MpPaymentResponse>(
            `/v1/payments/${encodeURIComponent(String(paymentId))}`,
            { method: "GET" },
        );
    }

    /**
     * Sends a PIX withdrawal from the seller's Mercado Pago account to the
     * configured PIX key. Returns the MP withdrawal record.
     *
     * Note: MP only accepts this call for accounts with the "Money Out / PIX
     * cashout" feature enabled (you may need to request it on your MP
     * dashboard). Errors surface here as {@link MercadoPagoError}.
     */
    createPixWithdrawal(
        input: MpWithdrawalInput,
    ): Promise<MpWithdrawalResponse> {
        return this.request<MpWithdrawalResponse>("/v1/withdrawals", {
            method: "POST",
            body: JSON.stringify({
                amount: input.amount,
                description: input.description ?? "Saque",
                external_reference: input.externalReference,
                payment_method: {
                    type: "pix",
                    key_type: input.pixKeyType,
                    key: input.pixKey,
                },
            }),
        });
    }
}

function safeJson(text: string): unknown {
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}
