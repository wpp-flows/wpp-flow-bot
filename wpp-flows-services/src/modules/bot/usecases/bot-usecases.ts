import { NotFoundError } from "@/shared/exceptions/http";
import type { Bot, BotRepository } from "../repositories/bot-repo";

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
        // Cloud API: we just drop our row. We deliberately don't unsubscribe the
        // client's WABA here — the number belongs to the restaurant and may be
        // reconnected; abandoning our subscription is harmless.
        await this.repo.delete(input.id);
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
