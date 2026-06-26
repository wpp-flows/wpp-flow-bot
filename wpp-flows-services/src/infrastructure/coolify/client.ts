import { env } from "@/infrastructure/config/env";

export interface CoolifyClient {
    setEnvVar(appUuid: string, key: string, value: string): Promise<void>;
    triggerDeploy(appUuid: string): Promise<void>;
}

export class CoolifyApiError extends Error {
    constructor(
        message: string,
        public readonly status: number,
        public readonly body: unknown,
    ) {
        super(message);
    }
}

class CoolifyApi implements CoolifyClient {
    constructor(
        private readonly baseUrl: string,
        private readonly token: string,
    ) { }

    async setEnvVar(appUuid: string, key: string, value: string): Promise<void> {
        const url = `${this.baseUrl}/api/v1/applications/${appUuid}/envs`;
        await this.request("PATCH", url, { key, value });
    }

    async triggerDeploy(appUuid: string): Promise<void> {
        const url = `${this.baseUrl}/api/v1/deploy?uuid=${encodeURIComponent(appUuid)}&force=true`;
        await this.request("GET", url, null);
    }

    private async request(
        method: "GET" | "PATCH",
        url: string,
        body: unknown,
    ): Promise<void> {
        const res = await fetch(url, {
            method,
            headers: {
                Authorization: `Bearer ${this.token}`,
                "Content-Type": "application/json",
            },
            body: body == null ? undefined : JSON.stringify(body),
        });
        if (!res.ok) {
            const text = await res.text().catch(() => "");
            console.error(
                `Coolify ${method} ${url} → ${res.status}. Body:`,
                text,
            );
            throw new CoolifyApiError(
                `Coolify ${method} ${url} → ${res.status}`,
                res.status,
                text,
            );
        }
    }
}

export function isCoolifyConfigured(): boolean {
    return Boolean(
        env.WPP_COOLIFY_URL &&
        env.WPP_COOLIFY_TOKEN &&
        env.WPP_COOLIFY_APP_UUID,
    );
}

export function getCoolifyClient(): CoolifyClient | null {
    if (!isCoolifyConfigured()) return null;
    const baseUrl = env.WPP_COOLIFY_URL!.replace(/\/$/, "");
    return new CoolifyApi(baseUrl, env.WPP_COOLIFY_TOKEN!);
}
