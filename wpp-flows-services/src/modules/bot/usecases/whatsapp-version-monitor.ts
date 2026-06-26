import { randomBytes } from "node:crypto";
import { env } from "@/infrastructure/config/env";
import {
    CoolifyApiError,
    getCoolifyClient,
    isCoolifyConfigured,
} from "@/infrastructure/coolify/client";
import { getRedisClient } from "@/infrastructure/redis/client";
import type { CreateAdminNotificationUseCase } from "@/modules/admin/usecases/admin-notification-usecases";

const VERSIONS_PAGE_URL = "https://wppconnect.io/pt-BR/whatsapp-versions/";
const VERSION_RE = /###\s+(2\.3000\.\d+)-alpha/;

const TICK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const STARTUP_DELAY_MS = 30_000;
const RUN_LOCK_TTL_MS = 60_000;
const CHECK_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

const RUN_LOCK_KEY = "wpp-flows:wa-version:lock";
const COOLDOWN_KEY = "wpp-flows:wa-version:checked-at";
const LAST_SEEN_KEY = "wpp-flows:wa-version:last-seen";

const EVOLUTION_ENV_KEY = "CONFIG_SESSION_PHONE_VERSION";

const NODE_TOKEN = randomBytes(16).toString("hex");

const RELEASE_LOCK_LUA = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
else
  return 0
end
`;

type CoolifyOutcome = "ok" | "skipped" | "failed";

export class WhatsAppVersionMonitor {
    private handle: NodeJS.Timeout | null = null;
    private startupTimer: NodeJS.Timeout | null = null;

    constructor(
        private readonly createAdminNotification: CreateAdminNotificationUseCase,
    ) { }

    start(): void {
        if (this.handle) return;

        this.startupTimer = setTimeout(() => {
            void this.tick();
        }, STARTUP_DELAY_MS);
        this.startupTimer.unref();

        this.handle = setInterval(() => {
            void this.tick();
        }, TICK_INTERVAL_MS);
        this.handle.unref();

        console.log(
            `📱 WhatsAppVersionMonitor started (tick=24h, cooldown=30d, node=${NODE_TOKEN.slice(0, 8)}).`,
        );
    }

    stop(): void {
        if (this.handle) {
            clearInterval(this.handle);
            this.handle = null;
        }
        if (this.startupTimer) {
            clearTimeout(this.startupTimer);
            this.startupTimer = null;
        }
    }

    private async tick(): Promise<void> {
        const redis = getRedisClient();

        const cooldownActive = await redis.get(COOLDOWN_KEY);
        if (cooldownActive) return;

        const acquired = await redis.set(
            RUN_LOCK_KEY,
            NODE_TOKEN,
            "PX",
            RUN_LOCK_TTL_MS,
            "NX",
        );
        if (acquired !== "OK") return;

        try {
            const latest = await this.fetchLatestVersion();
            if (!latest) return;

            const lastSeen = await redis.get(LAST_SEEN_KEY);

            await redis.set(COOLDOWN_KEY, "1", "PX", CHECK_COOLDOWN_MS);

            if (lastSeen === latest) return;

            if (!lastSeen) {
                await redis.set(LAST_SEEN_KEY, latest);
                console.log(
                    `WhatsAppVersionMonitor: baseline seeded at ${latest}.`,
                );
                return;
            }

            const coolifyOutcome = await this.applyToCoolify(latest);

            await redis.set(LAST_SEEN_KEY, latest);
            await this.persistNotification(lastSeen, latest, coolifyOutcome);
        } catch (err) {
            console.warn("WhatsAppVersionMonitor tick failed:", err);
        } finally {
            try {
                await redis.eval(RELEASE_LOCK_LUA, 1, RUN_LOCK_KEY, NODE_TOKEN);
            } catch (err) {
                console.warn(
                    "WhatsAppVersionMonitor: failed to release lock:",
                    err,
                );
            }
        }
    }

    private async fetchLatestVersion(): Promise<string | null> {
        try {
            const res = await fetch(VERSIONS_PAGE_URL, {
                headers: { "User-Agent": "Mesa-WhatsAppVersionMonitor/1.0" },
            });
            if (!res.ok) {
                console.warn(
                    `WhatsAppVersionMonitor: fetch ${VERSIONS_PAGE_URL} → HTTP ${res.status}`,
                );
                return null;
            }
            const html = await res.text();
            const match = VERSION_RE.exec(html);
            if (!match) {
                console.warn(
                    "WhatsAppVersionMonitor: version pattern not found — page layout may have changed.",
                );
                return null;
            }
            return match[1] ?? null;
        } catch (err) {
            console.warn("WhatsAppVersionMonitor: fetch failed:", err);
            return null;
        }
    }

    private async applyToCoolify(version: string): Promise<CoolifyOutcome> {
        if (!isCoolifyConfigured()) {
            console.warn(
                "WhatsAppVersionMonitor: Coolify env vars not set; skipping deploy.",
            );
            return "skipped";
        }
        const client = getCoolifyClient();
        if (!client) return "skipped";

        const uuid = env.WPP_COOLIFY_APP_UUID!;
        try {
            await client.setEnvVar(uuid, EVOLUTION_ENV_KEY, version);
            await client.triggerDeploy(uuid);
            console.log(
                `WhatsAppVersionMonitor: Coolify deploy triggered for ${EVOLUTION_ENV_KEY}=${version}.`,
            );
            return "ok";
        } catch (err) {
            const status = err instanceof CoolifyApiError ? err.status : "?";
            console.warn(
                `WhatsAppVersionMonitor: Coolify deploy failed (status=${status}):`,
                err,
            );
            return "failed";
        }
    }

    private async persistNotification(
        from: string,
        to: string,
        coolifyDeploy: CoolifyOutcome,
    ): Promise<void> {
        const body = describeOutcome(from, to, coolifyDeploy);
        try {
            await this.createAdminNotification.execute({
                type: "WA_VERSION_UPDATED",
                title: "WhatsApp Web atualizou",
                body,
                metadata: { from, to, coolifyDeploy },
            });
        } catch (err) {
            console.warn(
                "WhatsAppVersionMonitor: failed to persist admin notification:",
                err,
            );
        }
    }
}

function describeOutcome(
    from: string,
    to: string,
    coolifyDeploy: CoolifyOutcome,
): string {
    const heading = `Versão pinada: ${from} → versão atual: ${to}.`;
    switch (coolifyDeploy) {
        case "ok":
            return `${heading} Reimplantação do Evolution acionada no Coolify automaticamente.`;
        case "skipped":
            return `${heading} Coolify não está configurado — atualize CONFIG_SESSION_PHONE_VERSION no .env do Evolution e reinicie o container manualmente.`;
        case "failed":
            return `${heading} Tentativa de reimplantação no Coolify falhou (verifique os logs do servidor). Atualize manualmente para continuar gerando QR Codes.`;
    }
}
