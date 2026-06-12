import { randomBytes } from "node:crypto";
import { evolutionApi } from "@/infrastructure/evolution/client";
import { getRedisClient } from "@/infrastructure/redis/client";
import type { NotificationEmitter } from "@/modules/notification/usecases/notification-emitter";
import type { Bot, BotRepository, BotStatus } from "../repositories/bot-repo";

const TICK_INTERVAL_MS = 60_000;
const NOTIFY_COOLDOWN_MS = 30 * 60_000;

const LOCK_TTL_MS = 30_000;
const LOCK_KEY_PREFIX = "wpp-flows:bot-monitor:lock:";

const NODE_TOKEN = randomBytes(16).toString("hex");

const RELEASE_LOCK_LUA = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
else
  return 0
end
`;

/**
 * schedule:
 *   tick 1 (attempts==0): call `/instance/connect` to nudge a silent reconnect
 *   tick 2 (attempts==1): call `/instance/restart` — heavier hammer
 *   tick 3 (attempts==2): emit one BOT_OFFLINE notification, set status=ERROR
 *   tick 4+ (attempts>=3): back off for NOTIFY_COOLDOWN_MS before retrying
 */
const ATTEMPT_CONNECT = 0;
const ATTEMPT_RESTART = 1;
const ATTEMPT_NOTIFY = 2;

const STATE_MAP: Record<string, BotStatus> = {
    open: "ONLINE",
    connecting: "CONNECTING",
    close: "OFFLINE",
    closed: "OFFLINE",
    refused: "ERROR",
};

export class BotMonitor {
    private handle: NodeJS.Timeout | null = null;
    private ticking = false;

    constructor(
        private readonly botRepo: BotRepository,
        private readonly notifier: NotificationEmitter,
    ) { }

    start(): void {
        if (this.handle) return;
        this.handle = setInterval(() => {
            void this.tick();
        }, TICK_INTERVAL_MS);
        this.handle.unref();
        console.log(
            `🤖 BotMonitor started (tick=${TICK_INTERVAL_MS / 1000}s, node=${NODE_TOKEN.slice(0, 8)}).`,
        );
    }

    stop(): void {
        if (this.handle) {
            clearInterval(this.handle);
            this.handle = null;
        }
    }

    private async tick(): Promise<void> {
        if (this.ticking) return;

        this.ticking = true;
        try {
            const bots = await this.botRepo.listAll();
            for (const bot of bots) {
                if (bot.desiredState !== "CONNECTED") continue;

                if (!bot.lastConnectedAt) continue;
                await this.withBotLock(bot.id, () => this.checkOne(bot)).catch(
                    (err) => {
                        console.warn(
                            `BotMonitor: checkOne failed for ${bot.evolutionInstanceName}:`,
                            err,
                        );
                    },
                );
            }
        } catch (err) {
            console.error("BotMonitor tick failed:", err);
        } finally {
            this.ticking = false;
        }
    }

    private async withBotLock(
        botId: string,
        work: (fresh: Bot) => Promise<void>,
    ): Promise<void> {
        const redis = getRedisClient();
        const key = `${LOCK_KEY_PREFIX}${botId}`;
        const acquired = await redis.set(key, NODE_TOKEN, "PX", LOCK_TTL_MS, "NX");
        if (acquired !== "OK") return;

        try {
            const fresh = await this.botRepo.findById(botId);

            if (!fresh) return;
            if (fresh.desiredState !== "CONNECTED") return;
            if (!fresh.lastConnectedAt) return;
            await work(fresh);
        } finally {
            try {
                await redis.eval(RELEASE_LOCK_LUA, 1, key, NODE_TOKEN);
            } catch (err) {
                console.warn(
                    `BotMonitor: failed to release lock for ${botId}:`,
                    err,
                );
            }
        }
    }

    private async checkOne(bot: Bot): Promise<void> {
        const liveState = await this.fetchState(bot);

        if (liveState === null) return;

        if (liveState === "open") {
            if (
                bot.status !== "ONLINE" ||
                bot.recoveryAttempts > 0 ||
                bot.lastDisconnectNotifiedAt
            ) {
                await this.botRepo.update(bot.id, {
                    status: "ONLINE",
                    recoveryAttempts: 0,
                    lastRecoveryAt: null,
                    lastDisconnectNotifiedAt: null,
                    lastConnectedAt: new Date(),
                });
            }
            return;
        }

        const attempt = bot.recoveryAttempts;

        if (attempt === ATTEMPT_CONNECT) {
            await this.tryConnect(bot);
            return;
        }

        if (attempt === ATTEMPT_RESTART) {
            await this.tryRestart(bot);
            return;
        }

        if (attempt === ATTEMPT_NOTIFY) {
            await this.notifyUser(bot);
            return;
        }

        if (
            bot.lastRecoveryAt &&
            Date.now() - bot.lastRecoveryAt.getTime() >= NOTIFY_COOLDOWN_MS
        ) {
            await this.botRepo.update(bot.id, { recoveryAttempts: 0 });
        }
    }

    private async fetchState(bot: Bot): Promise<string | null> {
        try {
            const res = await evolutionApi.getConnectionState(
                bot.evolutionInstanceName,
            );
            return (res.instance?.state ?? "").toLowerCase();
        } catch (err) {
            console.warn(
                `BotMonitor: connectionState failed for ${bot.evolutionInstanceName}:`,
                err,
            );
            return null;
        }
    }

    private async tryConnect(bot: Bot): Promise<void> {
        console.log(
            `BotMonitor: trying connect on ${bot.evolutionInstanceName}`,
        );
        const next: Parameters<BotRepository["update"]>[1] = {
            recoveryAttempts: ATTEMPT_CONNECT + 1,
            lastRecoveryAt: new Date(),
            status: this.mapToStatus(bot.status, "CONNECTING"),
        };
        try {
            await evolutionApi.connectInstance(bot.evolutionInstanceName);
        } catch (err) {
            console.warn(
                `BotMonitor: connect failed for ${bot.evolutionInstanceName}:`,
                err,
            );
        }
        await this.botRepo.update(bot.id, next);
    }

    private async tryRestart(bot: Bot): Promise<void> {
        console.log(
            `BotMonitor: trying restart on ${bot.evolutionInstanceName}`,
        );
        const next: Parameters<BotRepository["update"]>[1] = {
            recoveryAttempts: ATTEMPT_RESTART + 1,
            lastRecoveryAt: new Date(),
            status: this.mapToStatus(bot.status, "CONNECTING"),
        };
        try {
            await evolutionApi.restartInstance(bot.evolutionInstanceName);
        } catch (err) {
            console.warn(
                `BotMonitor: restart failed for ${bot.evolutionInstanceName}:`,
                err,
            );
        }
        await this.botRepo.update(bot.id, next);
    }

    private async notifyUser(bot: Bot): Promise<void> {
        const alreadyNotified =
            bot.lastDisconnectNotifiedAt &&
            (!bot.lastConnectedAt ||
                bot.lastDisconnectNotifiedAt.getTime() >
                bot.lastConnectedAt.getTime());

        await this.botRepo.update(bot.id, {
            status: "ERROR",
            recoveryAttempts: ATTEMPT_NOTIFY + 1,
            lastRecoveryAt: new Date(),
            lastDisconnectNotifiedAt: alreadyNotified
                ? bot.lastDisconnectNotifiedAt
                : new Date(),
        });

        if (alreadyNotified) return;

        await this.notifier.emit({
            organizationId: bot.organizationId,
            type: "BOT_OFFLINE",
            title: `Bot ${bot.name} precisa ser reconectado`,
            body: "Tentamos religar automaticamente, mas não conseguimos. Abra Bots e escaneie o QR.",
            link: "/bots",
            requirePreference: "botDisconnects",
        });
    }

    private mapToStatus(current: BotStatus, fallback: BotStatus): BotStatus {
        if (current === "ERROR") return current;
        return fallback;
    }
}

export const BOT_MONITOR_TICK_MS = TICK_INTERVAL_MS;
export const BOT_LIVE_STATE_MAP = STATE_MAP;
