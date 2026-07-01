import { env } from "@/infrastructure/config/env";
import { evolutionApi, extractQrCode } from "@/infrastructure/evolution/client";
import { HttpError, NotFoundError } from "@/shared/exceptions/http";
import type { Bot, BotRepository } from "../repositories/bot-repo";

const buildInstanceName = (organizationId: string) =>
    `org-${organizationId.slice(0, 8)}-${Date.now().toString(36)}`;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const buildWebhookUrl = (botInstanceName: string) => {
    if (!env.EVOLUTION_WEBHOOK_URL) return undefined;
    const base = env.EVOLUTION_WEBHOOK_URL.replace(/\/$/, "");
    return `${base}/api/webhooks/evolution/${encodeURIComponent(botInstanceName)}`;
};

export class ListBotsUseCase {
    constructor(private readonly repo: BotRepository) { }
    execute(organizationId: string): Promise<Bot[]> {
        return this.repo.listByOrg(organizationId);
    }
}

export class GetBotUseCase {
    constructor(private readonly repo: BotRepository) { }
    async execute(input: { organizationId: string; id: string }): Promise<Bot> {
        const bot = await this.repo.findByIdInOrg(input.organizationId, input.id);
        if (!bot) throw new NotFoundError("Bot");
        return bot;
    }
}

export class CreateBotUseCase {
    constructor(private readonly repo: BotRepository) { }
    async execute(input: {
        organizationId: string;
        name: string;
        phoneNumber?: string;
        webhookUrl?: string;
        flowId?: string;
    }): Promise<Bot> {
        const evolutionInstanceName = buildInstanceName(input.organizationId);
        const webhookUrl = input.webhookUrl ?? buildWebhookUrl(evolutionInstanceName);

        const bot = await this.repo.create({
            organizationId: input.organizationId,
            name: input.name,
            evolutionInstanceName,
            phoneNumber: input.phoneNumber,
            webhookUrl,
            flowId: input.flowId ?? null,
        });

        try {
            const evolution = await evolutionApi.createInstance({
                instanceName: evolutionInstanceName,
                webhookUrl,
            });
            const qrCode = extractQrCode(evolution);
            return this.repo.update(bot.id, { qrCode, status: "CONNECTING" });
        } catch (err) {
            await this.repo.update(bot.id, { status: "ERROR" });
            throw err;
        }
    }
}

export class UpdateBotUseCase {
    constructor(private readonly repo: BotRepository) { }
    async execute(input: {
        organizationId: string;
        id: string;
        name?: string;
        phoneNumber?: string | null;
        webhookUrl?: string | null;
        flowId?: string | null;
    }): Promise<Bot> {
        const bot = await this.repo.findByIdInOrg(input.organizationId, input.id);
        if (!bot) throw new NotFoundError("Bot");
        return this.repo.update(input.id, {
            name: input.name,
            phoneNumber: input.phoneNumber,
            webhookUrl: input.webhookUrl,
            flowId: input.flowId,
        });
    }
}

export class DeleteBotUseCase {
    constructor(private readonly repo: BotRepository) { }
    async execute(input: { organizationId: string; id: string }): Promise<void> {
        const bot = await this.repo.findByIdInOrg(input.organizationId, input.id);
        if (!bot) throw new NotFoundError("Bot");

        try {
            await evolutionApi.logoutInstance(bot.evolutionInstanceName);
        } catch (err) {
            console.warn("Evolution logoutInstance failed:", err);
        }

        try {
            await evolutionApi.deleteInstance(bot.evolutionInstanceName);
        } catch (err) {
            console.warn("Evolution deleteInstance failed:", err);
        }

        await this.repo.delete(input.id);
    }
}

export class ConnectBotUseCase {
    constructor(private readonly repo: BotRepository) { }
    async execute(input: { organizationId: string; id: string }): Promise<Bot> {
        const bot = await this.repo.findByIdInOrg(input.organizationId, input.id);
        if (!bot) throw new NotFoundError("Bot");

        const evolution = await evolutionApi.connectInstance(
            bot.evolutionInstanceName
        );

        const qrCode = extractQrCode(evolution);

        if (!qrCode && !bot.qrCode) {
            throw new HttpError(
                "Evolution didn't return a QR code. Please try again in a few seconds.",
                503
            );
        }

        const patch: Parameters<BotRepository["update"]>[1] = {
            status: "CONNECTING",
            desiredState: "CONNECTED",
            recoveryAttempts: 0,
            lastRecoveryAt: null,
            lastDisconnectNotifiedAt: null,
        };
        if (qrCode) patch.qrCode = qrCode;

        return this.repo.update(bot.id, patch);
    }
}

/**
 * Hard reconnect for a wedged instance. Unlike {@link ConnectBotUseCase} — which
 * reuses whatever session Evolution is holding — this first LOGS OUT to wipe the
 * stored credentials, then connects for a genuinely fresh QR.
 *
 * The motivating case: WhatsApp removes the linked device (disconnection tag
 * `conflict` / `device_removed`, 401). The creds Evolution kept are now dead,
 * but a plain `/instance/connect` regenerates a QR bound to that dead state, so
 * the phone keeps rejecting the scan with "Couldn't connect". Logging out clears
 * the creds so the next pairing starts clean.
 *
 * We deliberately do NOT fall back to the cached `bot.qrCode` here (that stale
 * code is exactly what's failing) — if Evolution doesn't return a fresh QR we
 * surface a 503 so the operator retries.
 */
export class ForceReconnectBotUseCase {
    constructor(private readonly repo: BotRepository) { }
    async execute(input: { organizationId: string; id: string }): Promise<Bot> {
        const bot = await this.repo.findByIdInOrg(input.organizationId, input.id);
        if (!bot) throw new NotFoundError("Bot");

        // Kill the dead session. Tolerate failure — after device_removed the
        // logout itself often 401s, which is fine; the goal is just to drop
        // whatever creds Evolution is clinging to.
        try {
            await evolutionApi.logoutInstance(bot.evolutionInstanceName);
        } catch (err) {
            console.warn("ForceReconnect: logoutInstance failed (continuing):", err);
        }

        // Evolution needs a beat to tear the old socket down before it will
        // emit a clean QR — connecting instantly tends to hand back the stale one.
        await delay(1500);

        let evolution: Awaited<ReturnType<typeof evolutionApi.connectInstance>>;
        try {
            evolution = await evolutionApi.connectInstance(bot.evolutionInstanceName);
        } catch (err) {
            await this.repo.update(bot.id, { status: "ERROR" });
            throw err;
        }

        const qrCode = extractQrCode(evolution);
        if (!qrCode) {
            throw new HttpError(
                "Sessão reiniciada, mas o Evolution ainda não gerou um novo QR. Tente novamente em alguns segundos.",
                503,
            );
        }

        return this.repo.update(bot.id, {
            qrCode,
            status: "CONNECTING",
            desiredState: "CONNECTED",
            recoveryAttempts: 0,
            lastRecoveryAt: null,
            lastDisconnectNotifiedAt: null,
        });
    }
}

export class DisconnectBotUseCase {
    constructor(private readonly repo: BotRepository) { }
    async execute(input: { organizationId: string; id: string }): Promise<Bot> {
        const bot = await this.repo.findByIdInOrg(input.organizationId, input.id);
        if (!bot) throw new NotFoundError("Bot");

        try {
            await evolutionApi.logoutInstance(bot.evolutionInstanceName);
        } catch (err) {
            console.warn("Evolution logoutInstance failed:", err);
        }

        return this.repo.update(bot.id, {
            status: "OFFLINE",
            desiredState: "DISCONNECTED",
            qrCode: null,
            recoveryAttempts: 0,
            lastRecoveryAt: null,
            lastDisconnectNotifiedAt: null,
        });
    }
}

export class GetBotConnectionStateUseCase {
    constructor(private readonly repo: BotRepository) { }
    async execute(input: {
        organizationId: string;
        id: string;
    }): Promise<{ bot: Bot; evolutionState: string | null }> {
        const bot = await this.repo.findByIdInOrg(input.organizationId, input.id);
        if (!bot) throw new NotFoundError("Bot");

        try {
            const state = await evolutionApi.getConnectionState(
                bot.evolutionInstanceName
            );
            return { bot, evolutionState: state.instance.state };
        } catch (err) {
            console.warn("Evolution getConnectionState failed:", err);
            return { bot, evolutionState: null };
        }
    }
}

export class SetBotIsActiveUseCase {
    constructor(private readonly repo: BotRepository) { }
    async execute(input: {
        organizationId: string;
        id: string;
        isActive: boolean;
    }): Promise<Bot> {
        const bot = await this.repo.findByIdInOrg(input.organizationId, input.id);
        if (!bot) throw new NotFoundError("Bot");
        return this.repo.update(input.id, { isActive: input.isActive });
    }
}
