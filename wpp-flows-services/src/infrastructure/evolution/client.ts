import { env } from "@/infrastructure/config/env";

export interface EvolutionInstance {
    instance: {
        instanceName: string;
        instanceId?: string;
        status?: string;
    };
    hash?: { apikey?: string } | string;
    qrcode?: { code?: string; base64?: string; pairingCode?: string };
    webhook?: unknown;
}

export interface EvolutionConnectResponse {
    pairingCode?: string | null;
    code?: string;
    base64?: string;
    count?: number;
}

export function extractQrCode(
    payload: EvolutionInstance | EvolutionConnectResponse | null | undefined
): string | null {
    if (!payload) return null;
    const top = payload as EvolutionConnectResponse;
    if (top.base64) return top.base64;
    if (top.code) return top.code;
    const nested = (payload as EvolutionInstance).qrcode;
    if (nested?.base64) return nested.base64;
    if (nested?.code) return nested.code;
    return null;
}

export interface EvolutionConnectionState {
    instance: { instanceName: string; state: string };
}

export interface EvolutionSendTextResponse {
    key: { id: string; remoteJid: string; fromMe: boolean };
    status: string;
    message?: { conversation?: string };
    messageTimestamp?: number;
}

export class EvolutionApiError extends Error {
    constructor(
        message: string,
        public status: number,
        public body?: unknown
    ) {
        super(message);
    }
}

class EvolutionApi {
    private readonly baseUrl: string;
    private readonly apiKey: string;

    constructor() {
        this.baseUrl = env.EVOLUTION_API_URL.replace(/\/$/, "");
        this.apiKey = env.EVOLUTION_API_KEY;
    }

    private async request<T>(
        path: string,
        init: RequestInit & { instanceApiKey?: string } = {}
    ): Promise<T> {
        const url = `${this.baseUrl}${path}`;
        const apikey = init.instanceApiKey ?? this.apiKey;
        const res = await fetch(url, {
            ...init,
            headers: {
                "Content-Type": "application/json",
                apikey,
                ...(init.headers ?? {}),
            },
        });

        const text = await res.text();
        const data = text ? safeJson(text) : null;

        if (!res.ok) {
            console.error(
                `Evolution ${res.status} on ${path}. Body:`,
                JSON.stringify(data, null, 2)
            );
            throw new EvolutionApiError(
                `Evolution API ${res.status} on ${path}`,
                res.status,
                data
            );
        }

        return data as T;
    }

    async createInstance(params: {
        instanceName: string;
        webhookUrl?: string;
        token?: string;
    }): Promise<EvolutionInstance> {
        const body = {
            instanceName: params.instanceName,
            integration: "WHATSAPP-BAILEYS",
            qrcode: true,
            webhook: params.webhookUrl
                ? {
                    url: params.webhookUrl,
                    byEvents: false,
                    base64: false,
                    events: [
                        "MESSAGES_UPSERT",
                        "MESSAGES_UPDATE",
                        "CONNECTION_UPDATE",
                        "QRCODE_UPDATED",
                    ],
                }
                : undefined,
            ...(params.token ? { token: params.token } : {}),
        };
        return this.request<EvolutionInstance>("/instance/create", {
            method: "POST",
            body: JSON.stringify(body),
        });
    }

    async connectInstance(instanceName: string): Promise<EvolutionConnectResponse> {
        return this.request<EvolutionConnectResponse>(
            `/instance/connect/${encodeURIComponent(instanceName)}`,
            { method: "GET" }
        );
    }

    async logoutInstance(instanceName: string): Promise<unknown> {
        return this.request<unknown>(
            `/instance/logout/${encodeURIComponent(instanceName)}`,
            { method: "DELETE" }
        );
    }

    async deleteInstance(instanceName: string): Promise<unknown> {
        return this.request<unknown>(
            `/instance/delete/${encodeURIComponent(instanceName)}`,
            { method: "DELETE" }
        );
    }

    async getConnectionState(
        instanceName: string
    ): Promise<EvolutionConnectionState> {
        return this.request<EvolutionConnectionState>(
            `/instance/connectionState/${encodeURIComponent(instanceName)}`,
            { method: "GET" }
        );
    }

    async sendText(params: {
        instanceName: string;
        number: string;
        text: string;
    }): Promise<EvolutionSendTextResponse> {
        console.log(
            `Evolution sendText → instance=${params.instanceName} number=${params.number}`
        );
        return this.request<EvolutionSendTextResponse>(
            `/message/sendText/${encodeURIComponent(params.instanceName)}`,
            {
                method: "POST",
                body: JSON.stringify({
                    number: params.number,
                    text: params.text,
                }),
            }
        );
    }
}

function safeJson(text: string) {
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

export const evolutionApi = new EvolutionApi();
